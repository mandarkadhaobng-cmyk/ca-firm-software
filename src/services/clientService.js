import apiClient from './apiClient';
import { cache } from '../utils/cache';

export const clientService = {
  async getAll(params = {}) {
    const { data } = await apiClient.get('/clients', { params });
    return data;
  },
  async getById(id) {
    const { data } = await apiClient.get(`/clients/${id}`);
    return data.data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/clients', payload);
    cache.invalidate('clients:dropdown');
    return data.data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/clients/${id}`, payload);
    cache.invalidate('clients:dropdown');
    return data.data;
  },
  async delete(id) {
    await apiClient.delete(`/clients/${id}`);
    cache.invalidate('clients:dropdown');
  },
  async getAllForSelect() {
    return cache.wrap('clients:dropdown', async () => {
      const { data } = await apiClient.get('/clients/dropdown');
      return data.data;
    }, 300);
  },
};
