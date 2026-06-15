import { create } from 'zustand';

/**
 * Notification store.
 *
 * Backend schema uses `read_at` (timestamp | null) instead of a boolean `is_read`.
 * A notification is "unread" when read_at IS NULL.
 */
const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount:   0,

  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.read_at).length,
  }),

  addNotification: (notification) => set((s) => ({
    notifications: [notification, ...s.notifications].slice(0, 100),
    unreadCount:   s.unreadCount + 1,
  })),

  markAsRead: (id) => set((s) => ({
    notifications: s.notifications.map(n =>
      n.id === id ? { ...n, read_at: new Date().toISOString() } : n
    ),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllAsRead: () => set((s) => {
    const now = new Date().toISOString();
    return {
      notifications: s.notifications.map(n => ({ ...n, read_at: n.read_at ?? now })),
      unreadCount:   0,
    };
  }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

export default useNotificationStore;
