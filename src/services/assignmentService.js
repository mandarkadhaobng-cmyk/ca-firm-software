import apiClient from './apiClient';
import { cache } from '../utils/cache';

/**
 * Assignment service — wraps the /assignments REST endpoints.
 * All Supabase calls have been removed.
 */
export const assignmentService = {
  async getAll({
    search = '', status = '', clientId = '', managerId = '',
    priority = '',
    page = 1, pageSize = 15, userId = null,
    overdue = false,
  } = {}) {
    const { data } = await apiClient.get('/assignments', {
      params: {
        search:    search    || undefined,
        status:    status    || undefined,
        clientId:  clientId  || undefined,
        managerId: managerId || undefined,
        priority:  priority  || undefined,
        userId:    userId    || undefined,
        overdue:   overdue   || undefined,
        page,
        limit:     pageSize,
      },
    });
    return {
      data:  data.data,
      count: data.pagination?.total ?? 0,
    };
  },

  async getById(id) {
    const { data } = await apiClient.get(`/assignments/${id}`);
    return data.data;
  },

  async create(assignmentData) {
    const { data } = await apiClient.post('/assignments', assignmentData);
    cache.invalidate('assignments:user:');
    return data.data;
  },

  async update(id, updates) {
    const { data } = await apiClient.put(`/assignments/${id}`, updates);
    cache.invalidate('assignments:user:');
    return data.data;
  },

  async delete(id) {
    await apiClient.delete(`/assignments/${id}`);
    cache.invalidate('assignments:user:');
  },

  async updateStatus(id, status) {
    const { data } = await apiClient.patch(`/assignments/${id}/status`, { status });
    cache.invalidate('assignments:user:');
    return data.data;
  },

  async addMember(assignmentId, userId, allocatedHours = 0) {
    const { data } = await apiClient.post(`/assignments/${assignmentId}/members`, {
      userId, allocatedHours,
    });
    return data.data;
  },

  async removeMember(assignmentId, userId) {
    await apiClient.delete(`/assignments/${assignmentId}/members/${userId}`);
  },

  /** Cached per user for 2 min — shown on dashboards. */
  async getAssignmentsForUser(userId, firmId) {
    return cache.wrap(
      `assignments:user:${userId}:${firmId}`,
      async () => {
        // Fetch active (non-completed, non-cancelled) assignments for this user.
        // No status filter — backend scopes to employee's own assignments via JWT role.
        const { data } = await apiClient.get('/assignments', {
          params: { pageSize: 50 },
        });
        // Filter out completed/closed/cancelled client-side for the dashboard view
        const rows = data.data ?? [];
        return rows.filter(a => !['completed', 'closed', 'cancelled'].includes(a.status));
      },
      120 // 2 minutes
    );
  },

  async getOverdue() {
    return this.getAll({ overdue: true });
  },

  /** Cached 10 min — assignment types rarely change. */
  async getAllTypes() {
    return cache.wrap(
      'assignment_types',
      async () => {
        const { data } = await apiClient.get('/assignments/types');
        return data.data ?? [];
      },
      600
    );
  },

  async getStats() {
    const { data } = await apiClient.get('/assignments/stats');
    return data.data;
  },

  async getDropdown() {
    const { data } = await apiClient.get('/assignments/dropdown');
    return data.data ?? [];
  },
};
