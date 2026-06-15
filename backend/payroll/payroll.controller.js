const svc      = require('./payroll.service');
const pdfSvc   = require('./payroll.pdf.service');
const emailSvc = require('../services/email.service');
const { dispatch } = require('../notifications/notification.engine');
const db       = require('../config/database');
const { success, error: apiError } = require('../utils/response');

const HR_ROLES = ['super_admin','partner','hr'];

const MONTH_NAMES = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Salary Config ─────────────────────────────────────────

exports.getSalaryConfig = async (req, res) => {
  try {
    const data = await svc.getSalaryConfig(req.params.userId, req.user.firm_id);
    success(res, data);
  } catch (e) { apiError(res, e.message); }
};

exports.upsertSalaryConfig = async (req, res) => {
  try {
    const { monthlySalary, notes } = req.body;
    if (!monthlySalary || isNaN(monthlySalary))
      return res.status(400).json({ message: 'monthlySalary is required' });
    const data = await svc.upsertSalaryConfig(
      req.params.userId, req.user.firm_id,
      { monthlySalary: parseFloat(monthlySalary), notes, createdBy: req.user.id }
    );
    success(res, data, 'Salary config saved');
  } catch (e) { apiError(res, e.message); }
};

exports.listEmployeeSalaries = async (req, res) => {
  try {
    const data = await svc.listEmployeeSalaries(req.user.firm_id);
    success(res, data);
  } catch (e) { apiError(res, e.message); }
};

// ── Payroll Runs ──────────────────────────────────────────

exports.listRuns = async (req, res) => {
  try {
    const data = await svc.listRuns(req.user.firm_id, req.query.year ? parseInt(req.query.year) : null);
    success(res, data);
  } catch (e) { apiError(res, e.message); }
};

exports.getOrCreateRun = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: 'month and year required' });
    const run = await svc.getOrCreateRun(req.user.firm_id, parseInt(month), parseInt(year), req.user.id);
    success(res, run, 'Payroll run ready');
  } catch (e) { apiError(res, e.message); }
};

exports.getRun = async (req, res) => {
  try {
    const run = await svc.getRun(req.params.runId, req.user.firm_id);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    success(res, run);
  } catch (e) { apiError(res, e.message); }
};

exports.updateRunWorkingDays = async (req, res) => {
  try {
    const { workingDays } = req.body;
    if (!workingDays) return res.status(400).json({ message: 'workingDays required' });
    const run = await svc.updateRunWorkingDays(req.params.runId, req.user.firm_id, parseInt(workingDays));
    if (!run) return res.status(400).json({ message: 'Cannot update — run not in draft status' });
    success(res, run, 'Working days updated');
  } catch (e) { apiError(res, e.message); }
};

// ── Slip Generation ───────────────────────────────────────

exports.generateSlips = async (req, res) => {
  try {
    const result = await svc.generateSlips(req.params.runId, req.user.firm_id);
    success(res, result, result.generated + ' salary slips generated');
  } catch (e) { apiError(res, e.message); }
};

exports.getRunSlips = async (req, res) => {
  try {
    const slips = await svc.getRunSlips(req.params.runId, req.user.firm_id);
    success(res, slips);
  } catch (e) { apiError(res, e.message); }
};

exports.updateSlip = async (req, res) => {
  try {
    const { absentDays, reimbursement, adjustment, remarks } = req.body;
    const slip = await svc.updateSlip(req.params.slipId, req.user.firm_id,
      { absentDays, reimbursement, adjustment, remarks });
    success(res, slip, 'Slip updated');
  } catch (e) { apiError(res, e.message); }
};

// ── Approval ─────────────────────────────────────────────

exports.approveRun = async (req, res) => {
  try {
    const run = await svc.approveRun(req.params.runId, req.user.firm_id, req.user.id);

    // Notify HR/admin + employees — fire-and-forget
    const periodLabel = `${MONTH_NAMES[run.month] || run.month} ${run.year}`;
    setImmediate(async () => {
      try {
        // 1. Notify all HR/partner/super_admin about the approval
        const { rows: hrUsers } = await db.query(
          `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
            WHERE u.firm_id = $1 AND r.slug IN ('hr','partner','super_admin') AND u.status = 'active'`,
          [req.user.firm_id]
        );
        const hrIds = hrUsers.map(r => r.id).filter(id => id !== req.user.id);
        if (hrIds.length) {
          dispatch({
            firmId: req.user.firm_id,
            recipientIds: hrIds,
            type:    'payroll_approved',
            title:   'Payroll Approved',
            message: `Payroll for ${periodLabel} has been approved by ${req.user.email}. Payslips can now be sent to employees.`,
            link:    `/payroll/runs/${run.id}`,
          });
        }

        // 2. Notify all employees in this run that their payslip is ready
        const { rows: slipEmployees } = await db.query(
          `SELECT DISTINCT user_id FROM salary_slips WHERE payroll_run_id = $1`,
          [run.id]
        );
        const empIds = slipEmployees.map(r => r.user_id);
        if (empIds.length) {
          dispatch({
            firmId: req.user.firm_id,
            recipientIds: empIds,
            type:    'payslip_ready',
            title:   'Your Payslip is Ready',
            message: `Your payslip for ${periodLabel} has been approved and will be sent to you shortly.`,
            link:    '/my-payslips',
          });
        }
      } catch { /* notification failure must not affect the response */ }
    });

    success(res, run, 'Payroll approved');
  } catch (e) { apiError(res, e.message); }
};

// ── PDF Download ──────────────────────────────────────────

exports.downloadSlipPdf = async (req, res) => {
  try {
    const slip = await svc.getSlipById(req.params.slipId);
    if (!slip) return res.status(404).json({ message: 'Slip not found' });
    // Access check: employee can only download their own slip
    if (!HR_ROLES.includes(req.user.role) && slip.user_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const pdfBuffer = await pdfSvc.generateSlipPdf(slip);
    const filename  = 'Payslip_' + (slip.first_name || '') + '_' +
                      (slip.month || '') + '_' + (slip.year || '') + '.pdf';
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Content-Length':      pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (e) { apiError(res, e.message); }
};

// ── Bulk Email Send ───────────────────────────────────────

exports.sendBulkEmails = async (req, res) => {
  try {
    const slips = await svc.getRunSlips(req.params.runId, req.user.firm_id);
    const run   = await svc.getRun(req.params.runId, req.user.firm_id);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.status !== 'approved')
      return res.status(400).json({ message: 'Run must be approved before sending emails' });

    const { slipIds } = req.body; // optional — send only selected slips
    const targets = slipIds && slipIds.length > 0
      ? slips.filter(s => slipIds.includes(s.id))
      : slips;

    let sent = 0, failed = 0, skipped = 0;
    const failures = [];

    for (const slip of targets) {
      if (!slip.email) {
        skipped++;
        await db_skipSlip(slip.id);
        continue;
      }
      try {
        const pdfBuffer = await pdfSvc.generateSlipPdf(slip);
        await emailSvc.sendPayslipEmail(slip.email, slip, pdfBuffer);
        await svc.markSlipEmailSent(slip.id, slip.email);
        sent++;
      } catch (err) {
        await svc.markSlipEmailFailed(slip.id, slip.email || '', err.message);
        failures.push({ name: slip.first_name + ' ' + slip.last_name, error: err.message });
        failed++;
      }
    }

    // If all emails attempted, mark run as sent
    if (failed === 0 && skipped === 0) {
      await svc.markRunSent(req.params.runId, req.user.firm_id).catch(() => {});
    }

    // Notify the initiator with a send summary
    const periodLabel = `${MONTH_NAMES[run.month] || run.month} ${run.year}`;
    const summaryParts = [`${sent} sent`];
    if (failed  > 0) summaryParts.push(`${failed} failed`);
    if (skipped > 0) summaryParts.push(`${skipped} skipped`);
    dispatch({
      firmId:       req.user.firm_id,
      recipientIds: [req.user.id],
      type:    'payslip_bulk_sent',
      title:   'Payslip Emails Sent',
      message: `Bulk payslip email for ${periodLabel} complete: ${summaryParts.join(', ')}.`,
      link:    `/payroll/runs/${req.params.runId}`,
    }).catch(() => {});

    success(res, { sent, failed, skipped, failures },
      sent + ' payslips sent' + (failed > 0 ? ', ' + failed + ' failed' : ''));
  } catch (e) { apiError(res, e.message); }
};

async function db_skipSlip(slipId) {
  const db = require('../config/database');
  await db.query(`UPDATE salary_slips SET email_status='skipped' WHERE id=$1`, [slipId]);
}

// ── Resend single slip ────────────────────────────────────

exports.resendSlipEmail = async (req, res) => {
  try {
    const slip = await svc.getSlipById(req.params.slipId);
    if (!slip) return res.status(404).json({ message: 'Slip not found' });
    if (!slip.email) return res.status(400).json({ message: 'Employee has no email address' });

    const pdfBuffer = await pdfSvc.generateSlipPdf(slip);
    await emailSvc.sendPayslipEmail(slip.email, slip, pdfBuffer);
    await svc.markSlipEmailSent(slip.id, slip.email);
    success(res, null, 'Payslip resent to ' + slip.email);
  } catch (e) {
    await svc.markSlipEmailFailed(req.params.slipId, '', e.message).catch(() => {});
    apiError(res, e.message);
  }
};

// ── My Payslips (employee self-service) ───────────────────

exports.getMySlips = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const data = await svc.getMySlips(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
    success(res, data.data, 'OK');
    // Return with total for pagination
    res.json = undefined; // already sent
  } catch (e) { apiError(res, e.message); }
};

exports.getMySlipsPaginated = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const result = await svc.getMySlips(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
    res.json({ success: true, data: result.data, total: result.total });
  } catch (e) { apiError(res, e.message); }
};
