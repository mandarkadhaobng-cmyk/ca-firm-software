const db = require('../config/database');
const { dispatch } = require('../notifications/notification.engine');
const { success, created, paginated, notFound } = require('../utils/response');

exports.getAll = async (req, res) => {
  const { year, branchId } = req.query;
  let where = [`firm_id=$1`], params = [req.user.firm_id], i = 2;
  if (year)     { where.push(`EXTRACT(YEAR FROM date)=$${i}`); params.push(year); i++; }
  if (branchId) { where.push(`(branch_id=$${i} OR branch_id IS NULL)`); params.push(branchId); i++; }

  const { rows } = await db.query(
    `SELECT * FROM holidays WHERE ${where.join(' AND ')} ORDER BY date`,
    params
  );
  success(res, rows);
};

exports.create = async (req, res) => {
  const { name, date, type, branchId, description } = req.body;
  const { rows } = await db.query(
    `INSERT INTO holidays (firm_id, name, date, type, branch_id, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.firm_id, name, date, type || 'public', branchId || null, description]
  );

  // Notify all employees
  const { rows: emps } = await db.query(
    `SELECT id FROM users WHERE firm_id=$1 AND status='active'${branchId ? ' AND branch_id=$2' : ''}`,
    branchId ? [req.user.firm_id, branchId] : [req.user.firm_id]
  );
  dispatch({
    firmId: req.user.firm_id, recipientIds: emps.map(e => e.id),
    type: 'holiday_announced', title: `Holiday: ${name}`,
    message: `${name} on ${date}${description ? ' — ' + description : ''}`,
    link: '/holidays',
  });
  created(res, rows[0], 'Holiday added');
};

exports.update = async (req, res) => {
  const { name, date, type, branchId, description } = req.body;
  const { rows } = await db.query(
    `UPDATE holidays SET name=$1, date=$2, type=$3, branch_id=$4, description=$5, updated_at=NOW()
     WHERE id=$6 AND firm_id=$7 RETURNING *`,
    [name, date, type, branchId || null, description, req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res, 'Holiday not found');
  success(res, rows[0], 'Holiday updated');
};

exports.delete = async (req, res) => {
  await db.query(`DELETE FROM holidays WHERE id=$1 AND firm_id=$2`, [req.params.id, req.user.firm_id]);
  success(res, null, 'Holiday deleted');
};
