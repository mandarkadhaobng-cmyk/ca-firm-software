const router = require('express').Router();
const ctrl   = require('../controllers/report.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth, requireRole('super_admin','partner','hr'));
router.get('/dashboard',    ctrl.dashboard);
router.get('/overview',     ctrl.dashboard);      // alias used by SuperAdminDashboard
router.get('/departments',  ctrl.departments);
router.get('/utilization',  ctrl.utilization);
router.get('/client-hours', ctrl.clientHours);
router.get('/billable',     ctrl.billable);
router.get('/leaves',       ctrl.leaveReport);
module.exports = router;
