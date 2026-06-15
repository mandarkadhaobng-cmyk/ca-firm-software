const router = require('express').Router();
const ctrl   = require('../controllers/holiday.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

router.use(auth, audit);
router.get   ('/',     ctrl.getAll);
router.post  ('/',     requireRole('super_admin','hr','partner'), ctrl.create);
router.put   ('/:id',  requireRole('super_admin','hr','partner'), ctrl.update);
router.delete('/:id',  requireRole('super_admin','partner'),      ctrl.delete);
module.exports = router;
