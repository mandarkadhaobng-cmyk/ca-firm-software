import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const AuthLayout = () => {
  const { isAuthenticated, getDashboardRoute } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={getDashboardRoute()} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
      <p className="text-xs text-text-secondary">
        Developed by <span className="font-medium italic">Mandar Kadhao</span>
      </p>
    </div>
  );
};

export default AuthLayout;
