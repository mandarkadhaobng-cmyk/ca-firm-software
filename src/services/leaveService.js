import apiClient from './apiClient';

export const leaveService = {
  async getAll(params = {}) {
    const { data } = await apiClient.get('/leaves', { params });
    return data; // { success, data: [...], pagination }
  },

  async apply(payload) {
    const { data } = await apiClient.post('/leaves', payload);
    return data.data;
  },

  /** Alias: some components call create() instead of apply() */
  async create(payload) {
    return this.apply(payload);
  },

  async approve(id, comment) {
    await apiClient.patch(`/leaves/${id}/approve`, { comment });
  },

  async reject(id, comment) {
    await apiClient.patch(`/leaves/${id}/reject`, { comment });
  },

  async cancel(id) {
    await apiClient.patch(`/leaves/${id}/cancel`);
  },

  /**
   * Get leave balance for the authenticated user.
   * Backend returns: [{ leave_type, total, used, remaining }]
   *
   * We flatten this into a single object so components can use:
   *   balance.casual          → used count   (LeaveApplication)
   *   balance.casual_total    → total days   (LeaveList)
   *   balance.casual_used     → used days    (LeaveList)
   *   balance.casual_remaining → remaining   (internal)
   */
  async getBalance() {
    const { data } = await apiClient.get('/leaves/balance');
    const rows = Array.isArray(data.data) ? data.data : [];
    const obj = {};
    rows.forEach((r) => {
      const t = r.leave_type;
      obj[t]                    = parseFloat(r.used)      || 0;
      obj[`${t}_total`]         = parseFloat(r.total)     || 0;
      obj[`${t}_used`]          = parseFloat(r.used)      || 0;
      obj[`${t}_remaining`]     = parseFloat(r.remaining) || 0;
    });
    return obj;
  },

  /** Alias: LeaveApplication calls getLeaveBalance(userId) — userId is ignored */
  async getLeaveBalance(_userId) {
    return this.getBalance();
  },

  async getPendingCount() {
    const { data } = await apiClient.get('/leaves/pending-count');
    return data.data?.count ?? 0;
  },
};
