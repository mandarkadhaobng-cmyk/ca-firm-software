const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/dailyLog.controller');

// All routes require authentication
router.use(auth);

// Anyone can view logs (scoped by role in controller)
router.get('/',           ctrl.getAll);
router.get('/:id',        ctrl.getById);

// Any employee can create their own log
router.post('/',          ctrl.create);

// Owner or admin can update
router.put('/:id',        ctrl.update);

// Admin/partner/hr can review
router.patch('/:id/review',
  requireRole('super_admin', 'partner', 'hr', 'manager'),
  ctrl.review
);

// Delete (controller enforces ownership)
router.delete('/:id',     ctrl.remove);

module.exports = router;
