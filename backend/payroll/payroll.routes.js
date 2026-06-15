const router = require('express').Router();
const ctrl   = require('./payroll.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');
const multer = require('multer');

router.use(auth, audit);

const HR      = ['super_admin','partner','hr'];
const PARTNER = ['super_admin','partner'];

// ── Salary Config ─────────────────────────────────────────
router.get  ('/employees/salaries',          requireRole(...HR), ctrl.listEmployeeSalaries);
router.get  ('/salary-config/:userId',        requireRole(...HR), ctrl.getSalaryConfig);
router.put  ('/salary-config/:userId',        requireRole(...HR), ctrl.upsertSalaryConfig);

// ── Payroll Runs ──────────────────────────────────────────
router.get  ('/runs',                        requireRole(...HR), ctrl.listRuns);
router.post ('/runs',                        requireRole(...HR), ctrl.getOrCreateRun);
router.get  ('/runs/:runId',                 requireRole(...HR), ctrl.getRun);
router.patch('/runs/:runId/working-days',    requireRole(...HR), ctrl.updateRunWorkingDays);

// ── Slip Generation ───────────────────────────────────────
router.post ('/runs/:runId/generate',        requireRole(...HR), ctrl.generateSlips);
router.get  ('/runs/:runId/slips',           requireRole(...HR), ctrl.getRunSlips);
router.patch('/slips/:slipId',               requireRole(...HR), ctrl.updateSlip);

// ── Approval & Sending ────────────────────────────────────
router.post ('/runs/:runId/approve',         requireRole(...PARTNER), ctrl.approveRun);
router.post ('/runs/:runId/send-emails',     requireRole(...HR),      ctrl.sendBulkEmails);
router.post ('/slips/:slipId/resend',        requireRole(...HR),      ctrl.resendSlipEmail);

// ── PDF Download ──────────────────────────────────────────
router.get  ('/slips/:slipId/pdf',           ctrl.downloadSlipPdf);  // auth only, access check inside

// ── Employee self-service ─────────────────────────────────
router.get  ('/my-slips',                    ctrl.getMySlipsPaginated);

module.exports = router;
