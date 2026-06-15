const router = require('express').Router();
const ctrl   = require('../controllers/leave.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

router.use(auth, audit);

router.get   ('/',              ctrl.getAll);
router.get   ('/balance',       ctrl.getBalance);
router.get   ('/pending-count', requireRole('super_admin','partner','hr','manager'), ctrl.getPendingCount);
router.post  ('/',              ctrl.apply);
router.patch ('/:id/approve',   requireRole('super_admin','partner','manager','hr'), ctrl.approve);
router.patch ('/:id/reject',    requireRole('super_admin','partner','manager','hr'), ctrl.reject);
router.patch ('/:id/cancel',    ctrl.cancel);

module.exports = router;
