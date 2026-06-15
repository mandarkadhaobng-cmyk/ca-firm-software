import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Simple accessor — use inside components to read auth state.
 * Session init is handled in AppRoutes.jsx (JWT-based, no Supabase).
 */
export const useAuth = () => useAuthStore();

/**
 * Redirects to /login if the user is not authenticated.
 * Use in protected layout components.
 */
export const useRequireAuth = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);
};
