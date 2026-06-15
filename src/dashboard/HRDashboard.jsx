import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Calendar, Bell, Briefcase, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../services/apiClient';
import KPICard from '../dashboard/components/KPICard';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/formatters';
import BannerCarousel from '../components/banners/BannerCarousel';

const HRDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalEmployees:0, pendingLeaves:0, newJoinees:0, exits:0, deptData:[] });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, empRes] = await Promise.all([
        apiClient.get('/reports/dashboard'),
        apiClient.get('/employees', { params: { pageSize: 100 } }),
      ]);
      const s = statsRes.data.data;
      const emps = empRes.data.data || [];

      // New joinees this month
      const monthStart = new Date(); monthStart.setDate(1);
      const newJoinees = emps.filter(e => e.join_date && new Date(e.join_date) >= monthStart).length;

      setStats({ ...s, newJoinees, exits: 0 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <BannerCarousel />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">HR Dashboard</h2>
          <p className="text-sm text-text-secondary">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Button icon={UserPlus} onClick={() => navigate('/employees/new')}>Add Employee</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Employees" value={stats.totalEmployees} subtitle="Active staff" icon={Users} color="primary" onClick={() => navigate('/employees')} />
        <KPICard title="Pending Leaves" value={stats.pendingLeaves} subtitle="Awaiting approval" icon={Calendar} color={stats.pendingLeaves > 0 ? 'warning' : 'success'} onClick={() => navigate('/leaves')} />
        <KPICard title="New Joinees" value={stats.newJoinees} subtitle="This month" icon={UserPlus} color="info" />
        <KPICard title="Open Assignments" value={stats.openAssignments || 0} subtitle="In progress" icon={Briefcase} color="purple" onClick={() => navigate('/assignments')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Employee',    path: '/employees/new',  icon: UserPlus  },
              { label: 'Leave Requests',  path: '/leaves',         icon: Calendar  },
              { label: 'Office Notices',  path: '/notices',        icon: Bell      },
              { label: 'Manage Holidays', path: '/holidays',       icon: Calendar  },
              { label: 'Departments',     path: '/settings/departments', icon: Users },
              { label: 'All Employees',   path: '/employees',      icon: Users     },
            ].map(({ label, path, icon: Icon }) => (
              <button key={path} onClick={() => navigate(path)}
                className="flex items-center gap-2.5 p-3 border border-border rounded-xl hover:bg-gray-50 transition-colors text-left group">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-text-primary">{label}</span>
                <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 text-text-secondary transition-opacity" />
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Workforce Summary" />
          <div className="space-y-3 pt-2">
            {[
              { label: 'Active Employees', value: stats.totalEmployees, color: 'bg-green-500' },
              { label: 'Pending Approvals', value: stats.pendingLeaves, color: 'bg-amber-500' },
              { label: 'Open Assignments', value: stats.openAssignments || 0, color: 'bg-blue-500' },
              { label: 'Hours This Month', value: `${Math.round(stats.hoursThisMonth || 0)}h`, color: 'bg-purple-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-sm text-text-secondary">{label}</span>
                </div>
                <span className="text-sm font-semibold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HRDashboard;
