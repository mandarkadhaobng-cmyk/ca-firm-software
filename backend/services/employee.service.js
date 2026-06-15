const bcrypt = require('bcryptjs');
const db     = require('../config/database');
const { paginate } = require('../utils/pagination');

const employeeService = {
  async getAll({ firmId, search, status, departmentId, roleSlug, page, pageSize }) {
    const { limit, offset } = paginate({ page, pageSize });
    // Exclude soft-deleted users AND partners (partners have their own section)
    let where = [`u.firm_id=$1`, `u.email NOT LIKE '%@deleted.invalid'`, `r.slug != 'partner'`], params = [firmId], i = 2;

    if (search)       { where.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i} OR u.employee_id ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status)       { where.push(`u.status=$${i}`);        params.push(status);       i++; }
    if (departmentId) { where.push(`u.department_id=$${i}`); params.push(departmentId); i++; }
    if (roleSlug)     { where.push(`r.slug=$${i}`);          params.push(roleSlug);     i++; }

    const whereStr = where.join(' AND ');

    const { rows: data } = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.employee_id, u.designation,
              u.phone, u.status, u.join_date, u.avatar_url,
              r.slug as role, r.name as role_name,
              d.name as department_name, d.id as department_id,
              b.name as branch_name,
              mgr.first_name as manager_first, mgr.last_name as manager_last
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN users mgr ON mgr.id = u.reporting_manager_id
       WHERE ${whereStr}
       ORDER BY u.first_name, u.last_name
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    const { rows: [{ total }] } = await db.query(
      `SELECT COUNT(*) as total FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE ${whereStr}`,
      params
    );

    return { data, total: parseInt(total) };
  },

  async getById(id, firmId) {
    const { rows } = await db.query(
      `SELECT u.*, r.slug as role, r.name as role_name,
              d.name as department_name, b.name as branch_name,
              mgr.first_name as manager_first, mgr.last_name as manager_last, mgr.email as manager_email
       FROM users u
       LEFT JOIN roles r ON r.id=u.role_id
       LEFT JOIN departments d ON d.id=u.department_id
       LEFT JOIN branches b ON b.id=u.branch_id
       LEFT JOIN users mgr ON mgr.id=u.reporting_manager_id
       WHERE u.id=$1 AND u.firm_id=$2`,
      [id, firmId]
    );
    return rows[0] || null;
  },

  async create({ firmId, createdBy, data }) {
    const hash = await bcrypt.hash(data.password || 'Welcome@123', 12);

    const { rows } = await db.query(
      `INSERT INTO users
         (firm_id, first_name, last_name, email, phone, employee_id, designation, role_id,
          department_id, branch_id, reporting_manager_id, join_date, status, password_hash, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13,$14)
       RETURNING id`,
      [firmId, data.firstName, data.lastName, data.email.toLowerCase(), data.phone,
       data.employeeId, data.designation, data.roleId, data.departmentId,
       data.branchId, data.reportingManagerId, data.joinDate, hash, createdBy]
    );
    return this.getById(rows[0].id, firmId);
  },

  async update(id, firmId, data) {
    const fields = [], params = [];
    const set = (col, val) => { if (val !== undefined) { fields.push(`${col}=$${fields.length+1}`); params.push(val); } };

    set('first_name',          data.firstName);
    set('last_name',           data.lastName);
    set('phone',               data.phone);
    set('designation',         data.designation);
    set('role_id',             data.roleId);
    set('department_id',       data.departmentId);
    set('branch_id',           data.branchId);
    set('reporting_manager_id',data.reportingManagerId);
    set('status',              data.status);
    // Payroll / banking (migration 018 required)
    set('pan_number',          data.panNumber);
    set('bank_name',           data.bankName);
    set('account_number',      data.accountNumber);
    set('ifsc_code',           data.ifscCode);

    if (!fields.length) return this.getById(id, firmId);

    params.push(id, firmId);
    await db.query(
      `UPDATE users SET ${fields.join(',')}, updated_at=NOW()
       WHERE id=$${params.length-1} AND firm_id=$${params.length}`,
      params
    );
    return this.getById(id, firmId);
  },

  async getDropdownList(firmId) {
    const { rows } = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, r.slug as role
       FROM users u LEFT JOIN roles r ON r.id=u.role_id
       WHERE u.firm_id=$1 AND u.status='active'
         AND u.email NOT LIKE '%@deleted.invalid'
         AND r.slug != 'partner'
       ORDER BY u.first_name`,
      [firmId]
    );
    return rows;
  },

  /**
   * Admin: reset another user's password.
   * firmId ensures we never touch a user outside our firm.
   */
  async adminResetPassword(userId, firmId, newPassword) {
    const hash = await bcrypt.hash(newPassword, 12);
    const { rows } = await db.query(
      `UPDATE users SET password_hash=$1, updated_at=NOW()
       WHERE id=$2 AND firm_id=$3 RETURNING id`,
      [hash, userId, firmId]
    );
    if (!rows.length) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    // Revoke all refresh tokens so the user must log in again with the new password
    await db.query(`UPDATE refresh_tokens SET revoked=true WHERE user_id=$1`, [userId]);
    return true;
  },

  /**
   * Super-admin: soft-delete a user from the firm.
   * We cannot hard-DELETE because timesheets, assignments, and leaves hold a
   * FK reference to users.id for record-keeping purposes.  Instead we:
   *   1. Verify the user exists in this firm.
   *   2. Revoke all active sessions.
   *   3. Scramble the email so the address is freed for future re-use.
   *   4. Clear the password hash so the account can never be logged into.
   *   5. Mark status = 'deleted' so it is filtered out of all active lists.
   */
  async remove(userId, firmId) {
    const { rows } = await db.query(
      `SELECT id FROM users WHERE id=$1 AND firm_id=$2`, [userId, firmId]
    );
    if (!rows.length) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    // Revoke all sessions
    await db.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]);

    // Soft-delete: scramble email (tombstone marker), wipe password, mark inactive.
    // We use 'inactive' because the DB check constraint only allows active/inactive.
    // The tombstone email pattern (@deleted.invalid) is how we distinguish a
    // soft-deleted user from a merely deactivated one in all queries.
    const tombstoneEmail = `deleted_${userId}@deleted.invalid`;
    await db.query(
      `UPDATE users
       SET status        = 'inactive',
           email         = $1,
           password_hash = '',
           updated_at    = NOW()
       WHERE id=$2 AND firm_id=$3`,
      [tombstoneEmail, userId, firmId]
    );
    return true;
  },

  /**
   * Admin: change another user's email.
   */
  async adminChangeEmail(userId, firmId, newEmail) {
    const email = newEmail.toLowerCase().trim();
    // Check uniqueness
    const { rows: existing } = await db.query(
      `SELECT id FROM users WHERE email=$1 AND id != $2`, [email, userId]
    );
    if (existing.length) throw Object.assign(new Error('Email already in use'), { statusCode: 400 });

    const { rows } = await db.query(
      `UPDATE users SET email=$1, updated_at=NOW()
       WHERE id=$2 AND firm_id=$3 RETURNING id`,
      [email, userId, firmId]
    );
    if (!rows.length) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return true;
  },
};

module.exports = employeeService;
