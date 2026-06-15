import apiClient from './apiClient';

/**
 * Approval service — wraps the timesheets/approvals REST endpoints.
 * All Supabase calls have been removed.
 */
export const approvalService = {
  /**
   * Pending approvals for the approval queue.
   * Backend scopes to the authenticated user's role automatically.
   */
  async getPending({ page = 1, pageSize = 15 } = {}) {
    const { data } = await apiClient.get('/timesheets/approvals', {
      params: { status: 'pending', page, pageSize },
    });
    return { data: data.data, count: data.pagination?.total ?? 0 };
  },

  /**
   * All approvals (with optional status filter) — for history/audit view.
   */
  async getAll({ status = '', page = 1, pageSize = 15 } = {}) {
    const { data } = await apiClient.get('/timesheets/approvals', {
      params: { status: status || undefined, page, pageSize },
    });
    return { data: data.data, count: data.pagination?.total ?? 0 };
  },

  async approve(approvalId, comments = '') {
    await apiClient.patch(`/timesheets/approvals/${approvalId}/approve`, { comments });
  },

  async reject(approvalId, comments = '') {
    await apiClient.patch(`/timesheets/approvals/${approvalId}/reject`, { comments });
  },

  async sendBack(approvalId, comments = '') {
    await apiClient.patch(`/timesheets/approvals/${approvalId}/send-back`, { comments });
  },

  /** Final approval (partner / super_admin level) */
  async finalApprove(approvalId, comments = '') {
    await apiClient.patch(`/timesheets/approvals/${approvalId}/final-approve`, { comments });
  },

  async bulkApprove(approvalIds, comments = '') {
    await apiClient.post('/timesheets/approvals/bulk', {
      action: 'approve',
      ids: approvalIds,
      comments,
    });
  },

  async bulkReject(approvalIds, comments = '') {
    await apiClient.post('/timesheets/approvals/bulk', {
      action: 'reject',
      ids: approvalIds,
      comments,
    });
  },

  async getById(approvalId) {
    const { data } = await apiClient.get(`/timesheets/approvals/${approvalId}`);
    return data.data;
  },
};
