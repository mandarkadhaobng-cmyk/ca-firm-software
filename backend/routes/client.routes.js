const router = require('express').Router();
const ctrl   = require('../controllers/client.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

router.use(auth, audit);
// Client list & detail: partner / super_admin / hr only
router.get   ('/',           requireRole('super_admin','partner','hr'), ctrl.getAll);
// Dropdown also accessible to managers (they need it when creating assignments)
router.get   ('/dropdown',   requireRole('super_admin','partner','hr','manager'), ctrl.getDropdown);
router.get   ('/:id',        requireRole('super_admin','partner','hr'), ctrl.getById);
router.post  ('/',           requireRole('super_admin','partner','manager'), ctrl.create);
router.put   ('/:id',        requireRole('super_admin','partner','manager'), ctrl.update);
router.delete('/:id',        requireRole('super_admin','partner'), ctrl.delete);
module.exports = router;
