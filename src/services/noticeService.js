import apiClient from './apiClient';

export const noticeService = {
  async getAll() {
    const { data } = await apiClient.get('/notices');
    return data.data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/notices', payload);
    return data.data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/notices/${id}`, payload);
    return data.data;
  },
  async delete(id) {
    await apiClient.delete(`/notices/${id}`);
  },
};
