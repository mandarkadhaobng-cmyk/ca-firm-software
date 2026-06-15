import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Building2, Briefcase, Clock, CheckSquare,
  Bell, Calendar, BarChart3, Settings, Palette, ChevronLeft, ChevronRight, ChevronDown,
  LogOut, X, Umbrella, Megaphone, FileText, UserSquare2, Rss,
  ClipboardList, BookOpen, CalendarCheck,
  Banknote, Receipt, Network, Building, Users2,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import useNotificationStore from '../store/notificationStore';
import { usePermissions } from '../hooks/usePermissions';
import { fullName, getInitials } from '../utils/formatters';
import { ROLE_LABELS } from '../constants/roles';
import { leaveService } from '../services/leaveService';

// ── Nav structure ────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    single: true,
  },
  {
    key: 'hrms',
    label: 'HRMS',
    icon: Users,
    children: [
      { path: '/employees',        icon: Users,         label: 'Employees',      permission: 'employees.view' },
      { path: '/partners',         icon: UserSquare2,   label: 'Partners',       roles: ['super_admin','partner','hr','manager'] },
      { path: '/clients',          icon: Building2,     label: 'Clients',        roles: ['super_admin','partner','hr'] },
      { path: '/leaves',           icon: Calendar,      label: 'Leaves',         exact: true },
      { path: '/leaves/approvals', icon: CalendarCheck, label: 'Leave Approvals',roles: ['super_admin','partner','hr','manager'] },
      { path: '/holidays',         icon: Umbrella,      label: 'Holidays' },
      { path: '/notices',          icon: Megaphone,     label: 'Notices' },
      { path: '/banners',          icon: Rss,           label: 'Announcements',  roles: ['super_admin','partner','hr'] },
      { path: '/notifications',    icon: Bell,          label: 'Notifications' },
      { path: '/settings/policy', icon: FileText,  label: 'Company Policy' },
    ],
  },
  {
    key: 'work',
    label: 'Work',
    icon: Briefcase,
    children: [
      { path: '/assignments',    icon: Briefcase,     label: 'Assignments',  permission: 'assignments.view' },
      { path: '/daily-logs',     icon: ClipboardList, label: 'Daily Log' },
      { path: '/weekly-reports', icon: BookOpen,      label: 'Weekly Report' },
      { path: '/timesheets',     icon: Clock,         label: 'Timesheets' },
      { path: '/approvals',      icon: CheckSquare,   label: 'Approvals',    permission: 'timesheets.approve' },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    icon: Banknote,
    children: [
      { path: '/payroll',     icon: Banknote, label: 'Payroll Runs', roles: ['super_admin','partner','hr'] },
      { path: '/my-payslips', icon: Receipt,  label: 'My Payslips' },
    ],
  },
  {
    key: 'organization',
    label: 'Organization',
    icon: Network,
    children: [
      { path: '/organization',             icon: Users2,   label: 'Directory & Hierarchy', exact: true },
      { path: '/organization/departments', icon: Building, label: 'Departments', roles: ['super_admin','partner','hr'] },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    single: true,
    permission: 'reports.view',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['super_admin','partner','hr'],
    children: [
      { path: '/settings',            icon: Settings,  label: 'Firm Settings',  permission: 'settings.view' },
      { path: '/settings/appearance', icon: Palette,   label: 'Appearance',     roles: ['super_admin','partner','hr'] },
      { path: '/settings/user-access',icon: Users,     label: 'User Access',    roles: ['super_admin','partner'] },
      { path: '/settings/notifications', icon: Bell,   label: 'Notifications',  roles: ['super_admin','partner','hr'] },
      { path: '/settings/departments',icon: Building2, label: 'Departments',    roles: ['super_admin','partner','hr'] },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const { profile, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, closeMobileSidebar, branding } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const { can, roleSlug } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter a single item by role/permission
  const filterItem = (item) => {
    if (item.roles && !item.roles.includes(roleSlug)) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  };

  const getVisibleChildren = (group) =>
    group.children ? group.children.filter(filterItem) : [];

  // Which groups are visible to this user?
  const visibleGroups = NAV_GROUPS.filter((group) => {
    // Group-level role restriction (e.g. Settings only for hr+)
    if (group.roles && !group.roles.includes(roleSlug)) return false;
    if (group.single) return filterItem(group);
    return getVisibleChildren(group).length > 0;
  });

  // Which group key contains the current route?
  const getActiveGroupKey = () => {
    const path = location.pathname;
    for (const group of NAV_GROUPS) {
      if (group.single) {
        if (group.key === 'dashboard' && (path === '/' || path === '/dashboard')) return group.key;
        if (group.path && group.key !== 'dashboard' && path.startsWith(group.path)) return group.key;
      } else {
        const children = getVisibleChildren(group);
        for (const child of children) {
          const matches = child.exact ? path === child.path : path.startsWith(child.path);
          if (matches) return group.key;
        }
      }
    }
    return null;
  };

  const [openGroups, setOpenGroups] = useState(() => {
    const active = getActiveGroupKey();
    return active ? new Set([active]) : new Set();
  });

  // Auto-open the active group on route change (accordion: only one open at a time)
  useEffect(() => {
    const active = getActiveGroupKey();
    if (active) {
      setOpenGroups((prev) => {
        if (prev.has(active) && prev.size === 1) return prev; // already the only open one
        return new Set([active]); // close all others, open the active
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Accordion: opening a group closes all others (except the active-route group)
  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      if (prev.has(key)) {
        // Clicking the open group closes it
        const next = new Set(prev);
        next.delete(key);
        return next;
      }
      // Opening a new group: keep only this one open
      // (the active-route group will auto-reopen via the useEffect above if navigating)
      return new Set([key]);
    });
  };

  // Pending leave count badge
  const isApprover = ['super_admin','partner','hr','manager'].includes(roleSlug);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  useEffect(() => {
    if (!isApprover) return;
    leaveService.getPendingCount().then((n) => setPendingLeaves(n)).catch(() => {});
    const t = setInterval(() => {
      leaveService.getPendingCount().then((n) => setPendingLeaves(n)).catch(() => {});
    }, 120_000);
    return () => clearInterval(t);
  }, [isApprover]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderSingleItem = (group) => {
    const Icon = group.icon;
    return (
      <NavLink
        key={group.key}
        to={group.path}
        end={group.key === 'dashboard'}
        onClick={closeMobileSidebar}
        className={({ isActive }) =>
          `s-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium group relative
          ${isActive ? 's-active' : ''}`
        }
      >
        <Icon size={18} className="flex-shrink-0" />
        {!sidebarCollapsed && <span className="flex-1">{group.label}</span>}
        {sidebarCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1
            bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-50
            opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            {group.label}
          </div>
        )}
      </NavLink>
    );
  };

  const renderCollapsedGroup = (group) => {
    const Icon = group.icon;
    const isActiveGroup = getActiveGroupKey() === group.key;
    const children = getVisibleChildren(group);

    return (
      <div key={group.key} className="relative group">
        <button
          className={`s-group-btn w-full flex items-center justify-center px-3 py-2.5 rounded-lg
            ${isActiveGroup ? 's-group-active' : ''}`}
        >
          <Icon size={18} />
        </button>
        {/* Hover flyout */}
        <div className="absolute left-full top-0 ml-2 z-50
          opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto
          transition-opacity duration-150">
          <div className="bg-gray-900 text-white rounded-lg py-1 min-w-[160px] shadow-xl">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-700 uppercase tracking-wide">
              {group.label}
            </p>
            {children.map((child) => {
              const isNotif = child.path === '/notifications';
              const isLeaveApproval = child.path === '/leaves/approvals';
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  end={child.exact}
                  onClick={closeMobileSidebar}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-1.5 text-xs whitespace-nowrap transition-colors
                    ${isActive ? 'text-blue-300 font-medium' : 'text-gray-200 hover:text-white hover:bg-gray-800'}`
                  }
                >
                  <span>{child.label}</span>
                  {isNotif && unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {isLeaveApproval && pendingLeaves > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">
                      {pendingLeaves > 99 ? '99+' : pendingLeaves}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderExpandableGroup = (group) => {
    const Icon = group.icon;
    const isOpen = openGroups.has(group.key);
    const isActiveGroup = getActiveGroupKey() === group.key;
    const children = getVisibleChildren(group);

    return (
      <div key={group.key}>
        {/* Group header */}
        <button
          onClick={() => toggleGroup(group.key)}
          className={`s-group-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            ${isActiveGroup && !isOpen ? 's-group-active' : ''}`}
        >
          <Icon size={18} className="flex-shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Children */}
        {isOpen && (
          <div className="s-children-border mt-0.5 ml-4 pl-3 border-l-2 space-y-0.5 pb-1">
            {children.map((child) => {
              const ChildIcon = child.icon;
              const isNotif = child.path === '/notifications';
              const isLeaveApproval = child.path === '/leaves/approvals';
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  end={child.exact}
                  onClick={closeMobileSidebar}
                  className={({ isActive }) =>
                    `s-child-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                    ${isActive ? 's-active' : ''}`
                  }
                >
                  <ChildIcon size={15} className="flex-shrink-0" />
                  <span className="flex-1">{child.label}</span>
                  {isNotif && unreadCount > 0 && (
                    <span className="bg-error text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {isLeaveApproval && pendingLeaves > 0 && (
                    <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {pendingLeaves > 99 ? '99+' : pendingLeaves}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Sidebar body ───────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / firm header */}
      <div
        className={`flex items-center h-16 px-4 border-b flex-shrink-0
          ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo"
                style={{ height: '32px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }}
                className="rounded flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">CA</span>
              </div>
            )}
          </div>
        )}
        {sidebarCollapsed && (
          branding?.logo_url ? (
            <img src={branding.logo_url} alt="Logo"
              style={{ height: '32px', width: '32px', objectFit: 'contain' }}
              className="rounded flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">CA</span>
            </div>
          )
        )}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 text-text-secondary transition-colors flex-shrink-0"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button onClick={closeMobileSidebar}
          className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-text-secondary">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleGroups.map((group) => {
          if (group.single) return renderSingleItem(group);
          if (sidebarCollapsed) return renderCollapsedGroup(group);
          return renderExpandableGroup(group);
        })}
      </nav>

      {/* User profile / logout */}
      <div
        className={`p-3 border-t flex-shrink-0
          ${sidebarCollapsed ? 'flex justify-center' : ''}`}
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-semibold">
                {getInitials(fullName(profile))}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{fullName(profile)}</p>
              <p className="text-xs text-text-secondary truncate">
                {ROLE_LABELS[profile?.role || profile?.roles?.slug] || 'Employee'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-red-50 text-text-secondary hover:text-error transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-red-50 text-text-secondary hover:text-error transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={`sidebar-root hidden lg:flex flex-col border-r transition-all duration-300 flex-shrink-0
          ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeMobileSidebar} />
          <aside className="sidebar-root absolute left-0 top-0 h-full w-64 border-r z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
