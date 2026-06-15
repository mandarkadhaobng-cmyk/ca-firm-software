const router = require('express').Router();
const ctrl   = require('../controllers/banner.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth);

// All authenticated users can view active banners (shown on dashboard)
router.get  ('/active',  ctrl.getActive);

// Admin / partner / hr can manage banners
router.get  ('/',        requireRole('super_admin','partner','hr'), ctrl.getAll);
router.post ('/',        requireRole('super_admin','partner','hr'), ctrl.create);
router.put  ('/:id',     requireRole('super_admin','partner','hr'), ctrl.update);
router.delete('/:id',   requireRole('super_admin','partner','hr'), ctrl.remove);

module.exports = router;
