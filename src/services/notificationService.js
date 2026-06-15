import apiClient from './apiClient';

export const notificationService = {
  async getAll(params = {}) {
    const { data } = await apiClient.get('/notifications', { params });
    return data.data;
  },
  async markAsRead(id) {
    await apiClient.patch(`/notifications/${id}/read`);
  },
  async markAllAsRead() {
    await apiClient.patch('/notifications/read-all');
  },
  async getConfigs() {
    const { data } = await apiClient.get('/notifications/configs');
    return data.data;
  },
  async updateConfig(payload) {
    await apiClient.put('/notifications/configs', payload);
  },
  // Bulk upsert for NotificationSettings page
  async upsertConfigs(configs) {
    await apiClient.post('/notifications/configs/bulk', { configs });
  },
  async getUnreadCount() {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data.data?.count ?? 0;
  },
};
