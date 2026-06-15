const router = require('express').Router();
const ctrl   = require('../controllers/notification.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

router.use(auth, audit);
router.get  ('/',                    ctrl.getAll);
router.get  ('/unread-count',        ctrl.getUnreadCount);
router.patch('/read-all',            ctrl.markAllRead);
router.patch('/:id/read',            ctrl.markRead);
router.get  ('/configs',             requireRole('super_admin', 'hr'), ctrl.getConfigs);
router.put  ('/configs',             requireRole('super_admin', 'hr'), ctrl.updateConfig);
router.post ('/configs/bulk',        requireRole('super_admin', 'hr'), ctrl.bulkUpsertConfigs);
module.exports = router;
