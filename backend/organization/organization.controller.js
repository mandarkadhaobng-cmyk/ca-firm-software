const orgService = require('./organization.service');
const { success } = require('../utils/response');

// ── Hierarchy ────────────────────────────────────────────

exports.getHierarchy = async (req, res) => {
  const data = await orgService.getHierarchy(req.user.firm_id);
  success(res, data);
};

exports.setReportsTo = async (req, res) => {
  const { employeeId } = req.params;
  const { reportsToId } = req.body;
  const rec = await orgService.setReportsTo(employeeId, reportsToId || null, req.user.firm_id, req.user.id);
  success(res, rec, 'Reporting line updated');
};

// ── Departments ──────────────────────────────────────────

exports.listDepartments = async (req, res) => {
  const depts = await orgService.listDepartments(req.user.firm_id);
  success(res, depts);
};

exports.createDepartment = async (req, res) => {
  const dept = await orgService.createDepartment({ ...req.body, firmId: req.user.firm_id }, req.user.id);
  success(res, dept, 'Department created');
};

exports.updateDepartment = async (req, res) => {
  const dept = await orgService.updateDepartment(req.params.id, req.body, req.user.firm_id);
  success(res, dept, 'Department updated');
};

exports.addDeptMember = async (req, res) => {
  const { departmentId } = req.params;
  const { employeeId, roleInDept } = req.body;
  const m = await orgService.addDeptMember(departmentId, employeeId, roleInDept);
  success(res, m, 'Member added to department');
};

exports.removeDeptMember = async (req, res) => {
  const { departmentId, employeeId } = req.params;
  await orgService.removeDeptMember(departmentId, employeeId);
  success(res, null, 'Member removed from department');
};

// ── Designations ─────────────────────────────────────────

exports.listDesignations = async (req, res) => {
  const desigs = await orgService.listDesignations(req.user.firm_id);
  success(res, desigs);
};

exports.createDesignation = async (req, res) => {
  const { title, level } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });
  const desig = await orgService.createDesignation(req.user.firm_id, title, level);
  success(res, desig, 'Designation saved');
};

// ── Directory ────────────────────────────────────────────

exports.getDirectory = async (req, res) => {
  const { search, departmentId, designationId } = req.query;
  const data = await orgService.getDirectory(req.user.firm_id, {
    search,
    departmentId: departmentId ? departmentId : undefined,
    designationId: designationId ? designationId : undefined,
  });
  success(res, data);
};

exports.updateDirectoryEntry = async (req, res) => {
  const { employeeId } = req.params;
  const entry = await orgService.upsertDirectoryEntry(
    employeeId, req.user.firm_id, req.body
  );
  success(res, entry, 'Directory entry updated');
};

// ── Partner mappings ─────────────────────────────────────

exports.getPartnerMappings = async (req, res) => {
  const { partnerId } = req.query;
  const data = await orgService.getPartnerMappings(
    req.user.firm_id,
    partnerId ? partnerId : undefined
  );
  success(res, data);
};

exports.setPartnerMapping = async (req, res) => {
  const { partnerId } = req.params;
  const { employeeIds } = req.body;
  if (!Array.isArray(employeeIds)) return res.status(400).json({ message: 'employeeIds must be an array' });
  const data = await orgService.setPartnerMapping(
    req.user.firm_id, req.params.partnerId, employeeIds, req.user.id
  );
  success(res, data, 'Partner mapping updated');
};
