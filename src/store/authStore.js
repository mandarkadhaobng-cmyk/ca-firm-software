import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { DASHBOARD_ROUTES } from '../constants/roles';
import { hasPermission as checkPermission } from '../constants/permissions';

/**
 * Auth store.
 *
 * `user` and `profile` are kept in sync — they always hold the same value.
 * `profile` is the legacy name used by many components; `user` is the preferred name.
 * Both are stored so destructuring either works without renaming every file.
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      profile:         null, // alias for user — always kept in sync
      accessToken:     null,
      isAuthenticated: false,
      isLoading:       false,

      setAccessToken: (token) => set({ accessToken: token }),

      setUser: (user) => set({ user, profile: user, isAuthenticated: !!user }),

      setProfile: (user) => {
        set({ user, profile: user, isAuthenticated: true });
      },

      login: async ({ email, password }) => {
        set({ isLoading: true });
        try {
          const result = await authService.signIn({ email, password });
          set({
            user:            result.user,
            profile:         result.user,
            accessToken:     result.accessToken,
            isAuthenticated: true,
            isLoading:       false,
          });
          return { profile: result.user, roleSlug: result.user.role };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await authService.signOut(); } catch { /* ignore */ }
        set({ user: null, profile: null, accessToken: null, isAuthenticated: false });
      },

      updateProfile: (updates) =>
        set((s) => ({
          user:    { ...s.user,    ...updates },
          profile: { ...s.profile, ...updates },
        })),

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return checkPermission(user.role, permission);
      },

      getRoleSlug: () => get().user?.role || 'employee',

      getDashboardRoute: () => {
        const role = get().user?.role || 'employee';
        return DASHBOARD_ROUTES[role] || '/dashboard/employee';
      },

      getFirmId: () => get().user?.firmId,
    }),
    {
      name: 'ca-auth',
      partialize: (s) => ({
        user:            s.user,
        profile:         s.profile,
        accessToken:     s.accessToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
