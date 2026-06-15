import api from '../../services/apiClient';

// ── Hierarchy ────────────────────────────────────────────
export const getHierarchy   = () => api.get('/organization/hierarchy').then(r => r.data.data);
export const setReportsTo   = (employeeId, reportsToId) =>
  api.patch(`/organization/hierarchy/${employeeId}`, { reportsToId }).then(r => r.data.data);

// ── Departments ──────────────────────────────────────────
export const listDepartments  = () => api.get('/organization/departments').then(r => r.data.data);
export const createDepartment = (data) => api.post('/organization/departments', data).then(r => r.data.data);
export const updateDepartment = (id, data) => api.patch(`/organization/departments/${id}`, data).then(r => r.data.data);
export const addDeptMember    = (departmentId, employeeId, roleInDept) =>
  api.post(`/organization/departments/${departmentId}/members`, { employeeId, roleInDept }).then(r => r.data.data);
export const removeDeptMember = (departmentId, employeeId) =>
  api.delete(`/organization/departments/${departmentId}/members/${employeeId}`).then(r => r.data);

// ── Designations ─────────────────────────────────────────
export const listDesignations   = () => api.get('/organization/designations').then(r => r.data.data);
export const createDesignation  = (title, level) =>
  api.post('/organization/designations', { title, level }).then(r => r.data.data);

// ── Directory ────────────────────────────────────────────
export const getDirectory = (params) => api.get('/organization/directory', { params }).then(r => r.data.data);
export const updateDirectoryEntry = (employeeId, data) =>
  api.put(`/organization/directory/${employeeId}`, data).then(r => r.data.data);

// ── Partner mappings ─────────────────────────────────────
export const getPartnerMappings = (partnerId) =>
  api.get('/organization/partner-mappings', { params: { partnerId } }).then(r => r.data.data);
export const setPartnerMapping  = (partnerId, employeeIds) =>
  api.put(`/organization/partner-mappings/${partnerId}`, { employeeIds }).then(r => r.data.data);
