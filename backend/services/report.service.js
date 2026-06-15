const db = require('../config/database');

const reportService = {
  async utilizationReport({ firmId, fromDate, toDate, departmentId }) {
    let where = `t.firm_id=$1 AND t.date BETWEEN $2 AND $3 AND t.status IN ('approved','final_approved')`;
    let params = [firmId, fromDate, toDate];
    if (departmentId) { where += ` AND u.department_id=$4`; params.push(departmentId); }

    const { rows } = await db.query(
      `SELECT u.id,
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              u.designation,
              d.name AS department,
              ROUND(SUM(t.hours_worked)::numeric, 1)    AS total_hours,
              ROUND(SUM(t.billable_hours)::numeric, 1)  AS billable_hours,
              ROUND(SUM(CASE WHEN NOT t.is_billable THEN t.hours_worked ELSE 0 END)::numeric, 1) AS non_billable_hours,
              ROUND((SUM(t.billable_hours)/NULLIF(SUM(t.hours_worked),0)*100)::numeric, 1) AS utilization_pct
       FROM timesheets t
       JOIN users u ON u.id=t.user_id
       LEFT JOIN departments d ON d.id=u.department_id
       WHERE ${where}
       GROUP BY u.id, u.first_name, u.last_name, u.designation, d.name
       ORDER BY utilization_pct DESC NULLS LAST`,
      params
    );
    return rows;
  },

  async clientHoursReport({ firmId, fromDate, toDate, clientId }) {
    let where = `t.firm_id=$1 AND t.date BETWEEN $2 AND $3 AND t.status IN ('approved','final_approved')`;
    let params = [firmId, fromDate, toDate];
    if (clientId) { where += ` AND t.client_id=$4`; params.push(clientId); }

    const { rows } = await db.query(
      `SELECT c.id, c.client_name, c.client_code,
              ROUND(SUM(t.hours_worked)::numeric, 1)   AS total_hours,
              ROUND(SUM(t.billable_hours)::numeric, 1) AS billable_hours,
              ROUND(SUM(CASE WHEN NOT t.is_billable THEN t.hours_worked ELSE 0 END)::numeric, 1) AS non_billable_hours,
              COUNT(t.id) AS entry_count
       FROM timesheets t
       JOIN clients c ON c.id=t.client_id
       WHERE ${where}
       GROUP BY c.id, c.client_name, c.client_code
       ORDER BY total_hours DESC`,
      params
    );
    return rows;
  },

  async billableReport({ firmId, fromDate, toDate }) {
    // Group by month so charts show monthly trend (not daily noise)
    const { rows } = await db.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', t.date), 'Mon YYYY') AS month,
              ROUND(SUM(CASE WHEN t.is_billable     THEN t.hours_worked ELSE 0 END)::numeric, 1) AS billable_hours,
              ROUND(SUM(CASE WHEN NOT t.is_billable THEN t.hours_worked ELSE 0 END)::numeric, 1) AS non_billable_hours,
              ROUND(SUM(t.hours_worked)::numeric, 1) AS total_hours
       FROM timesheets t
       WHERE t.firm_id=$1 AND t.date BETWEEN $2 AND $3
             AND t.status IN ('approved','final_approved')
       GROUP BY DATE_TRUNC('month', t.date)
       ORDER BY DATE_TRUNC('month', t.date)`,
      [firmId, fromDate, toDate]
    );
    return rows;
  },

  async leaveReport({ firmId, fromDate, toDate }) {
    // Pivot: one row per employee, columns per leave type
    const { rows } = await db.query(
      `SELECT u.id,
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              d.name AS department,
              COALESCE(SUM(CASE WHEN l.leave_type='casual'   THEN l.total_days END), 0) AS casual,
              COALESCE(SUM(CASE WHEN l.leave_type='sick'     THEN l.total_days END), 0) AS sick,
              COALESCE(SUM(CASE WHEN l.leave_type='earned'   THEN l.total_days END), 0) AS earned,
              COALESCE(SUM(CASE WHEN l.leave_type='lop'      THEN l.total_days END), 0) AS lop,
              COALESCE(SUM(l.total_days), 0) AS total_days
       FROM leaves l
       JOIN users u ON u.id=l.user_id
       LEFT JOIN departments d ON d.id=u.department_id
       WHERE l.firm_id=$1 AND l.from_date>=$2 AND l.to_date<=$3
             AND l.status='approved'
       GROUP BY u.id, u.first_name, u.last_name, d.name
       ORDER BY total_days DESC`,
      [firmId, fromDate, toDate]
    );
    return rows;
  },

  async departmentStats(firmId) {
    const { rows } = await db.query(
      `SELECT d.id, d.name,
              COUNT(u.id) AS "employeeCount"
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.status = 'active'
       WHERE d.firm_id = $1 AND d.is_active = true
       GROUP BY d.id, d.name
       ORDER BY d.name`,
      [firmId]
    );
    return rows;
  },

  async dashboardStats(firmId) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0,8) + '01';

    const [emp, clients, assignments, hoursThisMonth, pendingTimesheets, pendingLeaves] =
      await Promise.all([
        db.query(`SELECT COUNT(*) FROM users WHERE firm_id=$1 AND status='active'`, [firmId]),
        db.query(`SELECT COUNT(*) FROM clients WHERE firm_id=$1 AND status='active'`, [firmId]),
        db.query(`SELECT COUNT(*) FROM assignments WHERE firm_id=$1 AND status NOT IN ('completed','closed')`, [firmId]),
        db.query(`SELECT COALESCE(SUM(hours_worked),0) as total FROM timesheets WHERE firm_id=$1 AND date BETWEEN $2 AND $3`, [firmId, monthStart, today]),
        db.query(`SELECT COUNT(*) FROM timesheets WHERE firm_id=$1 AND status='submitted'`, [firmId]),
        db.query(`SELECT COUNT(*) FROM leaves WHERE firm_id=$1 AND status='pending'`, [firmId]),
      ]);

    return {
      totalEmployees:    parseInt(emp.rows[0].count),
      totalClients:      parseInt(clients.rows[0].count),
      openAssignments:   parseInt(assignments.rows[0].count),
      hoursThisMonth:    parseFloat(hoursThisMonth.rows[0].total),
      pendingTimesheets: parseInt(pendingTimesheets.rows[0].count),
      pendingLeaves:     parseInt(pendingLeaves.rows[0].count),
    };
  },
};

module.exports = reportService;
