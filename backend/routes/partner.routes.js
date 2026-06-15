const router = require('express').Router();
const ctrl   = require('../controllers/partner.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth);

// All authenticated users can see the partner list (for dropdowns, contact info, etc.)
router.get  ('/',    ctrl.getAll);
router.get  ('/:id', ctrl.getById);

// Only super_admin can create / update partners
router.post ('/',    requireRole('super_admin'), ctrl.create);
router.put  ('/:id', requireRole('super_admin'), ctrl.update);

module.exports = router;
