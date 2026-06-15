import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronDown, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import useNotificationStore from '../store/notificationStore';
import { fullName, getInitials, formatTimeAgo } from '../utils/formatters';
import { ROLE_LABELS } from '../constants/roles';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employee Management',
  '/clients': 'Client Management',
  '/assignments': 'Assignment Management',
  '/timesheets': 'Timesheets',
  '/timesheets/entry': 'New Timesheet Entry',
  '/timesheets/weekly': 'Weekly View',
  '/approvals': 'Approval Queue',
  '/notifications': 'Notifications',
  '/leaves': 'Leave Management',
  '/leaves/apply': 'Apply Leave',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/payroll': 'Payroll',
  '/my-payslips': 'My Payslips',
  '/organization': 'Organization',
  '/organization/departments': 'Departments',
  '/settings/departments': 'Department Settings',
  '/settings/branding':     'Branding',
  '/settings/appearance':   'Appearance',
  '/settings/theme':        'Theme',
  '/settings/user-access':  'User Access',
  '/settings/notifications':'Notification Settings',
};

const Header = () => {
  const { profile, logout } = useAuthStore();
  const { toggleMobileSidebar, darkMode, toggleDarkMode } = useUIStore();
  const { notifications, unreadCount, markAsRead } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path) && path !== '/dashboard'
  )?.[1] || (location.pathname.includes('/dashboard') ? 'Dashboard' : 'CA Practice Manager');

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const recentNotifs = notifications.slice(0, 5);

  return (
    <header className="header-bar h-16 border-b flex items-center justify-between px-4 lg:px-6 flex-shrink-0"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 text-text-secondary"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-text-primary">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle — visible to all users */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="hover-gray p-2 rounded-md text-text-secondary transition-colors"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="hover-gray relative p-2 rounded-md text-text-secondary transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="dropdown-panel absolute right-0 top-full mt-1 w-80 rounded-lg shadow-modal border z-50 animate-slide-in"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <span className="font-semibold text-sm text-text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-primary font-medium">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <p className="text-center text-text-secondary text-sm py-8">No notifications</p>
                ) : (
                  recentNotifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { markAsRead(n.id); setShowNotifDropdown(false); navigate('/notifications'); }}
                      className={`hover-gray px-4 py-3 border-b last:border-0 cursor-pointer transition-colors
                        ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <p className={`text-sm font-medium text-text-primary ${!n.is_read ? 'font-semibold' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-text-secondary mt-1">{formatTimeAgo(n.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={() => { setShowNotifDropdown(false); navigate('/notifications'); }}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="hover-gray flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
          >
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary text-xs font-semibold">
                {getInitials(fullName(profile))}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-text-primary leading-tight">{fullName(profile)}</p>
              <p className="text-xs text-text-secondary">{ROLE_LABELS[profile?.role || profile?.roles?.slug]}</p>
            </div>
            <ChevronDown size={14} className="text-text-secondary hidden sm:block" />
          </button>

          {showUserDropdown && (
            <div className="dropdown-panel absolute right-0 top-full mt-1 w-52 rounded-lg shadow-modal border z-50 animate-slide-in"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-sm font-medium text-text-primary">{fullName(profile)}</p>
                <p className="text-xs text-text-secondary">{profile?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setShowUserDropdown(false); navigate('/settings'); }}
                  className="hover-gray flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary rounded-md"
                >
                  <Settings size={15} /> Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-red-50 rounded-md"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
