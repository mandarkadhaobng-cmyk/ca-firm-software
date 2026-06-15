import api from '../../services/apiClient';

// ── Salary Config ─────────────────────────────────────────
export const getSalaryConfig    = (userId)  => api.get('/payroll/salary-config/' + userId).then(r => r.data.data);
export const upsertSalaryConfig = (userId, data) => api.put('/payroll/salary-config/' + userId, data).then(r => r.data.data);
export const listEmployeeSalaries = ()      => api.get('/payroll/employees/salaries').then(r => r.data.data);

// ── Payroll Runs ──────────────────────────────────────────
export const listRuns        = (params) => api.get('/payroll/runs', { params }).then(r => r.data.data);
export const getOrCreateRun  = (month, year) => api.post('/payroll/runs', { month, year }).then(r => r.data.data);
export const getRun          = (runId)  => api.get('/payroll/runs/' + runId).then(r => r.data.data);
export const updateWorkingDays = (runId, workingDays) =>
  api.patch('/payroll/runs/' + runId + '/working-days', { workingDays }).then(r => r.data.data);

// ── Slips ─────────────────────────────────────────────────
export const generateSlips = (runId)         => api.post('/payroll/runs/' + runId + '/generate').then(r => r.data.data);
export const getRunSlips   = (runId)         => api.get('/payroll/runs/' + runId + '/slips').then(r => r.data.data);
export const updateSlip    = (slipId, data)  => api.patch('/payroll/slips/' + slipId, data).then(r => r.data.data);

// ── Approval & Send ───────────────────────────────────────
export const approveRun    = (runId)         => api.post('/payroll/runs/' + runId + '/approve').then(r => r.data.data);
export const sendBulkEmails = (runId, slipIds) =>
  api.post('/payroll/runs/' + runId + '/send-emails', { slipIds }, { timeout: 120000 }).then(r => r.data);
export const resendSlipEmail = (slipId)      => api.post('/payroll/slips/' + slipId + '/resend').then(r => r.data);

// ── PDF ───────────────────────────────────────────────────
export const downloadSlipPdf = async (slipId, empName, month, year) => {
  const response = await api.get('/payroll/slips/' + slipId + '/pdf', { responseType: 'blob' });
  const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href  = url;
  link.download = 'Payslip_' + (empName || '') + '_' + (month || '') + '_' + (year || '') + '.pdf';
  link.click();
  window.URL.revokeObjectURL(url);
};

// ── My Payslips ───────────────────────────────────────────
export const getMySlips = (params) => api.get('/payroll/my-slips', { params }).then(r => r.data);
