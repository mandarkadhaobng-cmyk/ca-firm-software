const db = require('../config/database');
const { success, created, notFound, badRequest } = require('../utils/response');

// ── List logs (admin/partner/hr see all; employee sees own) ───────────────────
exports.getAll = async (req, res) => {
  const { assignmentId, userId, fromDate, toDate, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const user = req.user;

  const conditions = [`dl.firm_id = $1`];
  const params = [user.firm_id];
  let i = 2;

  // Employees can only see their own logs
  if (['employee', 'article', 'manager'].includes(user.role)) {
    conditions.push(`dl.user_id = $${i++}`);
    params.push(user.id);
  } else if (userId) {
    // Admin/partner can filter by specific user
    conditions.push(`dl.user_id = $${i++}`);
    params.push(userId);
  }

  if (assignmentId) { conditions.push(`dl.assignment_id = $${i++}`); params.push(assignmentId); }
  if (fromDate)     { conditions.push(`dl.log_date >= $${i++}`);      params.push(fromDate); }
  if (toDate)       { conditions.push(`dl.log_date <= $${i++}`);      params.push(toDate); }

  const where = conditions.join(' AND ');

  try {
    const { rows } = await db.query(
      `SELECT dl.id, dl.log_date, dl.hours_worked, dl.work_done, dl.blockers,
              dl.status, dl.created_at,
              u.id AS user_id, u.first_name, u.last_name,
              a.id AS assignment_id, a.title AS assignment_title,
              rv.first_name AS reviewer_first, rv.last_name AS reviewer_last,
              dl.reviewed_at, dl.reviewer_remarks
       FROM daily_logs dl
       JOIN users u ON u.id = dl.user_id
       LEFT JOIN assignments a ON a.id = dl.assignment_id
       LEFT JOIN users rv ON rv.id = dl.reviewed_by
       WHERE ${where}
       ORDER BY dl.log_date DESC, dl.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total FROM daily_logs dl WHERE ${where}`,
      params
    );

    success(res, { data: rows, total: parseInt(countRows[0].total), page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    if (e.message?.includes('does not exist')) return success(res, { data: [], total: 0 });
    throw e;
  }
};

// ── Get single log ─────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  const { rows } = await db.query(
    `SELECT dl.*, u.first_name, u.last_name, a.title AS assignment_title
     FROM daily_logs dl
     JOIN users u ON u.id = dl.user_id
     LEFT JOIN assignments a ON a.id = dl.assignment_id
     WHERE dl.id = $1 AND dl.firm_id = $2`,
    [req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Create log ────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { assignmentId, logDate, hoursWorked, workDone, blockers } = req.body;
  if (!workDone) return badRequest(res, 'Work done description is required');

  const { rows } = await db.query(
    `INSERT INTO daily_logs (firm_id, user_id, assignment_id, log_date, hours_worked, work_done, blockers, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted')
     RETURNING *`,
    [req.user.firm_id, req.user.id, assignmentId || null,
     logDate || new Date().toISOString().split('T')[0],
     parseFloat(hoursWorked) || 0, workDone, blockers || null]
  );
  created(res, rows[0]);
};

// ── Update log (owner only, or admin) ────────────────────────────────────────
exports.update = async (req, res) => {
  const user = req.user;
  const { assignmentId, logDate, hoursWorked, workDone, blockers } = req.body;

  // Employees can only edit their own logs
  const isPrivileged = ['super_admin', 'partner', 'hr'].includes(user.role);
  const ownerClause = isPrivileged
    ? `firm_id = $2`
    : `user_id = $3 AND firm_id = $2`;
  const ownerParams = isPrivileged
    ? [req.params.id, user.firm_id]
    : [req.params.id, user.firm_id, user.id];

  const { rows } = await db.query(
    `UPDATE daily_logs SET
       assignment_id = $${ownerParams.length + 1},
       log_date      = $${ownerParams.length + 2},
       hours_worked  = $${ownerParams.length + 3},
       work_done     = $${ownerParams.length + 4},
       blockers      = $${ownerParams.length + 5},
       updated_at    = NOW()
     WHERE id = $1 AND ${ownerClause}
     RETURNING *`,
    [...ownerParams, assignmentId || null,
     logDate || new Date().toISOString().split('T')[0],
     parseFloat(hoursWorked) || 0, workDone, blockers || null]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Review a log (admin/partner/hr) ──────────────────────────────────────────
exports.review = async (req, res) => {
  const { status, reviewerRemarks } = req.body;
  if (!['submitted', 'reviewed'].includes(status)) return badRequest(res, 'Invalid status');

  const { rows } = await db.query(
    `UPDATE daily_logs SET
       status = $1, reviewed_by = $2, reviewed_at = NOW(),
       reviewer_remarks = $3, updated_at = NOW()
     WHERE id = $4 AND firm_id = $5
     RETURNING *`,
    [status, req.user.id, reviewerRemarks || null, req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Delete log ────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  const user = req.user;
  const ownerClause = ['super_admin', 'partner'].includes(user.role)
    ? `firm_id = $2` : `user_id = $3 AND firm_id = $2`;
  const params = ['super_admin', 'partner'].includes(user.role)
    ? [req.params.id, user.firm_id]
    : [req.params.id, user.firm_id, user.id];

  const { rows } = await db.query(
    `DELETE FROM daily_logs WHERE id = $1 AND ${ownerClause} RETURNING id`,
    params
  );
  if (!rows.length) return notFound(res);
  success(res, null, 'Log deleted');
};
