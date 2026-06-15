import apiClient from './apiClient';

export const authService = {
  async signIn({ email, password }) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data.data; // { accessToken, user }
  },

  async signOut(refreshToken) {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async refreshToken() {
    const { data } = await apiClient.post('/auth/refresh');
    return data.data;
  },

  async forgotPassword(email) {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token, password) {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  async getMe() {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },

  async changePassword(currentPassword, newPassword) {
    await apiClient.put('/auth/change-password', { currentPassword, newPassword });
  },

  async getLoginHistory() {
    const { data } = await apiClient.get('/auth/login-history');
    return data.data;
  },

  // ─── Firm ──────────────────────────────────────────────────────────────────

  async getFirm() {
    const { data } = await apiClient.get('/firms/me');
    return data.data;
  },

  async updateFirm(payload) {
    const { data } = await apiClient.put('/firms/me', payload);
    return data.data;
  },

  async uploadFirmLogo(file) {
    const form = new FormData();
    form.append('logo', file);
    const { data } = await apiClient.post('/firms/me/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data; // { logoUrl }
  },
};
