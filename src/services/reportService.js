import apiClient from './apiClient';

/**
 * Normalize date-range params: the Reports page sends { from, to }
 * but the backend expects { fromDate, toDate }.
 */
const normalizeDateParams = (params = {}) => {
  const p = { ...params };
  if (p.from && !p.fromDate) { p.fromDate = p.from; delete p.from; }
  if (p.to   && !p.toDate)   { p.toDate   = p.to;   delete p.to;   }
  return p;
};

export const reportService = {
  async getDashboardStats() {
    const { data } = await apiClient.get('/reports/dashboard');
    return data.data;
  },
  async getUtilizationReport(params = {}) {
    const { data } = await apiClient.get('/reports/utilization', { params: normalizeDateParams(params) });
    return data.data;
  },
  async getClientHoursReport(params = {}) {
    const { data } = await apiClient.get('/reports/client-hours', { params: normalizeDateParams(params) });
    return data.data;
  },
  async getBillableReport(params = {}) {
    const { data } = await apiClient.get('/reports/billable', { params: normalizeDateParams(params) });
    return data.data;
  },
  async getLeaveReport(params = {}) {
    const { data } = await apiClient.get('/reports/leaves', { params: normalizeDateParams(params) });
    return data.data;
  },
};
