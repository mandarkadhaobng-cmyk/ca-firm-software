const db = require('../config/database');
const { success, created, notFound, badRequest } = require('../utils/response');

// Helper: compute ISO week boundaries (Mon–Sun)
function getWeekBounds(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday offset
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    weekStart: mon.toISOString().split('T')[0],
    weekEnd:   sun.toISOString().split('T')[0],
  };
}

// ── List reports ──────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  const { userId, fromWeek, toWeek, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const user = req.user;

  const conditions = [`wr.firm_id = $1`];
  const params = [user.firm_id];
  let i = 2;

  if (['employee', 'article'].includes(user.role)) {
    conditions.push(`wr.user_id = $${i++}`);
    params.push(user.id);
  } else if (userId) {
    conditions.push(`wr.user_id = $${i++}`);
    params.push(userId);
  }

  if (fromWeek) { conditions.push(`wr.week_start >= $${i++}`); params.push(fromWeek); }
  if (toWeek)   { conditions.push(`wr.week_start <= $${i++}`); params.push(toWeek); }
  if (status)   { conditions.push(`wr.status = $${i++}`);      params.push(status); }

  const where = conditions.join(' AND ');

  try {
    const { rows } = await db.query(
      `SELECT wr.id, wr.week_start, wr.week_end, wr.status, wr.total_hours,
              wr.submitted_at, wr.reviewed_at, wr.reviewer_remarks,
              u.id AS user_id, u.first_name, u.last_name,
              rv.first_name AS reviewer_first, rv.last_name AS reviewer_last
       FROM weekly_reports wr
       JOIN users u ON u.id = wr.user_id
       LEFT JOIN users rv ON rv.id = wr.reviewed_by
       WHERE ${where}
       ORDER BY wr.week_start DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total FROM weekly_reports wr WHERE ${where}`,
      params
    );

    success(res, { data: rows, total: parseInt(countRows[0].total), page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    if (e.message?.includes('does not exist')) return success(res, { data: [], total: 0 });
    throw e;
  }
};

// ── Get single report ─────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  const { rows } = await db.query(
    `SELECT wr.*, u.first_name, u.last_name,
            rv.first_name AS reviewer_first, rv.last_name AS reviewer_last
     FROM weekly_reports wr
     JOIN users u ON u.id = wr.user_id
     LEFT JOIN users rv ON rv.id = wr.reviewed_by
     WHERE wr.id = $1 AND wr.firm_id = $2`,
    [req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Get current week draft (or empty template) ────────────────────────────────
exports.getCurrent = async (req, res) => {
  const { weekStart } = req.query;
  const bounds = getWeekBounds(weekStart);
  const { rows } = await db.query(
    `SELECT wr.*, u.first_name, u.last_name
     FROM weekly_reports wr
     JOIN users u ON u.id = wr.user_id
     WHERE wr.user_id = $1 AND wr.firm_id = $2 AND wr.week_start = $3`,
    [req.user.id, req.user.firm_id, bounds.weekStart]
  ).catch(() => ({ rows: [] }));

  success(res, rows[0] || { ...bounds, status: 'draft', userId: req.user.id });
};

// ── Create or upsert report ───────────────────────────────────────────────────
exports.upsert = async (req, res) => {
  const { weekStart, completedWork, pendingWork, blockers, nextWeekPlan, otherWork, totalHours, submit } = req.body;
  if (!weekStart) return badRequest(res, 'weekStart is required');

  const bounds = getWeekBounds(weekStart);
  const status = submit ? 'submitted' : 'draft';
  const submittedAt = submit ? 'NOW()' : null;

  const { rows } = await db.query(
    `INSERT INTO weekly_reports
       (firm_id, user_id, week_start, week_end, completed_work, pending_work,
        blockers, next_week_plan, other_work, total_hours, status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,${submit ? 'NOW()' : 'NULL'})
     ON CONFLICT (firm_id, user_id, week_start)
     DO UPDATE SET
       week_end       = EXCLUDED.week_end,
       completed_work = EXCLUDED.completed_work,
       pending_work   = EXCLUDED.pending_work,
       blockers       = EXCLUDED.blockers,
       next_week_plan = EXCLUDED.next_week_plan,
       other_work     = EXCLUDED.other_work,
       total_hours    = EXCLUDED.total_hours,
       status         = EXCLUDED.status,
       submitted_at   = CASE WHEN EXCLUDED.status='submitted' AND weekly_reports.submitted_at IS NULL
                              THEN NOW() ELSE weekly_reports.submitted_at END,
       updated_at     = NOW()
     RETURNING *`,
    [req.user.firm_id, req.user.id, bounds.weekStart, bounds.weekEnd,
     completedWork || null, pendingWork || null, blockers || null,
     nextWeekPlan || null, otherWork || null,
     totalHours ? parseFloat(totalHours) : null, status]
  );
  created(res, rows[0]);
};

// ── Review a report (admin/partner/hr) ───────────────────────────────────────
exports.review = async (req, res) => {
  const { reviewerRemarks } = req.body;
  const { rows } = await db.query(
    `UPDATE weekly_reports SET
       status = 'reviewed', reviewed_by = $1, reviewed_at = NOW(),
       reviewer_remarks = $2, updated_at = NOW()
     WHERE id = $3 AND firm_id = $4
     RETURNING *`,
    [req.user.id, reviewerRemarks || null, req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Delete report (draft only or admin) ──────────────────────────────────────
exports.remove = async (req, res) => {
  const user = req.user;
  const isAdmin = ['super_admin', 'partner'].includes(user.role);
  const clause = isAdmin
    ? `id = $1 AND firm_id = $2`
    : `id = $1 AND firm_id = $2 AND user_id = $3 AND status = 'draft'`;
  const params = isAdmin ? [req.params.id, user.firm_id] : [req.params.id, user.firm_id, user.id];

  const { rows } = await db.query(`DELETE FROM weekly_reports WHERE ${clause} RETURNING id`, params);
  if (!rows.length) return notFound(res);
  success(res, null, 'Report deleted');
};
