/**
 * Role-Permission Matrix
 * Stored here for runtime checks; also synced to DB for dynamic editing.
 */
const PERMISSIONS = {
  // Employees
  'employees.view':    ['super_admin','partner','hr','manager'],
  'employees.create':  ['super_admin','hr'],
  'employees.edit':    ['super_admin','hr'],
  'employees.delete':  ['super_admin'],

  // Clients
  'clients.view':      ['super_admin','partner','hr','manager','employee'],
  'clients.create':    ['super_admin','partner','manager'],
  'clients.edit':      ['super_admin','partner','manager'],
  'clients.delete':    ['super_admin','partner'],

  // Assignments
  'assignments.view':  ['super_admin','partner','hr','manager','employee'],
  'assignments.create':['super_admin','partner','manager'],
  'assignments.edit':  ['super_admin','partner','manager'],
  'assignments.delete':['super_admin','partner'],

  // Timesheets
  'timesheets.view':   ['super_admin','partner','hr','manager','employee'],
  'timesheets.create': ['super_admin','partner','manager','employee'],
  'timesheets.approve':['super_admin','partner','manager'],
  'timesheets.reject': ['super_admin','partner','manager'],

  // Leaves
  'leaves.view':       ['super_admin','partner','hr','manager','employee'],
  'leaves.apply':      ['super_admin','partner','hr','manager','employee'],
  'leaves.approve':    ['super_admin','partner','hr','manager'],
  'leaves.reject':     ['super_admin','partner','hr','manager'],

  // HR
  'hr.dashboard':      ['super_admin','partner','hr'],
  'hr.onboarding':     ['super_admin','hr'],
  'hr.offboarding':    ['super_admin','hr'],

  // Holidays & Notices
  'holidays.view':     ['super_admin','partner','hr','manager','employee'],
  'holidays.manage':   ['super_admin','partner','hr'],
  'notices.view':      ['super_admin','partner','hr','manager','employee'],
  'notices.manage':    ['super_admin','hr'],

  // Reports
  'reports.view':      ['super_admin','partner','hr'],
  'reports.export':    ['super_admin','partner'],

  // Settings
  'settings.view':     ['super_admin','partner'],
  'settings.manage':   ['super_admin'],

  // Notifications
  'notifications.manage': ['super_admin'],
};

const hasPermission = (role, permission) => {
  if (role === 'super_admin') return true;
  return (PERMISSIONS[permission] || []).includes(role);
};

module.exports = { PERMISSIONS, hasPermission };
