import apiClient from './apiClient';

export const holidayService = {
  async getAll(params = {}) {
    const { data } = await apiClient.get('/holidays', { params });
    return data.data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/holidays', payload);
    return data.data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/holidays/${id}`, payload);
    return data.data;
  },
  async delete(id) {
    await apiClient.delete(`/holidays/${id}`);
  },
};
