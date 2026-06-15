const router = require('express').Router();
const ctrl   = require('../controllers/settings.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth);
router.get   ('/departments',        ctrl.getDepartments);
router.post  ('/departments',        requireRole('super_admin','hr'), ctrl.createDepartment);
router.put   ('/departments/:id',    requireRole('super_admin','hr'), ctrl.updateDepartment);
router.delete('/departments/:id',    requireRole('super_admin'), ctrl.deleteDepartment);

router.get   ('/branches',           ctrl.getBranches);
router.post  ('/branches',           requireRole('super_admin'), ctrl.createBranch);
router.put   ('/branches/:id',       requireRole('super_admin'), ctrl.updateBranch);

router.get   ('/branding',           ctrl.getBranding);
router.put   ('/branding',           requireRole('super_admin'), ctrl.updateBranding);

router.get   ('/theme',              ctrl.getTheme);
router.put   ('/theme',              requireRole('super_admin','partner','hr'), ctrl.updateTheme);

router.get   ('/roles',              ctrl.getRoles);
router.get   ('/leave-rules',        ctrl.getLeaveRules);
router.post  ('/leave-rules',        requireRole('super_admin','hr'), ctrl.upsertLeaveRule);

// Company policy — readable by all authenticated users, writable by super_admin only
router.get   ('/policy',             ctrl.getPolicy);
router.put   ('/policy',             requireRole('super_admin'), ctrl.updatePolicy);

// Email configuration — super_admin only
router.get   ('/email-config',       requireRole('super_admin'), ctrl.getEmailConfig);
router.put   ('/email-config',       requireRole('super_admin'), ctrl.updateEmailConfig);
router.post  ('/email-config/test',  requireRole('super_admin'), ctrl.testEmailConfig);

module.exports = router;
