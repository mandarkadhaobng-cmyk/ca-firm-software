/**
 * Central Axios API client.
 * All frontend services import this instead of Supabase.
 */
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true, // send cookies (refresh token)
});

// ── Request interceptor — attach access token ────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401, refresh token ────────────────────────
let refreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  queue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      refreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        refreshing = false;
      }
    }

    // Show error toast — skip 401 (handled above), _silent requests, and
    // pure network errors (no response: connection refused, backend down, etc.)
    // because the calling code already catches and shows its own message.
    const isNetworkError = !err.response;
    if (!isNetworkError && err.response?.status !== 401 && !original?._silent) {
      const msg = err.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    }

    return Promise.reject(err);
  }
);

export default apiClient;
