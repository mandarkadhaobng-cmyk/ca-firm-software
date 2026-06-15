import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Briefcase, Clock,
  TrendingUp, Settings, ArrowRight, Shield,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../services/apiClient';
import KPICard from './components/KPICard';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/formatters';
import BannerCarousel from '../components/banners/BannerCarousel';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees:       0,
    totalClients:         0,
    totalAssignments:     0,
    totalHoursThisMonth:  0,
    deptData:             [],
  });

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const loadData = async () => {
    try {
      const [overviewRes, deptRes] = await Promise.all([
        apiClient.get('/reports/overview'),
        apiClient.get('/reports/departments'),
      ]);

      const overview = overviewRes.data?.data ?? {};
      const depts    = deptRes.data?.data    ?? [];

      setStats({
        totalEmployees:      overview.totalEmployees      ?? 0,
        totalClients:        overview.totalClients        ?? 0,
        totalAssignments:    overview.openAssignments     ?? 0,
        totalHoursThisMonth: overview.hoursThisMonth      ?? 0,
        deptData: depts.map(d => ({
          name:      d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name,
          employees: d.employeeCount ?? 0,
        })).filter(d => d.employees > 0),
      });
    } catch (err) {
      console.error('[SuperAdminDashboard] loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <BannerCarousel />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Super Admin Dashboard</h2>
          <p className="text-sm text-text-secondary">Full system overview · {formatDate(new Date())}</p>
        </div>
        <Button icon={Settings} variant="secondary" onClick={() => navigate('/settings')}>
          System Settings
        </Button>
      </div>

      {/* System Health Banner */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-center gap-3">
        <Shield size={20} className="text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary">System Operational</p>
          <p className="text-xs text-primary/60">All modules running normally · Last checked: Just now</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Employees" value={stats.totalEmployees}
          subtitle="Across all departments" icon={Users} color="info"
          onClick={() => navigate('/employees')}
        />
        <KPICard
          title="Active Clients" value={stats.totalClients}
          subtitle="Total client base" icon={Building2} color="primary"
          onClick={() => navigate('/clients')}
        />
        <KPICard
          title="Open Assignments" value={stats.totalAssignments}
          subtitle="In progress / assigned" icon={Briefcase} color="warning"
          onClick={() => navigate('/assignments')}
        />
        <KPICard
          title="Hours This Month"
          value={`${Math.round(stats.totalHoursThisMonth)}h`}
          subtitle="Across all employees" icon={Clock} color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Distribution */}
        <Card>
          <CardHeader title="Employees by Department" />
          {stats.deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.deptData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="employees" fill="#5B6B7A" radius={[4, 4, 0, 0]} name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-secondary text-center py-10">No department data yet</p>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Quick Actions" subtitle="Common admin tasks" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Employee',   path: '/employees/new',        icon: Users,      color: 'bg-blue-50 text-blue-600' },
              { label: 'Add Client',     path: '/clients/new',          icon: Building2,  color: 'bg-green-50 text-green-600' },
              { label: 'New Assignment', path: '/assignments/new',       icon: Briefcase,  color: 'bg-amber-50 text-amber-600' },
              { label: 'View Reports',   path: '/reports',               icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
              { label: 'Departments',    path: '/settings/departments',  icon: Settings,   color: 'bg-gray-50 text-gray-600' },
              { label: 'Branding',       path: '/settings/branding',     icon: Shield,     color: 'bg-primary/5 text-primary' },
            ].map(({ label, path, icon: Icon, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex items-center gap-2.5 p-3 border border-border rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={15} />
                </div>
                <span className="text-sm font-medium text-text-primary">{label}</span>
                <ArrowRight size={12} className="ml-auto text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
