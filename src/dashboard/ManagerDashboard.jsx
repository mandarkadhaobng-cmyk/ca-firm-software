import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, Briefcase, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import useAuthStore from '../store/authStore';
import { timesheetService } from '../services/timesheetService';
import { assignmentService } from '../services/assignmentService';
import { employeeService } from '../services/employeeService';
import KPICard from './components/KPICard';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, fullName } from '../utils/formatters';
import { ASSIGNMENT_STATUS_COLORS, ASSIGNMENT_STATUS_LABELS, TIMESHEET_STATUS_LABELS } from '../constants';
import BannerCarousel from '../components/banners/BannerCarousel';

const COLORS = ['#5B6B7A', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444'];

const ManagerDashboard = () => {
  const { profile, getFirmId } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    pendingApprovals: 0,
    teamMembers: [],
    assignments: [],
    timesheetStatusData: [],
  });

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const loadData = async () => {
    try {
      const userId  = profile?.id;
      const firmId  = getFirmId();
      const today      = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 8) + '01';

      // All queries in ONE parallel batch — no sequential round-trips
      const [
        pendingApprovals,
        teamMembers,
        assignments,
        timesheetsRes,
      ] = await Promise.all([
        timesheetService.getPendingCount(userId, firmId),
        employeeService.getTeamMembers(userId),
        assignmentService.getAll({ firmId, managerId: userId, page: 1, pageSize: 50 }),
        timesheetService.getAll({ firmId, fromDate: monthStart, toDate: today, viewAll: true, page: 1, pageSize: 200 }),
      ]);

      // Timesheet status breakdown (client-side aggregation — no extra query)
      const statusCounts = { submitted: 0, approved: 0, draft: 0, rejected: 0 };
      timesheetsRes.data?.forEach(t => {
        if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
      });
      const timesheetStatusData = Object.entries(statusCounts)
        .map(([name, value]) => ({ name: TIMESHEET_STATUS_LABELS[name] || name, value }))
        .filter(d => d.value > 0);

      setData({
        pendingApprovals: pendingApprovals || 0,
        teamMembers: teamMembers || [],
        assignments: assignments.data || [],
        timesheetStatusData,
      });
    } catch (err) {
      console.error('ManagerDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const overdueAssignments = data.assignments.filter(a =>
    a.due_date &&
    a.due_date < new Date().toISOString().split('T')[0] &&
    !['completed', 'closed'].includes(a.status)
  );

  return (
    <div className="space-y-5">
      <BannerCarousel />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Manager Dashboard</h2>
          <p className="text-sm text-text-secondary">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Pending Approvals" value={data.pendingApprovals}
          subtitle="Timesheets to review" icon={CheckSquare}
          color={data.pendingApprovals > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/approvals')} />
        <KPICard title="Team Members" value={data.teamMembers.length}
          subtitle="Active employees" icon={Users} color="info"
          onClick={() => navigate('/employees')} />
        <KPICard title="Active Assignments"
          value={data.assignments.filter(a => a.status === 'in_progress').length}
          subtitle="In progress" icon={Briefcase} color="primary"
          onClick={() => navigate('/assignments')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timesheet Status Pie */}
        <Card>
          <CardHeader title="Timesheet Status" subtitle="This month" />
          {data.timesheetStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.timesheetStatusData} cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {data.timesheetStatusData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip formatter={(v) => [`${v} entries`]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-text-secondary text-sm py-8">No timesheet data</p>
          )}
        </Card>

        {/* Overdue Assignments */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                Overdue Assignments
                {overdueAssignments.length > 0 && (
                  <span className="bg-red-100 text-error text-xs px-1.5 py-0.5 rounded-full">
                    {overdueAssignments.length}
                  </span>
                )}
              </h3>
              <Button variant="ghost" size="xs" icon={ArrowRight} iconPosition="right"
                onClick={() => navigate('/assignments')}>View All</Button>
            </div>
            {overdueAssignments.length === 0 ? (
              <p className="text-center text-text-secondary text-sm py-8">No overdue assignments ✓</p>
            ) : (
              <div className="divide-y divide-border">
                {overdueAssignments.slice(0, 5).map(a => (
                  <div key={a.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/60 cursor-pointer"
                    onClick={() => navigate(`/assignments/${a.id}`)}>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{a.title}</p>
                      <p className="text-xs text-text-secondary">
                        {a.clients?.client_name} · Due {formatDate(a.due_date)}
                      </p>
                    </div>
                    <Badge className={ASSIGNMENT_STATUS_COLORS[a.status]}>
                      {ASSIGNMENT_STATUS_LABELS[a.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Team Members */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Team Members</h3>
          <Button variant="ghost" size="xs" icon={ArrowRight} iconPosition="right"
            onClick={() => navigate('/employees')}>View All</Button>
        </div>
        {data.teamMembers.length === 0 ? (
          <p className="text-center text-text-secondary text-sm py-8">No team members found</p>
        ) : (
          <div className="divide-y divide-border">
            {data.teamMembers.map(m => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{fullName(m)}</p>
                    <p className="text-xs text-text-secondary">{m.designation || 'Employee'}</p>
                  </div>
                </div>
                <Badge className={m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                  {m.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ManagerDashboard;
