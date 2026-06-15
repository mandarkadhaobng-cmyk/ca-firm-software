import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { authService } from '../services/authService';
import useAuthStore from '../store/authStore';

const DASHBOARD_ROUTES = {
  super_admin: '/dashboard/admin',
  partner:     '/dashboard/partner',
  manager:     '/dashboard/manager',
  hr:          '/dashboard/hr',
  employee:    '/dashboard/employee',
};

// Redirects to the correct dashboard based on the logged-in user's role
const DashboardRedirect = () => {
  const { profile } = useAuthStore();
  const role = profile?.role || profile?.roles?.slug || 'employee';
  return <Navigate to={DASHBOARD_ROUTES[role] || '/dashboard/employee'} replace />;
};

// Auth pages
const Login          = lazy(() => import('../auth/Login'));
const ForgotPassword = lazy(() => import('../auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('../auth/ResetPassword'));

// Dashboards
const SuperAdminDashboard = lazy(() => import('../dashboard/SuperAdminDashboard'));
const PartnerDashboard    = lazy(() => import('../dashboard/PartnerDashboard'));
const ManagerDashboard    = lazy(() => import('../dashboard/ManagerDashboard'));
const EmployeeDashboard   = lazy(() => import('../dashboard/EmployeeDashboard'));
const HRDashboard         = lazy(() => import('../dashboard/HRDashboard'));

// Partners
const PartnerList = lazy(() => import('../partners/PartnerList'));

// Modules
const EmployeeList   = lazy(() => import('../employees/EmployeeList'));
const EmployeeForm   = lazy(() => import('../employees/EmployeeForm'));
const EmployeeDetail = lazy(() => import('../employees/EmployeeDetail'));

const ClientList = lazy(() => import('../clients/ClientList'));
const ClientForm = lazy(() => import('../clients/ClientForm'));

const AssignmentList   = lazy(() => import('../assignments/AssignmentList'));
const AssignmentForm   = lazy(() => import('../assignments/AssignmentForm'));
const AssignmentDetail = lazy(() => import('../assignments/AssignmentDetail'));
const DailyLog         = lazy(() => import('../assignments/DailyLog'));
const WeeklyReport     = lazy(() => import('../assignments/WeeklyReport'));

const TimesheetEntry      = lazy(() => import('../timesheets/TimesheetEntry'));
const TimesheetList       = lazy(() => import('../timesheets/TimesheetList'));
const TimesheetWeeklyView = lazy(() => import('../timesheets/TimesheetWeeklyView'));

const ApprovalQueue  = lazy(() => import('../approvals/ApprovalQueue'));
const ApprovalDetail = lazy(() => import('../approvals/ApprovalDetail'));

const NotificationList = lazy(() => import('../notifications/NotificationList'));

const LeaveApplication = lazy(() => import('../leaves/LeaveApplication'));
const LeaveList        = lazy(() => import('../leaves/LeaveList'));
const LeaveApproval    = lazy(() => import('../leaves/LeaveApproval'));

const HolidaysPage = lazy(() => import('../holidays/HolidaysPage'));
const NoticesPage  = lazy(() => import('../notices/NoticesPage'));

const ReportsDashboard = lazy(() => import('../reports/ReportsDashboard'));

const FirmSettings         = lazy(() => import('../settings/FirmSettings'));
const DepartmentSettings   = lazy(() => import('../settings/DepartmentSettings'));
const BrandingSettings     = lazy(() => import('../settings/BrandingSettings'));
const NotificationSettings = lazy(() => import('../settings/NotificationSettings'));
const UserAccessSettings   = lazy(() => import('../settings/UserAccessSettings'));
const PolicySettings       = lazy(() => import('../settings/PolicySettings'));
const ThemeSettings        = lazy(() => import('../settings/ThemeSettings'));
const AppearanceSettings   = lazy(() => import('../settings/AppearanceSettings'));
const BannerManagement     = lazy(() => import('../banners/BannerManagement'));

const Unauthorized = lazy(() => import('../components/common/Unauthorized'));
// Payroll
const PayrollDashboard = lazy(() => import('../payroll/pages/PayrollDashboard'));
const PayrollRunDetail = lazy(() => import('../payroll/pages/PayrollRunDetail'));
const MyPayslips       = lazy(() => import('../payroll/pages/MyPayslips'));
const SalaryConfig     = lazy(() => import('../payroll/pages/SalaryConfig'));
const SalaryManager    = lazy(() => import('../payroll/pages/SalaryManager'));

// Organization — OrgDirectory is now the unified page (directory + hierarchy toggle)
const OrgDirectory       = lazy(() => import('../organization/pages/OrgDirectory'));
const DepartmentManager  = lazy(() => import('../organization/pages/DepartmentManager'));


const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>{children}</Suspense>
);

const Splash = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
      <span className="text-white text-2xl font-bold">CA</span>
    </div>
    <Loader2 size={22} className="animate-spin text-primary" />
    <p className="text-sm text-text-secondary">Loading your workspace…</p>
  </div>
);

const AppRoutes = () => {
  const { accessToken, setProfile, setAccessToken, logout } = useAuthStore();
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // accessToken comes from Zustand persisted state (stored under 'ca-auth' in localStorage)
      if (accessToken) {
        try {
          const profile = await authService.getMe();
          setProfile(profile);
        } catch {
          // Access token expired — try silent refresh via httpOnly cookie
          try {
            const result = await authService.refreshToken();
            setAccessToken(result.accessToken);
            const profile = await authService.getMe();
            setProfile(profile);
          } catch {
            logout();
          }
        }
      }
      setReady(true);
    };

    init();
  }, []); // eslint-disable-line

  if (!ready) return <Splash />;

  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login"           element={<SuspenseWrapper><Login /></SuspenseWrapper>} />
        <Route path="/forgot-password"      element={<SuspenseWrapper><ForgotPassword /></SuspenseWrapper>} />
        <Route path="/reset-password/:token" element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
        {/* Fallback for links without token — shows a friendly error */}
        <Route path="/reset-password"        element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
      </Route>

      {/* Protected */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboards */}
        <Route path="/dashboard">
          <Route index element={<DashboardRedirect />} />
          <Route path="admin" element={
            <RoleRoute allowedRoles={['super_admin']}>
              <SuspenseWrapper><SuperAdminDashboard /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="partner" element={
            <RoleRoute allowedRoles={['partner', 'super_admin']}>
              <SuspenseWrapper><PartnerDashboard /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="manager" element={
            <RoleRoute allowedRoles={['manager', 'partner', 'super_admin']}>
              <SuspenseWrapper><ManagerDashboard /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="hr" element={
            <RoleRoute allowedRoles={['hr', 'super_admin']}>
              <SuspenseWrapper><HRDashboard /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="employee" element={<SuspenseWrapper><EmployeeDashboard /></SuspenseWrapper>} />
        </Route>

        {/* Partners */}
        <Route path="/partners" element={
          <RoleRoute allowedRoles={['super_admin','partner','hr','manager']}>
            <SuspenseWrapper><PartnerList /></SuspenseWrapper>
          </RoleRoute>
        } />

        {/* Employees */}
        <Route path="/employees">
          <Route index           element={<SuspenseWrapper><EmployeeList /></SuspenseWrapper>} />
          <Route path="new"      element={<SuspenseWrapper><EmployeeForm /></SuspenseWrapper>} />
          <Route path=":id/edit" element={<SuspenseWrapper><EmployeeForm /></SuspenseWrapper>} />
          <Route path=":id"      element={<SuspenseWrapper><EmployeeDetail /></SuspenseWrapper>} />
        </Route>

        {/* Clients — partner / hr / super_admin only */}
        <Route path="/clients">
          <Route index element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><ClientList /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="new" element={
            <RoleRoute allowedRoles={['super_admin','partner']}>
              <SuspenseWrapper><ClientForm /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path=":id/edit" element={
            <RoleRoute allowedRoles={['super_admin','partner']}>
              <SuspenseWrapper><ClientForm /></SuspenseWrapper>
            </RoleRoute>
          } />
        </Route>

        {/* Assignments */}
        <Route path="/assignments">
          <Route index           element={<SuspenseWrapper><AssignmentList /></SuspenseWrapper>} />
          <Route path="new"      element={
            <RoleRoute allowedRoles={['super_admin','partner','manager','hr']}>
              <SuspenseWrapper><AssignmentForm /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path=":id/edit" element={
            <RoleRoute allowedRoles={['super_admin','partner','manager','hr']}>
              <SuspenseWrapper><AssignmentForm /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path=":id"      element={<SuspenseWrapper><AssignmentDetail /></SuspenseWrapper>} />
        </Route>

        {/* Daily Logs — all authenticated users */}
        <Route path="/daily-logs" element={<SuspenseWrapper><DailyLog /></SuspenseWrapper>} />

        {/* Weekly Reports — all authenticated users */}
        <Route path="/weekly-reports" element={<SuspenseWrapper><WeeklyReport /></SuspenseWrapper>} />

        {/* Timesheets */}
        <Route path="/timesheets">
          <Route index         element={<SuspenseWrapper><TimesheetList /></SuspenseWrapper>} />
          <Route path="entry"  element={<SuspenseWrapper><TimesheetEntry /></SuspenseWrapper>} />
          <Route path="weekly" element={<SuspenseWrapper><TimesheetWeeklyView /></SuspenseWrapper>} />
        </Route>

        {/* Approvals */}
        <Route path="/approvals">
          <Route index      element={<SuspenseWrapper><ApprovalQueue /></SuspenseWrapper>} />
          <Route path=":id" element={<SuspenseWrapper><ApprovalDetail /></SuspenseWrapper>} />
        </Route>

        {/* Notifications */}
        <Route path="/notifications" element={<SuspenseWrapper><NotificationList /></SuspenseWrapper>} />

        {/* Leaves */}
        <Route path="/leaves">
          <Route index            element={<SuspenseWrapper><LeaveList /></SuspenseWrapper>} />
          <Route path="apply"     element={<SuspenseWrapper><LeaveApplication /></SuspenseWrapper>} />
          <Route path="approvals" element={<SuspenseWrapper><LeaveApproval /></SuspenseWrapper>} />
        </Route>

        {/* HR Modules */}
        <Route path="/holidays" element={<SuspenseWrapper><HolidaysPage /></SuspenseWrapper>} />
        <Route path="/notices"  element={<SuspenseWrapper><NoticesPage /></SuspenseWrapper>} />

        {/* Banner / Announcements management */}
        <Route path="/banners" element={
          <RoleRoute allowedRoles={['super_admin','partner','hr']}>
            <SuspenseWrapper><BannerManagement /></SuspenseWrapper>
          </RoleRoute>
        } />

        {/* Reports */}
        <Route path="/reports" element={<SuspenseWrapper><ReportsDashboard /></SuspenseWrapper>} />

        {/* Settings — admin/partner/hr only, except /settings/policy which all roles can view */}
        <Route path="/settings">
          {/* Company Policy — visible to everyone */}
          <Route path="policy" element={<SuspenseWrapper><PolicySettings /></SuspenseWrapper>} />

          {/* All other settings: super_admin / partner / hr only */}
          <Route index element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><FirmSettings /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="departments" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><DepartmentSettings /></SuspenseWrapper>
            </RoleRoute>
          } />
          {/* Merged appearance settings */}
          <Route path="appearance" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><AppearanceSettings /></SuspenseWrapper>
            </RoleRoute>
          } />
          {/* Legacy routes — redirect to appearance */}
          <Route path="branding" element={<Navigate to="/settings/appearance" replace />} />
          <Route path="theme"    element={<Navigate to="/settings/appearance" replace />} />

          <Route path="notifications" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><NotificationSettings /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="user-access" element={
            <RoleRoute allowedRoles={['super_admin','partner']}>
              <SuspenseWrapper><UserAccessSettings /></SuspenseWrapper>
            </RoleRoute>
          } />
        </Route>


        {/* Payroll */}
        <Route path="/payroll">
          <Route index element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><PayrollDashboard /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="runs/:runId" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><PayrollRunDetail /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="salary-manager" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><SalaryManager /></SuspenseWrapper>
            </RoleRoute>
          } />
          <Route path="salary-config/:employeeId" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><SalaryConfig /></SuspenseWrapper>
            </RoleRoute>
          } />
        </Route>

        {/* My Payslips — all authenticated users */}
        <Route path="/my-payslips" element={<SuspenseWrapper><MyPayslips /></SuspenseWrapper>} />

        {/* Organization */}
        <Route path="/organization">
          <Route index element={<SuspenseWrapper><OrgDirectory /></SuspenseWrapper>} />
          {/* Legacy chart route — merged into the unified directory/hierarchy page */}
          <Route path="chart" element={<Navigate to="/organization" replace />} />
          <Route path="departments" element={
            <RoleRoute allowedRoles={['super_admin','partner','hr']}>
              <SuspenseWrapper><DepartmentManager /></SuspenseWrapper>
            </RoleRoute>
          } />
        </Route>

        <Route path="/unauthorized" element={<SuspenseWrapper><Unauthorized /></SuspenseWrapper>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
