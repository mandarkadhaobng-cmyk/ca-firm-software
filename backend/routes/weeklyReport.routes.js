const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/weeklyReport.controller');

router.use(auth);

// View reports (scoped by role in controller)
router.get('/',              ctrl.getAll);
router.get('/current',       ctrl.getCurrent);   // current user's current week
router.get('/:id',           ctrl.getById);

// Create/update (upsert) — any authenticated user for their own report
router.post('/',             ctrl.upsert);

// Review (admin/partner/hr/manager)
router.patch('/:id/review',
  requireRole('super_admin', 'partner', 'hr', 'manager'),
  ctrl.review
);

// Delete
router.delete('/:id',        ctrl.remove);

module.exports = router;
