import { useEffect, useCallback } from 'react';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import { notificationService } from '../services/notificationService';

/**
 * useNotifications — loads notifications on mount and exposes store actions.
 *
 * Real-time push is handled separately by useSocket (Socket.IO),
 * which calls store.addNotification() when a new event arrives.
 */
export const useNotifications = () => {
  const store     = useNotificationStore();
  const { user }  = useAuthStore();

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await notificationService.getAll({ limit: 50 });
      // API returns { data: [...] } or just an array
      const list = Array.isArray(result) ? result : (result?.data ?? []);
      store.setNotifications(list);
    } catch (err) {
      console.error('[useNotifications] fetch failed:', err);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    ...store,
    refetch: fetchAll,
  };
};
