import useAuthStore from '../store/authStore';
import { ROLE_HIERARCHY } from '../constants/roles';

export const usePermissions = () => {
  const { user, hasPermission } = useAuthStore();
  const roleSlug = user?.role || user?.roles?.slug || 'employee';

  // Check a single permission via the store helper
  const can = (permission) => {
    if (!user) return false;
    // super_admin always has all permissions
    if (roleSlug === 'super_admin') return true;
    return hasPermission(permission);
  };

  // Check if user has ANY of the given permissions
  const canAny = (...perms) => perms.some(p => can(p));

  // Role helpers
  const isRole = (slug) => roleSlug === slug;
  const isSuperAdmin = () => roleSlug === 'super_admin';
  const isPartnerOrAbove = () => (ROLE_HIERARCHY[roleSlug] || 0) >= (ROLE_HIERARCHY['partner'] || 5);
  const isManagerOrAbove = () => (ROLE_HIERARCHY[roleSlug] || 0) >= (ROLE_HIERARCHY['manager'] || 3);
  const isHR = () => roleSlug === 'hr';

  return { can, canAny, isRole, isSuperAdmin, isPartnerOrAbove, isManagerOrAbove, isHR, roleSlug };
};
