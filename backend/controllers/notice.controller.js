const db = require('../config/database');
const { dispatch } = require('../notifications/notification.engine');
const { success, created, notFound } = require('../utils/response');

exports.getAll = async (req, res) => {
  const { rows } = await db.query(
    `SELECT n.*, u.first_name, u.last_name
     FROM notices n LEFT JOIN users u ON u.id=n.created_by
     WHERE n.firm_id=$1 AND (n.expires_at IS NULL OR n.expires_at > NOW())
     ORDER BY n.is_pinned DESC, n.created_at DESC`,
    [req.user.firm_id]
  );
  success(res, rows);
};

exports.create = async (req, res) => {
  const { title, content, category, branchId, departmentId, priority, expiresAt, isPinned, imageUrl } = req.body;
  const { rows } = await db.query(
    `INSERT INTO notices (firm_id, title, content, category, branch_id, department_id,
                          priority, expires_at, is_pinned, image_url, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.user.firm_id, title, content, category || 'general', branchId || null,
     departmentId || null, priority || 'normal', expiresAt || null, isPinned || false,
     imageUrl || null, req.user.id]
  );

  // Notify relevant employees
  let empQuery = `SELECT id FROM users WHERE firm_id=$1 AND status='active'`;
  const params = [req.user.firm_id];
  if (branchId)     { empQuery += ` AND branch_id=$2`;     params.push(branchId); }
  if (departmentId) { empQuery += ` AND department_id=$${params.length+1}`; params.push(departmentId); }

  const { rows: emps } = await db.query(empQuery, params);
  dispatch({
    firmId: req.user.firm_id, recipientIds: emps.map(e => e.id),
    type: 'notice_published', title: `Notice: ${title}`,
    message: content.slice(0, 120) + (content.length > 120 ? '...' : ''),
    link: '/notices',
  });
  created(res, rows[0], 'Notice published');
};

exports.update = async (req, res) => {
  const { title, content, category, priority, expiresAt, isPinned, imageUrl } = req.body;
  const { rows } = await db.query(
    `UPDATE notices SET title=$1, content=$2, category=$3, priority=$4,
                        expires_at=$5, is_pinned=$6, image_url=$7, updated_at=NOW()
     WHERE id=$8 AND firm_id=$9 RETURNING *`,
    [title, content, category, priority, expiresAt, isPinned,
     imageUrl !== undefined ? imageUrl : null,
     req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0], 'Notice updated');
};

exports.delete = async (req, res) => {
  await db.query(`DELETE FROM notices WHERE id=$1 AND firm_id=$2`, [req.params.id, req.user.firm_id]);
  success(res, null, 'Notice deleted');
};
