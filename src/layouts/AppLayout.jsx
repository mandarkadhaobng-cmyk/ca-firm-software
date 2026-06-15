import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNotifications } from '../hooks/useNotifications';
import { useSocket } from '../hooks/useSocket';
import useUIStore from '../store/uiStore';

const AppLayout = () => {
  useNotifications(); // Legacy polling (optional fallback)
  useSocket();        // Socket.IO realtime notifications
  const fetchBranding = useUIStore(state => state.fetchBranding);
  const fetchTheme    = useUIStore(state => state.fetchTheme);

  useEffect(() => {
    fetchBranding();
    fetchTheme();   // Load & apply full theme from DB on startup
  }, [fetchBranding, fetchTheme]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--content-bg)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="content-root flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
        <footer className="flex-shrink-0 border-t border-border px-4 lg:px-6 py-2 flex items-center justify-end">
          <p className="text-xs text-text-secondary">
            Developed by{' '}
            <span className="font-medium text-text-primary italic">Mandar Kadhao</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
