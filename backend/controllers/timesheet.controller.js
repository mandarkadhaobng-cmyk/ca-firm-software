const timesheetService = require('../services/timesheet.service');
const { dispatch }     = require('../notifications/notification.engine');
const db               = require('../config/database');
const { success, created, paginated, badRequest } = require('../utils/response');

/** Convert empty string / undefined → null for UUID fields */
const uuid = v => (v && v !== '' ? v : null);

/**
 * Normalize incoming timesheet body: accept both snake_case (React form)
 * and camelCase. The form sends: hours_worked, client_id, assignment_id,
 * task_description, is_billable. The service expects camelCase equivalents.
 */
const normalizeBody = (body) => ({
  date:           body.date            ?? null,
  clientId:       uuid(body.clientId   ?? body.client_id),
  assignmentId:   uuid(body.assignmentId ?? body.assignment_id),
  hoursWorked:    parseFloat(body.hoursWorked ?? body.hours_worked) || null,
  isBillable:     body.isBillable      ?? body.is_billable        ?? true,
  description:    body.description     ?? body.task_description   ?? null,
  remarks:        body.remarks         ?? null,
  workType:       body.workType        ?? body.work_type          ?? 'billable',
});

exports.getAll = async (req, res) => {
  const { fromDate, toDate, status, clientId, page = 1, pageSize = 15 } = req.query;
  const { data, total } = await timesheetService.getAll({
    firmId: req.user.firm_id, userId: req.user.id, role: req.user.role,
    fromDate, toDate, status, clientId, page, pageSize,
  });
  paginated(res, data, total, page, pageSize);
};

exports.create = async (req, res) => {
  const normalized = normalizeBody(req.body);
  if (!normalized.hoursWorked) return badRequest(res, 'Hours worked is required');
  if (!normalized.date)        return badRequest(res, 'Date is required');
  const entry = await timesheetService.create({
    ...normalized,
    userId: req.user.id,
    firmId: req.user.firm_id,
  });
  created(res, entry, 'Timesheet entry saved');
};

exports.bulkSubmit = async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return badRequest(res, 'No timesheet IDs provided');
  await timesheetService.bulkSubmit(ids, req.user.id, req.user.firm_id);
  const { rows: [mgr] } = await db.query(
    `SELECT reporting_manager_id FROM users WHERE id=$1`, [req.user.id]
  );
  if (mgr?.reporting_manager_id) {
    dispatch({
      firmId: req.user.firm_id,
      recipientIds: [mgr.reporting_manager_id],
      type: 'timesheet_submitted',
      title: 'Timesheets Submitted',
      message: `${ids.length} timesheet(s) are pending your approval`,
      link: '/approvals',
    });
  }
  success(res, null, `${ids.length} timesheet(s) submitted for approval`);
};

// ── Approvals ─────────────────────────────────────────────────────────────────

exports.getApprovals = async (req, res) => {
  const { status = 'submitted', page = 1, pageSize = 15 } = req.query;
  const firmId = req.user.firm_id;
  const role   = req.user.role;
  const userId = req.user.id;

  let where  = [`t.firm_id=$1`], params = [firmId], i = 2;

  if (status) { where.push(`t.status=$${i}`); params.push(status); i++; }

  // Managers see only their team's timesheets
  if (role === 'manager') {
    where.push(`u.reporting_manager_id=$${i}`);
    params.push(userId); i++;
  }

  const whereStr = where.join(' AND ');
  const limit  = parseInt(pageSize);
  const offset = (parseInt(page) - 1) * limit;

  const { rows: data } = await db.query(
    `SELECT t.*,
            u.first_name, u.last_name, u.employee_id, u.designation,
            c.client_name, c.client_code,
            a.title AS assignment_title
     FROM timesheets t
     LEFT JOIN users       u ON u.id = t.user_id
     LEFT JOIN clients     c ON c.id = t.client_id
     LEFT JOIN assignments a ON a.id = t.assignment_id
     WHERE ${whereStr}
     ORDER BY t.submitted_at DESC, t.created_at DESC
     LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );

  const { rows: [{ total }] } = await db.query(
    `SELECT COUNT(*) AS total
     FROM timesheets t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE ${whereStr}`, params
  );

  paginated(res, data, parseInt(total), page, pageSize);
};

exports.approve = async (req, res) => {
  const id = req.params.id;
  const { comment, comments } = req.body;
  const note = comment || comments || '';
  await timesheetService.approve(id, req.user.id, req.user.role, note, req.user.firm_id);
  const { rows: [entry] } = await db.query(`SELECT user_id FROM timesheets WHERE id=$1`, [id]);
  if (entry) {
    dispatch({
      firmId: req.user.firm_id, recipientIds: [entry.user_id],
      type: 'timesheet_approved', title: 'Timesheet Approved',
      message: 'Your timesheet has been approved', link: '/timesheets',
    });
  }
  success(res, null, 'Timesheet approved');
};

exports.reject = async (req, res) => {
  const id = req.params.id;
  const { comment, comments } = req.body;
  const note = comment || comments || '';
  await timesheetService.reject(id, req.user.id, req.user.role, note, req.user.firm_id);
  const { rows: [entry] } = await db.query(`SELECT user_id FROM timesheets WHERE id=$1`, [id]);
  if (entry) {
    dispatch({
      firmId: req.user.firm_id, recipientIds: [entry.user_id],
      type: 'timesheet_rejected', title: 'Timesheet Rejected',
      message: `Your timesheet has been rejected${note ? ': ' + note : ''}`,
      link: '/timesheets',
    });
  }
  success(res, null, 'Timesheet rejected');
};

exports.sendBack = async (req, res) => {
  const { comment, comments } = req.body;
  const note = comment || comments || '';
  await db.query(
    `UPDATE timesheets SET status='draft', updated_at=NOW() WHERE id=$1 AND firm_id=$2`,
    [req.params.id, req.user.firm_id]
  );
  await db.query(
    `INSERT INTO approvals (timesheet_id, approver_id, firm_id, action, comment, role_at_time)
     VALUES ($1,$2,$3,'send_back',$4,$5)`,
    [req.params.id, req.user.id, req.user.firm_id, note, req.user.role]
  );
  success(res, null, 'Timesheet sent back for revision');
};

exports.finalApprove = async (req, res) => {
  const { comment, comments } = req.body;
  const note = comment || comments || '';
  await db.query(
    `UPDATE timesheets SET status='final_approved', updated_at=NOW() WHERE id=$1 AND firm_id=$2`,
    [req.params.id, req.user.firm_id]
  );
  await db.query(
    `INSERT INTO approvals (timesheet_id, approver_id, firm_id, action, comment, role_at_time)
     VALUES ($1,$2,$3,'final_approve',$4,$5)`,
    [req.params.id, req.user.id, req.user.firm_id, note, req.user.role]
  );
  success(res, null, 'Timesheet final approved');
};

exports.bulkApproval = async (req, res) => {
  const { ids, action, comments } = req.body;
  if (!ids?.length) return badRequest(res, 'No IDs provided');
  if (!['approve', 'reject'].includes(action)) return badRequest(res, 'Invalid action');

  for (const id of ids) {
    if (action === 'approve') {
      await timesheetService.approve(id, req.user.id, req.user.role, comments || '', req.user.firm_id);
    } else {
      await timesheetService.reject(id, req.user.id, req.user.role, comments || '', req.user.firm_id);
    }
  }
  success(res, null, `${ids.length} timesheet(s) ${action}d`);
};

exports.delete = async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM timesheets WHERE id=$1 AND firm_id=$2 AND status='draft' RETURNING id`,
    [req.params.id, req.user.firm_id]
  );
  if (!rows[0]) return badRequest(res, 'Only draft timesheets can be deleted');
  success(res, null, 'Timesheet deleted');
};

exports.getDailyHours = async (req, res) => {
  const { date } = req.query;
  const total = await timesheetService.getDailyHours(
    req.user.id, date || new Date().toISOString().split('T')[0]
  );
  success(res, { total });
};

exports.getPendingCount = async (req, res) => {
  const count = await timesheetService.getPendingCount(
    req.user.firm_id, req.user.id, req.user.role
  );
  success(res, { count });
};
