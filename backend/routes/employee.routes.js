const router = require('express').Router();
const ctrl   = require('../controllers/employee.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

router.use(auth, audit);

router.get   ('/',           ctrl.getAll);
router.get   ('/dropdown',   ctrl.getDropdown);
router.get   ('/:id',        ctrl.getById);
router.post  ('/',                   requireRole('super_admin','hr','partner'),       ctrl.create);
router.put   ('/:id',                requireRole('super_admin','hr','partner'),       ctrl.update);
router.patch ('/:id/deactivate',     requireRole('super_admin','hr','partner'),       ctrl.deactivate);
router.delete('/:id',                requireRole('super_admin','hr','partner'),       ctrl.remove);

// Account management
router.patch ('/:id/reset-password', requireRole('super_admin','partner','hr'),       ctrl.adminResetPassword);
router.patch ('/:id/change-email',   requireRole('super_admin','partner','hr'),       ctrl.adminChangeEmail);

module.exports = router;
