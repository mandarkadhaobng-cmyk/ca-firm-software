import apiClient from './apiClient';
import { cache } from '../utils/cache';

export const settingsService = {
  // Departments
  async getDepartments() {
    return cache.wrap('departments', async () => {
      const { data } = await apiClient.get('/settings/departments');
      return data.data;
    }, 300);
  },
  async createDepartment(payload) {
    const { data } = await apiClient.post('/settings/departments', payload);
    cache.invalidate('departments');
    return data.data;
  },
  async updateDepartment(id, payload) {
    const { data } = await apiClient.put(`/settings/departments/${id}`, payload);
    cache.invalidate('departments');
    return data.data;
  },
  async deleteDepartment(id) {
    await apiClient.delete(`/settings/departments/${id}`);
    cache.invalidate('departments');
  },

  // Branches
  async getBranches() {
    return cache.wrap('branches', async () => {
      const { data } = await apiClient.get('/settings/branches');
      return data.data;
    }, 300);
  },
  async createBranch(payload) {
    const { data } = await apiClient.post('/settings/branches', payload);
    cache.invalidate('branches');
    return data.data;
  },
  async updateBranch(id, payload) {
    const { data } = await apiClient.put(`/settings/branches/${id}`, payload);
    cache.invalidate('branches');
    return data.data;
  },

  // Branding
  async getBranding() {
    return cache.wrap('branding', async () => {
      const { data } = await apiClient.get('/settings/branding');
      return data.data;
    }, 600);
  },
  async updateBranding(payload) {
    const { data } = await apiClient.put('/settings/branding', payload);
    cache.invalidate('branding');
    return data.data ?? payload; // fall back to local payload so UIStore always gets something
  },

  // Roles & Leave Rules
  async getRoles() {
    const { data } = await apiClient.get('/settings/roles');
    return data.data;
  },
  async getLeaveRules() {
    const { data } = await apiClient.get('/settings/leave-rules');
    return data.data;
  },
  async upsertLeaveRule(payload) {
    const { data } = await apiClient.post('/settings/leave-rules', payload);
    return data.data;
  },

  // Theme
  async getTheme() {
    return cache.wrap('firm_theme', async () => {
      const { data } = await apiClient.get('/settings/theme');
      return data.data || {};
    }, 300);
  },
  async updateTheme(payload) {
    const { data } = await apiClient.put('/settings/theme', payload);
    cache.invalidate('firm_theme');
    return data.data ?? payload;
  },

  // Company Policy
  async getPolicy() {
    return cache.wrap('company_policy', async () => {
      const { data } = await apiClient.get('/settings/policy');
      return data.data;
    }, 300);
  },
  async updatePolicy(policyText) {
    const { data } = await apiClient.put('/settings/policy', { policyText });
    cache.invalidate('company_policy');
    return data.data;
  },
};
