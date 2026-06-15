const db = require('../config/database');
const { paginate } = require('../utils/pagination');

const leaveService = {
  async apply({ firmId, userId, leaveType, fromDate, toDate, reason, totalDays }) {
    const days = parseFloat(totalDays) || 1;

    // Check leave balance (only if a balance record exists — new users may not have one)
    const { rows:[bal] } = await db.query(
      `SELECT * FROM leave_balances WHERE user_id=$1 AND leave_type=$2 AND year=EXTRACT(YEAR FROM NOW())`,
      [userId, leaveType]
    );
    if (bal && parseFloat(bal.remaining) < days)
      throw Object.assign(new Error(`Insufficient ${leaveType} leave balance`), { statusCode: 400 });

    const { rows } = await db.query(
      `INSERT INTO leaves (firm_id, user_id, leave_type, from_date, to_date, total_days, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING id`,
      [firmId, userId, leaveType, fromDate, toDate, days, reason]
    );
    return rows[0];
  },

  async approve(id, approverId, comment, firmId) {
    const { rows:[leave] } = await db.query(
      `SELECT * FROM leaves WHERE id=$1 AND firm_id=$2`, [id, firmId]
    );
    if (!leave) throw Object.assign(new Error('Leave not found'), { statusCode: 404 });

    await db.query(
      `UPDATE leaves SET status='approved', approved_by=$1, approved_at=NOW(), approver_comment=$2, updated_at=NOW()
       WHERE id=$3`, [approverId, comment, id]
    );

    // Deduct leave balance
    await db.query(
      `UPDATE leave_balances SET used=used+$1, remaining=remaining-$1
       WHERE user_id=$2 AND leave_type=$3 AND year=EXTRACT(YEAR FROM NOW())`,
      [leave.total_days, leave.user_id, leave.leave_type]
    );
    return leave;
  },

  async reject(id, approverId, comment, firmId) {
    await db.query(
      `UPDATE leaves SET status='rejected', approved_by=$1, approved_at=NOW(), approver_comment=$2, updated_at=NOW()
       WHERE id=$3 AND firm_id=$4`, [approverId, comment, id, firmId]
    );
  },

  async cancel(id, userId, firmId) {
    const { rows } = await db.query(
      `UPDATE leaves SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND firm_id=$3 AND status='pending' RETURNING id`,
      [id, userId, firmId]
    );
    if (!rows.length) throw Object.assign(new Error('Cannot cancel this leave'), { statusCode: 400 });
  },

  async getAll({ firmId, userId, role, status, page, pageSize }) {
    const { limit, offset } = paginate({ page, pageSize });
    let where = [`l.firm_id=$1`], params = [firmId], i = 2;

    if (role === 'employee') { where.push(`l.user_id=$${i}`); params.push(userId); i++; }
    if (status) { where.push(`l.status=$${i}`); params.push(status); i++; }

    const { rows: data } = await db.query(
      `SELECT l.*, u.first_name, u.last_name, u.email,
              d.name as department_name,
              mgr.first_name as approver_first, mgr.last_name as approver_last
       FROM leaves l
       LEFT JOIN users u ON u.id=l.user_id
       LEFT JOIN departments d ON d.id=u.department_id
       LEFT JOIN users mgr ON mgr.id=l.approved_by
       WHERE ${where.join(' AND ')}
       ORDER BY l.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    const { rows:[{total}] } = await db.query(
      `SELECT COUNT(*) as total FROM leaves l WHERE ${where.join(' AND ')}`, params
    );
    return { data, total: parseInt(total) };
  },

  async getBalance(userId) {
    const { rows } = await db.query(
      `SELECT leave_type, total, used, remaining
       FROM leave_balances WHERE user_id=$1 AND year=EXTRACT(YEAR FROM NOW())`,
      [userId]
    );
    return rows;
  },

  async getPendingCount(firmId) {
    const { rows } = await db.query(
      `SELECT COUNT(*) as total FROM leaves WHERE firm_id=$1 AND status='pending'`, [firmId]
    );
    return parseInt(rows[0].total);
  },
};

module.exports = leaveService;
