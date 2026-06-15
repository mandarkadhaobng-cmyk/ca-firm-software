const db = require('../config/database');
const { paginate } = require('../utils/pagination');

const timesheetService = {
  async getAll({ firmId, userId, role, fromDate, toDate, status, clientId, page, pageSize }) {
    const { limit, offset } = paginate({ page, pageSize });
    let where = [`t.firm_id=$1`], params = [firmId], i = 2;

    // Employees see only their own; managers see their team; partners/admins see all
    if (role === 'employee') { where.push(`t.user_id=$${i}`); params.push(userId); i++; }
    else if (role === 'manager') { where.push(`(t.user_id=$${i} OR mgr.reporting_manager_id=$${i})`); params.push(userId); i++; }

    if (fromDate) { where.push(`t.date>=$${i}`); params.push(fromDate); i++; }
    if (toDate)   { where.push(`t.date<=$${i}`); params.push(toDate);   i++; }
    if (status)   { where.push(`t.status=$${i}`); params.push(status);  i++; }
    if (clientId) { where.push(`t.client_id=$${i}`); params.push(clientId); i++; }

    const whereStr = where.join(' AND ');

    const { rows: data } = await db.query(
      `SELECT t.*, 
              u.first_name, u.last_name,
              c.client_name, c.client_code,
              a.title as assignment_title
       FROM timesheets t
       LEFT JOIN users u ON u.id=t.user_id
       LEFT JOIN users mgr ON mgr.id=t.user_id
       LEFT JOIN clients c ON c.id=t.client_id
       LEFT JOIN assignments a ON a.id=t.assignment_id
       WHERE ${whereStr}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    const { rows:[{total}] } = await db.query(
      `SELECT COUNT(*) as total FROM timesheets t
       LEFT JOIN users mgr ON mgr.id=t.user_id
       WHERE ${whereStr}`, params
    );

    return { data, total: parseInt(total) };
  },

  async create(data) {
    // Validate daily hours won't exceed 24
    const { rows: [dayTotal] } = await db.query(
      `SELECT COALESCE(SUM(hours_worked),0) as total FROM timesheets
       WHERE user_id=$1 AND date=$2 AND status!='rejected'`,
      [data.userId, data.date]
    );
    if (parseFloat(dayTotal.total) + parseFloat(data.hoursWorked) > 24)
      throw Object.assign(new Error('Daily hours cannot exceed 24'), { statusCode: 400 });

    const { rows } = await db.query(
      `INSERT INTO timesheets
         (firm_id, user_id, client_id, assignment_id, date, hours_worked, billable_hours,
          is_billable, description, status, work_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) RETURNING id`,
      [data.firmId, data.userId, data.clientId, data.assignmentId, data.date,
       data.hoursWorked, data.billableHours || data.hoursWorked,
       data.isBillable !== false, data.description, data.workType || 'billable']
    );
    return rows[0];
  },

  async bulkSubmit(ids, userId, firmId) {
    await db.query(
      `UPDATE timesheets SET status='submitted', submitted_at=NOW(), updated_at=NOW()
       WHERE id=ANY($1::uuid[]) AND user_id=$2 AND firm_id=$3 AND status='draft'`,
      [ids, userId, firmId]
    );
  },

  async approve(id, approverId, approverRole, comment, firmId) {
    const newStatus = approverRole === 'partner' ? 'final_approved' : 'approved';
    await db.query(
      `UPDATE timesheets SET status=$1, updated_at=NOW() WHERE id=$2 AND firm_id=$3`,
      [newStatus, id, firmId]
    );
    await db.query(
      `INSERT INTO approvals (timesheet_id, approver_id, firm_id, action, comment, role_at_time)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, approverId, firmId, 'approve', comment, approverRole]
    );
  },

  async reject(id, approverId, approverRole, comment, firmId) {
    await db.query(
      `UPDATE timesheets SET status='rejected', updated_at=NOW() WHERE id=$1 AND firm_id=$2`,
      [id, firmId]
    );
    await db.query(
      `INSERT INTO approvals (timesheet_id, approver_id, firm_id, action, comment, role_at_time)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, approverId, firmId, 'reject', comment, approverRole]
    );
  },

  async getDailyHours(userId, date) {
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(hours_worked),0) as total FROM timesheets
       WHERE user_id=$1 AND date=$2 AND status!='rejected'`,
      [userId, date]
    );
    return parseFloat(rows[0].total);
  },

  async getPendingCount(firmId, managerId, role) {
    let where = `t.firm_id=$1 AND t.status='submitted'`, params = [firmId];
    if (role === 'manager') { where += ` AND u.reporting_manager_id=$2`; params.push(managerId); }
    const { rows } = await db.query(
      `SELECT COUNT(*) as total FROM timesheets t
       LEFT JOIN users u ON u.id=t.user_id WHERE ${where}`, params
    );
    return parseInt(rows[0].total);
  },
};

module.exports = timesheetService;
