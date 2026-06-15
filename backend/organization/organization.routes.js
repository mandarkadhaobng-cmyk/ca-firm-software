const router = require('express').Router();
const ctrl   = require('./organization.controller');
const auth   = require('../middleware/auth');
const audit  = require('../middleware/auditLog');
const { requireRole } = require('../middleware/rbac');

router.use(auth, audit);

const ADMIN = ['super_admin', 'partner', 'hr'];

// ── Hierarchy ────────────────────────────────────────────
router.get  ('/hierarchy',                     ctrl.getHierarchy);
router.patch('/hierarchy/:employeeId',          requireRole(...ADMIN), ctrl.setReportsTo);

// ── Departments ──────────────────────────────────────────
router.get  ('/departments',                   ctrl.listDepartments);
router.post ('/departments',                   requireRole(...ADMIN), ctrl.createDepartment);
router.patch('/departments/:id',               requireRole(...ADMIN), ctrl.updateDepartment);
router.post ('/departments/:departmentId/members',                requireRole(...ADMIN), ctrl.addDeptMember);
router.delete('/departments/:departmentId/members/:employeeId',  requireRole(...ADMIN), ctrl.removeDeptMember);

// ── Designations ─────────────────────────────────────────
router.get  ('/designations',                  ctrl.listDesignations);
router.post ('/designations',                  requireRole(...ADMIN), ctrl.createDesignation);

// ── Directory ────────────────────────────────────────────
router.get  ('/directory',                     ctrl.getDirectory);
router.put  ('/directory/:employeeId',          requireRole(...ADMIN), ctrl.updateDirectoryEntry);

// ── Partner ↔ employee mapping ───────────────────────────
router.get  ('/partner-mappings',              requireRole(...ADMIN), ctrl.getPartnerMappings);
router.put  ('/partner-mappings/:partnerId',   requireRole('super_admin', 'partner'), ctrl.setPartnerMapping);

module.exports = router;
