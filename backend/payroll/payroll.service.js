/**
 * Payroll Service — Simple CA-firm payroll
 *
 * Calculation:
 *   working_days     = calendar_days_in_month - sundays
 *   per_day_salary   = monthly_salary / working_days
 *   absent_deduction = per_day_salary * absent_days
 *   net_salary       = monthly_salary - absent_deduction + reimbursement
 *   final_salary     = ROUND(net_salary) + adjustment
 */
const db = require('../config/database');

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const daysInMonth = (month, year) => new Date(year, month, 0).getDate();

const sundaysInMonth = (month, year) => {
  const days = daysInMonth(month, year);
  let sundays = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays++;
  }
  return sundays;
};

const getWorkingDays = (month, year) =>
  daysInMonth(month, year) - sundaysInMonth(month, year);

const computeSlip = ({ monthly_salary, working_days, absent_days, reimbursement, adjustment }) => {
  const ms    = parseFloat(monthly_salary) || 0;
  const wd    = parseInt(working_days)     || 1;
  const abs   = parseInt(absent_days)      || 0;
  const reimb = parseFloat(reimbursement)  || 0;
  const adj   = parseFloat(adjustment)     || 0;

  const per_day_salary   = ms / wd;
  const absent_deduction = +(per_day_salary * abs).toFixed(2);
  const net_salary       = +(ms - absent_deduction + reimb).toFixed(2);
  const final_salary     = +(Math.round(net_salary) + adj).toFixed(2);
  const present_days     = wd - abs;

  return { per_day_salary: +per_day_salary.toFixed(4), absent_deduction, net_salary, final_salary, present_days };
};

// ─────────────────────────────────────────────────────────
// Salary Config
// ─────────────────────────────────────────────────────────

const getSalaryConfig = async (userId, firmId) => {
  const { rows: [row] } = await db.query(
    `SELECT * FROM employee_salary WHERE user_id = $1 AND firm_id = $2`,
    [userId, firmId]
  );
  return row || null;
};

const upsertSalaryConfig = async (userId, firmId, { monthlySalary, notes, createdBy }) => {
  const { rows: [row] } = await db.query(
    `INSERT INTO employee_salary (user_id, firm_id, monthly_salary, notes, created_by, is_active, effective_from)
     VALUES ($1, $2, $3, $4, $5, true, CURRENT_DATE)
     ON CONFLICT (user_id, firm_id) DO UPDATE SET
       monthly_salary = $3,
       notes          = COALESCE($4, employee_salary.notes),
       is_active      = true,
       updated_at     = NOW()
     RETURNING *`,
    [userId, firmId, monthlySalary, notes || null, createdBy || null]
  );
  return row;
};

const listEmployeeSalaries = async (firmId) => {
  const { rows } = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            u.employee_id AS employee_code,
            r.name AS role_name, r.slug AS role_slug,
            es.id AS salary_id,
            COALESCE(es.monthly_salary, 0) AS monthly_salary,
            es.is_active AS salary_active
       FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN employee_salary es ON es.user_id = u.id AND es.firm_id = $1
      WHERE u.firm_id = $1
        AND (u.status = 'active' OR u.status IS NULL)
        AND r.slug NOT IN ('partner','super_admin')
   ORDER BY u.first_name, u.last_name`,
    [firmId]
  );
  return rows;
};

// ─────────────────────────────────────────────────────────
// Payroll Runs
// ─────────────────────────────────────────────────────────

const listRuns = async (firmId, year) => {
  const { rows } = await db.query(
    `SELECT pr.*,
            COUNT(ss.id)::int AS slip_count,
            COUNT(CASE WHEN ss.email_status = 'sent'    THEN 1 END)::int AS emails_sent,
            COUNT(CASE WHEN ss.email_status = 'failed'  THEN 1 END)::int AS emails_failed,
            COUNT(CASE WHEN ss.email_status = 'pending' THEN 1 END)::int AS emails_pending,
            u.first_name || ' ' || u.last_name AS created_by_name
       FROM payroll_runs pr
  LEFT JOIN salary_slips ss ON ss.payroll_run_id = pr.id
  LEFT JOIN users u ON u.id = pr.created_by
      WHERE pr.firm_id = $1
        AND ($2::int IS NULL OR pr.year = $2::int)
   GROUP BY pr.id, u.first_name, u.last_name
   ORDER BY pr.year DESC, pr.month DESC`,
    [firmId, year || null]
  );
  return rows;
};

const getRun = async (runId, firmId) => {
  const { rows: [run] } = await db.query(
    `SELECT pr.*,
            COUNT(ss.id)::int AS slip_count,
            COUNT(CASE WHEN ss.email_status = 'sent'    THEN 1 END)::int AS emails_sent,
            COUNT(CASE WHEN ss.email_status = 'failed'  THEN 1 END)::int AS emails_failed,
            COUNT(CASE WHEN ss.email_status = 'pending' THEN 1 END)::int AS emails_pending,
            u.first_name || ' ' || u.last_name AS created_by_name,
            a.first_name || ' ' || a.last_name AS approved_by_name
       FROM payroll_runs pr
  LEFT JOIN salary_slips ss ON ss.payroll_run_id = pr.id
  LEFT JOIN users u ON u.id = pr.created_by
  LEFT JOIN users a ON a.id = pr.approved_by
      WHERE pr.id = $1 AND pr.firm_id = $2
   GROUP BY pr.id, u.first_name, u.last_name, a.first_name, a.last_name`,
    [runId, firmId]
  );
  return run || null;
};

const getOrCreateRun = async (firmId, month, year, createdBy) => {
  const { rows: [existing] } = await db.query(
    `SELECT * FROM payroll_runs WHERE firm_id = $1 AND month = $2 AND year = $3`,
    [firmId, month, year]
  );
  if (existing) return existing;

  const workingDays = getWorkingDays(parseInt(month), parseInt(year));

  const { rows: [run] } = await db.query(
    `INSERT INTO payroll_runs (firm_id, month, year, status, working_days, created_by)
     VALUES ($1, $2, $3, 'draft', $4, $5) RETURNING *`,
    [firmId, month, year, workingDays, createdBy]
  );
  return run;
};

const updateRunWorkingDays = async (runId, firmId, workingDays) => {
  const { rows: [run] } = await db.query(
    `UPDATE payroll_runs SET working_days = $1, updated_at = NOW()
      WHERE id = $2 AND firm_id = $3 AND status = 'draft' RETURNING *`,
    [workingDays, runId, firmId]
  );
  return run;
};

// ─────────────────────────────────────────────────────────
// Slip Generation
// ─────────────────────────────────────────────────────────

const generateSlips = async (runId, firmId) => {
  const run = await getRun(runId, firmId);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'draft') throw new Error('Can only regenerate slips for draft runs');

  const { rows: employees } = await db.query(
    `SELECT u.id AS user_id, u.first_name, u.last_name, u.email,
            COALESCE(es.monthly_salary, 0) AS monthly_salary
       FROM users u
  LEFT JOIN employee_salary es ON es.user_id = u.id AND es.firm_id = $1 AND es.is_active = true
  LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.firm_id = $1
        AND u.status = 'active'
        AND r.slug NOT IN ('partner','super_admin')`,
    [firmId]
  );

  if (employees.length === 0) throw new Error('No active employees found');

  await db.query(`DELETE FROM salary_slips WHERE payroll_run_id = $1`, [runId]);

  const workingDays = run.working_days;
  let totalNet = 0, totalDeductions = 0;

  for (const emp of employees) {
    const { per_day_salary, absent_deduction, net_salary, final_salary, present_days } =
      computeSlip({ monthly_salary: emp.monthly_salary, working_days: workingDays,
                    absent_days: 0, reimbursement: 0, adjustment: 0 });

    await db.query(
      `INSERT INTO salary_slips
         (payroll_run_id, user_id, firm_id, month, year,
          monthly_salary, working_days, present_days, absent_days,
          per_day_salary, absent_deduction, reimbursement, net_salary, adjustment, final_salary,
          email_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending')`,
      [runId, emp.user_id, firmId, run.month, run.year,
       emp.monthly_salary, workingDays, present_days, 0,
       per_day_salary, absent_deduction, 0, net_salary, 0, final_salary]
    );

    totalNet        += final_salary;
    totalDeductions += absent_deduction;
  }

  await db.query(
    `UPDATE payroll_runs SET total_employees=$1, total_net=$2, total_deductions=$3, updated_at=NOW()
     WHERE id=$4`,
    [employees.length, +totalNet.toFixed(2), +totalDeductions.toFixed(2), runId]
  );

  return { generated: employees.length };
};

// ─────────────────────────────────────────────────────────
// Slip Editing
// ─────────────────────────────────────────────────────────

const getRunSlips = async (runId, firmId) => {
  const { rows } = await db.query(
    `SELECT ss.*,
            u.first_name, u.last_name, u.email,
            u.employee_id  AS employee_code,
            COALESCE(u.designation, r.name) AS designation,
            d.name AS department_name,
            COALESCE(bs.firm_name, f.name)   AS firm_name,
            bs.logo_url                       AS firm_logo,
            COALESCE(bs.address,  f.address)  AS firm_address,
            COALESCE(bs.phone,    f.phone)     AS firm_phone,
            COALESCE(bs.email,    f.email)     AS firm_email,
            bs.website                         AS firm_website,
            bs.primary_color                   AS firm_primary_color
       FROM salary_slips ss
       JOIN users u ON u.id = ss.user_id
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
       JOIN firms f ON f.id = ss.firm_id
  LEFT JOIN branding_settings bs ON bs.firm_id = ss.firm_id
      WHERE ss.payroll_run_id = $1 AND ss.firm_id = $2
   ORDER BY u.first_name, u.last_name`,
    [runId, firmId]
  );
  return rows;
};

const updateSlip = async (slipId, firmId, { absentDays, reimbursement, adjustment, remarks }) => {
  const { rows: [slip] } = await db.query(
    `SELECT ss.*, pr.status AS run_status, pr.working_days
       FROM salary_slips ss
       JOIN payroll_runs pr ON pr.id = ss.payroll_run_id
      WHERE ss.id = $1 AND ss.firm_id = $2`,
    [slipId, firmId]
  );
  if (!slip) throw new Error('Slip not found');
  if (slip.is_locked) throw new Error('Slip is locked after approval');

  const abs   = absentDays    !== undefined ? parseInt(absentDays)        : slip.absent_days;
  const reimb = reimbursement !== undefined ? parseFloat(reimbursement)   : parseFloat(slip.reimbursement);
  const adj   = adjustment    !== undefined ? parseFloat(adjustment)      : parseFloat(slip.adjustment);

  const c = computeSlip({ monthly_salary: slip.monthly_salary, working_days: slip.working_days,
                           absent_days: abs, reimbursement: reimb, adjustment: adj });

  const { rows: [updated] } = await db.query(
    `UPDATE salary_slips SET
       absent_days=$1, present_days=$2, reimbursement=$3, adjustment=$4,
       per_day_salary=$5, absent_deduction=$6, net_salary=$7, final_salary=$8,
       remarks=COALESCE($9, remarks), updated_at=NOW()
     WHERE id=$10 RETURNING *`,
    [abs, c.present_days, reimb, adj, c.per_day_salary, c.absent_deduction,
     c.net_salary, c.final_salary, remarks || null, slipId]
  );

  await refreshRunTotals(slip.payroll_run_id);
  return updated;
};

const refreshRunTotals = async (runId) => {
  await db.query(
    `UPDATE payroll_runs SET
       total_employees  = (SELECT COUNT(*)::int                       FROM salary_slips WHERE payroll_run_id=$1),
       total_net        = (SELECT COALESCE(SUM(final_salary),0)       FROM salary_slips WHERE payroll_run_id=$1),
       total_deductions = (SELECT COALESCE(SUM(absent_deduction),0)   FROM salary_slips WHERE payroll_run_id=$1),
       updated_at=NOW()
     WHERE id=$1`,
    [runId]
  );
};

// ─────────────────────────────────────────────────────────
// Approval & Send
// ─────────────────────────────────────────────────────────

const approveRun = async (runId, firmId, approverId) => {
  const { rows: [run] } = await db.query(
    `UPDATE payroll_runs SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
     WHERE id=$2 AND firm_id=$3 AND status='draft' RETURNING *`,
    [approverId, runId, firmId]
  );
  if (!run) throw new Error('Run not found or not in draft status');
  await db.query(`UPDATE salary_slips SET is_locked=true, updated_at=NOW() WHERE payroll_run_id=$1`, [runId]);
  return run;
};

const markRunSent = async (runId, firmId) => {
  const { rows: [run] } = await db.query(
    `UPDATE payroll_runs SET status='sent', sent_at=NOW(), updated_at=NOW()
     WHERE id=$1 AND firm_id=$2 AND status='approved' RETURNING *`,
    [runId, firmId]
  );
  if (!run) throw new Error('Run not found or not in approved status');
  return run;
};

// ─────────────────────────────────────────────────────────
// Email tracking
// ─────────────────────────────────────────────────────────

const markSlipEmailSent = async (slipId, toEmail) => {
  await db.query(
    `UPDATE salary_slips SET email_status='sent', email_sent_at=NOW(), email_error=NULL, updated_at=NOW()
     WHERE id=$1`, [slipId]
  );
  await db.query(
    `INSERT INTO payroll_email_log (slip_id, payroll_run_id, user_id, to_email, status)
     SELECT $1, payroll_run_id, user_id, $2, 'sent' FROM salary_slips WHERE id=$1`,
    [slipId, toEmail]
  );
};

const markSlipEmailFailed = async (slipId, toEmail, errorMessage) => {
  await db.query(
    `UPDATE salary_slips SET email_status='failed', email_error=$2, updated_at=NOW() WHERE id=$1`,
    [slipId, errorMessage]
  );
  await db.query(
    `INSERT INTO payroll_email_log (slip_id, payroll_run_id, user_id, to_email, status, error_message)
     SELECT $1, payroll_run_id, user_id, $2, 'failed', $3 FROM salary_slips WHERE id=$1`,
    [slipId, toEmail, errorMessage]
  );
};

// ─────────────────────────────────────────────────────────
// Employee self-service
// ─────────────────────────────────────────────────────────

const getMySlips = async (userId, { page = 1, limit = 12 } = {}) => {
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    `SELECT ss.*, pr.status AS run_status
       FROM salary_slips ss
       JOIN payroll_runs pr ON pr.id = ss.payroll_run_id
      WHERE ss.user_id=$1 AND pr.status IN ('approved','sent')
   ORDER BY ss.year DESC, ss.month DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const { rows: [{ total }] } = await db.query(
    `SELECT COUNT(*)::int AS total FROM salary_slips ss
       JOIN payroll_runs pr ON pr.id=ss.payroll_run_id
      WHERE ss.user_id=$1 AND pr.status IN ('approved','sent')`,
    [userId]
  );
  return { data: rows, total };
};

const getSlipById = async (slipId) => {
  const { rows: [slip] } = await db.query(
    `SELECT ss.*,
            u.first_name, u.last_name, u.email,
            u.employee_id  AS employee_code,
            COALESCE(u.designation, r.name) AS designation,
            d.name AS department_name,
            COALESCE(bs.firm_name, f.name)   AS firm_name,
            bs.logo_url                       AS firm_logo,
            COALESCE(bs.address,  f.address)  AS firm_address,
            COALESCE(bs.phone,    f.phone)     AS firm_phone,
            COALESCE(bs.email,    f.email)     AS firm_email,
            bs.website                         AS firm_website,
            bs.primary_color                   AS firm_primary_color
       FROM salary_slips ss
       JOIN users u ON u.id = ss.user_id
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
       JOIN firms f ON f.id = ss.firm_id
  LEFT JOIN branding_settings bs ON bs.firm_id = ss.firm_id
      WHERE ss.id=$1`,
    [slipId]
  );
  return slip || null;
};

module.exports = {
  getWorkingDays, computeSlip,
  getSalaryConfig, upsertSalaryConfig, listEmployeeSalaries,
  listRuns, getRun, getOrCreateRun, updateRunWorkingDays,
  generateSlips, getRunSlips, updateSlip, refreshRunTotals,
  approveRun, markRunSent,
  markSlipEmailSent, markSlipEmailFailed,
  getMySlips, getSlipById,
};
