import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const RoleRoute = ({ children, allowedRoles = [], requiredPermission = null }) => {
  const { profile, hasPermission } = useAuthStore();

  if (!profile) return <Navigate to="/login" replace />;

  // Support both flat `role` (from /me) and nested `roles.slug` (legacy shape)
  const roleSlug = profile?.role || profile?.roles?.slug;

  // super_admin always passes all route guards
  if (roleSlug === 'super_admin') return children;

  if (allowedRoles.length > 0 && !allowedRoles.includes(roleSlug)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
