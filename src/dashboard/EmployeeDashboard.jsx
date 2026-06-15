import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Briefcase, Plus, ArrowRight, AlertCircle, ClipboardList, BookOpen, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useAuthStore from '../store/authStore';
import { timesheetService } from '../services/timesheetService';
import { assignmentService } from '../services/assignmentService';
import KPICard from './components/KPICard';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatHours } from '../utils/formatters';
import BannerCarousel from '../components/banners/BannerCarousel';

const EmployeeDashboard = () => {
  const { profile, getFirmId } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    monthlyHours: [],
    assignments: [],
    pendingTimesheets: 0,
    thisMonthHours: 0,
    weeklyData: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = profile?.id;
      const firmId = getFirmId();
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [monthlyHours, assignments] = await Promise.all([
        timesheetService.getMonthlyHours(userId, year, month),
        assignmentService.getAssignmentsForUser(userId, firmId),
      ]);

      // Calculate this month total
      const thisMonthHours = monthlyHours?.reduce((sum, t) => sum + parseFloat(t.hours_worked || 0), 0) || 0;

      // Pending timesheets (draft)
      const pendingTimesheets = monthlyHours?.filter(t => t.status === 'draft').length || 0;

      // Build last 7 days chart data
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayHours = monthlyHours?.filter(t => t.date === dateStr)
          .reduce((sum, t) => sum + parseFloat(t.hours_worked || 0), 0) || 0;
        weeklyData.push({
          date: formatDate(d, 'EEE'),
          hours: parseFloat(dayHours.toFixed(1)),
        });
      }

      setData({ monthlyHours, assignments: assignments || [], thisMonthHours, pendingTimesheets, weeklyData });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <BannerCarousel />
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.first_name}!
          </h2>
          <p className="text-sm text-text-secondary">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/timesheets/entry')}>Log Time</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="This Month Hours"
          value={formatHours(data.thisMonthHours)}
          subtitle="Total logged hours"
          icon={Clock}
          color="primary"
        />
        <KPICard
          title="Assignments"
          value={data.assignments.length}
          subtitle="Active assignments"
          icon={Briefcase}
          color="info"
          onClick={() => navigate('/assignments')}
        />
        <KPICard
          title="Pending Timesheets"
          value={data.pendingTimesheets}
          subtitle="Draft entries"
          icon={AlertCircle}
          color={data.pendingTimesheets > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/timesheets')}
        />
      </div>

      {/* Weekly Hours Chart */}
      <Card>
        <CardHeader title="Hours Logged - Last 7 Days" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.weeklyData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ border: '1px solid #E5EAF2', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v) => [`${v}h`, 'Hours']}
            />
            <Bar dataKey="hours" fill="#5B6B7A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => navigate('/daily-logs')}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Daily Log</p>
            <p className="text-xs text-gray-400">Log today's work</p>
          </div>
          <ArrowRight size={14} className="ml-auto text-gray-300" />
        </button>
        <button onClick={() => navigate('/weekly-reports')}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Weekly Report</p>
            <p className="text-xs text-gray-400">Submit your weekly summary</p>
          </div>
          <ArrowRight size={14} className="ml-auto text-gray-300" />
        </button>
      </div>

      {/* My Assignments */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">My Assignments</h3>
          <Button variant="ghost" size="xs" icon={ArrowRight} iconPosition="right" onClick={() => navigate('/assignments')}>
            View All
          </Button>
        </div>
        {data.assignments.length === 0 ? (
          <p className="text-center text-text-secondary text-sm py-8">No active assignments yet</p>
        ) : (
          <div className="divide-y divide-border">
            {data.assignments.slice(0, 5).map(a => {
              const overdue = a.due_date && a.due_date < new Date().toISOString().split('T')[0]
                && !['completed','closed','cancelled'].includes(a.status);
              const progress = parseInt(a.progress) || 0;
              return (
                <div
                  key={a.id}
                  className="px-5 py-3.5 hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => navigate(`/assignments/${a.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                        {overdue && (
                          <span className="flex items-center gap-0.5 text-xs text-red-600 flex-shrink-0">
                            <AlertCircle size={11} /> Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {a.client_name || '—'}
                        {a.due_date && <span className={`ml-2 ${overdue ? 'text-red-500' : ''}`}>· Due {formatDate(a.due_date)}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {a.status === 'completed'
                        ? <CheckCircle2 size={15} className="text-green-500" />
                        : <span className="text-xs font-medium text-gray-500">{progress}%</span>
                      }
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress === 100 ? 'bg-green-500' : progress >= 60 ? 'bg-blue-500' : 'bg-indigo-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeeDashboard;
