export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PARTNER: 'partner',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  ARTICLE: 'article',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.PARTNER]: 'Partner',
  [ROLES.HR]: 'HR',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.ARTICLE]: 'Article',
};

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'bg-purple-100 text-purple-700',
  [ROLES.PARTNER]: 'bg-blue-100 text-blue-700',
  [ROLES.HR]: 'bg-pink-100 text-pink-700',
  [ROLES.MANAGER]: 'bg-green-100 text-green-700',
  [ROLES.EMPLOYEE]: 'bg-gray-100 text-gray-700',
  [ROLES.ARTICLE]: 'bg-orange-100 text-orange-700',
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 6,
  [ROLES.PARTNER]: 5,
  [ROLES.HR]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.EMPLOYEE]: 2,
  [ROLES.ARTICLE]: 1,
};

export const DASHBOARD_ROUTES = {
  [ROLES.SUPER_ADMIN]: '/dashboard/admin',
  [ROLES.PARTNER]: '/dashboard/partner',
  [ROLES.HR]: '/dashboard/hr',
  [ROLES.MANAGER]: '/dashboard/manager',
  [ROLES.EMPLOYEE]: '/dashboard/employee',
  [ROLES.ARTICLE]: '/dashboard/employee',
};
