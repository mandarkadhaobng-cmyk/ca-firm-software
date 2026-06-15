import apiClient from './apiClient';
import { cache } from '../utils/cache';

export const employeeService = {
  async getAll(params = {}) {
    const { data } = await apiClient.get('/employees', { params });
    return data;
  },
  async getById(id) {
    const { data } = await apiClient.get(`/employees/${id}`);
    return data.data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/employees', payload);
    cache.invalidate('employees:dropdown');
    return data.data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/employees/${id}`, payload);
    cache.invalidate('employees:dropdown');
    return data.data;
  },
  async deactivate(id) {
    await apiClient.patch(`/employees/${id}/deactivate`);
    cache.invalidate('employees:dropdown');
  },
  async getDropdown() {
    return cache.wrap('employees:dropdown', async () => {
      const { data } = await apiClient.get('/employees/dropdown');
      return data.data ?? [];
    }, 120);
  },
  // Alias used by some components
  async getAllForSelect() {
    return this.getDropdown();
  },
  async getDepartments() {
    const { settingsService } = await import('./settingsService');
    return settingsService.getDepartments();
  },
  async getManagers() {
    return cache.wrap('employees:managers', async () => {
      // Show all active employees as potential reporting managers.
      // In a fresh DB only the admin exists — filtering by roleSlug='manager'
      // would return nothing, leaving the dropdown empty.
      const { data } = await apiClient.get('/employees', {
        params: { status: 'active', pageSize: 200 },
      });
      return data.data ?? [];
    }, 120);
  },

  /** Super-admin: permanently delete a user */
  async remove(id) {
    await apiClient.delete(`/employees/${id}`);
    cache.invalidate('employees:dropdown');
  },

  // ── Admin account-management actions ────────────────────────────────────────

  /** Admin: force-reset another user's password */
  async adminResetPassword(userId, newPassword) {
    const { data } = await apiClient.patch(`/employees/${userId}/reset-password`, { password: newPassword });
    return data;
  },

  /** Admin: change another user's login email */
  async adminChangeEmail(userId, newEmail) {
    const { data } = await apiClient.patch(`/employees/${userId}/change-email`, { email: newEmail });
    return data;
  },
};
