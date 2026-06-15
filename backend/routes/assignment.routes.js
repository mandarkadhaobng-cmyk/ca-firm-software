const router = require('express').Router();
const ctrl   = require('../controllers/assignment.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

// All routes require authentication + audit logging
router.use(auth, audit);

// ─── Assignment Types ─────────────────────────────────────────────────────────
router.get   ('/types',     ctrl.getTypes);
router.post  ('/types',     requireRole('super_admin','partner','manager'), ctrl.createType);
router.put   ('/types/:id', requireRole('super_admin','partner','manager'), ctrl.updateType);

// ─── Utility ─────────────────────────────────────────────────────────────────
router.get('/stats',    ctrl.getStats);
router.get('/dropdown', ctrl.getDropdown);

// ─── Assignments ──────────────────────────────────────────────────────────────
router.get   ('/',    ctrl.getAll);
router.post  ('/',    requireRole('super_admin','partner','manager','hr'), ctrl.create);
router.get   ('/:id', ctrl.getById);
// Employees can update progress/status only (controller enforces field restrictions by role)
router.put   ('/:id', ctrl.update);
router.delete('/:id', requireRole('super_admin','partner'),                ctrl.remove);

// ─── Members ──────────────────────────────────────────────────────────────────
router.post  ('/:id/members',         requireRole('super_admin','partner','manager'), ctrl.addMember);
router.delete('/:id/members/:userId', requireRole('super_admin','partner'),           ctrl.removeMember);

module.exports = router;
