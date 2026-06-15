const router = require('express').Router();
const ctrl   = require('../controllers/timesheet.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');

router.use(auth, audit);

// ── Timesheets ────────────────────────────────────────────────────────────────
router.get   ('/',              ctrl.getAll);
router.get   ('/daily-hours',   ctrl.getDailyHours);
router.get   ('/pending-count', ctrl.getPendingCount);
router.post  ('/',              ctrl.create);
router.post  ('/submit',        ctrl.bulkSubmit);
router.delete('/:id',           ctrl.delete);

// ── Approvals (used by ApprovalQueue / ApprovalDetail pages) ─────────────────
router.get  ('/approvals',                      ctrl.getApprovals);
router.post ('/approvals/bulk',                 ctrl.bulkApproval);
router.patch('/approvals/:id/approve',          ctrl.approve);
router.patch('/approvals/:id/reject',           ctrl.reject);
router.patch('/approvals/:id/send-back',        ctrl.sendBack);
router.patch('/approvals/:id/final-approve',    ctrl.finalApprove);

// ── Legacy single-id routes (kept for backward compat) ───────────────────────
router.patch('/:id/approve',   ctrl.approve);
router.patch('/:id/reject',    ctrl.reject);

module.exports = router;
