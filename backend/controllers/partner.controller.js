const db = require('../config/database');
const { success, created, notFound } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const bcrypt = require('bcryptjs');

// ── List partners ─────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  const { search, status, page = 1, pageSize = 50 } = req.query;
  const { limit, offset } = paginate({ page, pageSize });
  const firmId = req.user.firm_id;

  let where = [
    `u.firm_id=$1`,
    `r.slug='partner'`,
    `u.email NOT LIKE '%@deleted.invalid'`
  ];
  const params = [firmId];
  let i = 2;

  if (search) {
    where.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (status) {
    where.push(`u.status=$${i}`);
    params.push(status); i++;
  }

  const whereStr = where.join(' AND ');

  const { rows: data } = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.employee_id,
            u.designation, u.status, u.join_date, u.avatar_url, u.created_at,
            r.slug as role, r.name as role_name,
            d.name as department_name, b.name as branch_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN branches b ON b.id = u.branch_id
     WHERE ${whereStr}
     ORDER BY u.first_name, u.last_name
     LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );

  const { rows: [{ total }] } = await db.query(
    `SELECT COUNT(*) as total FROM users u
     LEFT JOIN roles r ON r.id=u.role_id
     WHERE ${whereStr}`,
    params
  );

  success(res, { data, total: parseInt(total) });
};

// ── Get single partner ────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.*, r.slug as role, r.name as role_name,
            d.name as department_name, b.name as branch_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN branches b ON b.id = u.branch_id
     WHERE u.id=$1 AND u.firm_id=$2 AND r.slug='partner'`,
    [req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Create partner ────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { firstName, lastName, email, phone, designation, departmentId, branchId, joinDate } = req.body;
  const firmId = req.user.firm_id;

  // Get the partner role ID
  const { rows: roleRows } = await db.query(
    `SELECT id FROM roles WHERE slug='partner' AND (firm_id=$1 OR is_system=true) LIMIT 1`,
    [firmId]
  );
  if (!roleRows.length) throw Object.assign(new Error('Partner role not found'), { statusCode: 400 });

  const hash = await bcrypt.hash('Welcome@123', 12);
  const { rows } = await db.query(
    `INSERT INTO users
       (firm_id, first_name, last_name, email, phone, designation, role_id,
        department_id, branch_id, join_date, status, password_hash, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$12)
     RETURNING id`,
    [firmId, firstName, lastName, email.toLowerCase(), phone, designation,
     roleRows[0].id, departmentId || null, branchId || null,
     joinDate || null, hash, req.user.id]
  );

  const { rows: full } = await db.query(
    `SELECT u.*, r.slug as role, r.name as role_name
     FROM users u LEFT JOIN roles r ON r.id=u.role_id
     WHERE u.id=$1`, [rows[0].id]
  );
  created(res, full[0]);
};

// ── Update partner ────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  const { firstName, lastName, phone, designation, departmentId, branchId, status } = req.body;
  const fields = [], params = [];
  const set = (col, val) => { if (val !== undefined) { fields.push(`${col}=$${fields.length+1}`); params.push(val); } };

  set('first_name',    firstName);
  set('last_name',     lastName);
  set('phone',         phone);
  set('designation',   designation);
  set('department_id', departmentId);
  set('branch_id',     branchId);
  set('status',        status);

  if (!fields.length) {
    const { rows } = await db.query(`SELECT * FROM users WHERE id=$1 AND firm_id=$2`, [req.params.id, req.user.firm_id]);
    if (!rows.length) return notFound(res);
    return success(res, rows[0]);
  }

  params.push(req.params.id, req.user.firm_id);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(',')}, updated_at=NOW()
     WHERE id=$${params.length-1} AND firm_id=$${params.length} RETURNING id`,
    params
  );
  if (!rows.length) return notFound(res);

  const { rows: full } = await db.query(
    `SELECT u.*, r.slug as role, r.name as role_name,
            d.name as department_name, b.name as branch_name
     FROM users u LEFT JOIN roles r ON r.id=u.role_id
     LEFT JOIN departments d ON d.id=u.department_id
     LEFT JOIN branches b ON b.id=u.branch_id
     WHERE u.id=$1`, [rows[0].id]
  );
  success(res, full[0]);
};
