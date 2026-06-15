import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Briefcase, CheckSquare, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import useAuthStore from '../store/authStore';
import { reportService } from '../services/reportService';
import { assignmentService } from '../services/assignmentService';
import { timesheetService } from '../services/timesheetService';
import KPICard from './components/KPICard';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatHours } from '../utils/formatters';
import { ASSIGNMENT_STATUS_COLORS, ASSIGNMENT_STATUS_LABELS, PRIORITY_COLORS } from '../constants';
import BannerCarousel from '../components/banners/BannerCarousel';

const PartnerDashboard = () => {
  const { profile, getFirmId } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    clientHours: [],
    assignments: [],
    utilizationData: [],
    totalBillableHours: 0,
    totalHours: 0,
    pendingApprovals: 0,
    overdueCount: 0,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const firmId = getFirmId();
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 8) + '01';

      const [clientHours, billableReport, assignments, overdue, pendingApprovals] = await Promise.all([
        reportService.getClientHours({ firmId, fromDate: monthStart, toDate: today }),
        reportService.getBillableVsNonBillable({ firmId, fromDate: monthStart, toDate: today }),
        assignmentService.getAll({ firmId, page: 1, pageSize: 100 }),
        assignmentService.getOverdue(firmId),
        timesheetService.getPendingCount(profile?.id, firmId),
      ]);

      setData({
        clientHours: clientHours.slice(0, 8),
        assignments: assignments.data || [],
        utilizationData: billableReport.byDate?.slice(-14) || [],
        totalBillableHours: billableReport.summary?.billable || 0,
        totalHours: billableReport.summary?.total || 0,
        pendingApprovals,
        overdueCount: overdue?.length || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const utilization = data.totalHours > 0
    ? Math.round((data.totalBillableHours / data.totalHours) * 100)
    : 0;

  const statusCounts = data.assignments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <BannerCarousel />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Partner Dashboard</h2>
          <p className="text-sm text-text-secondary">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Button icon={ArrowRight} iconPosition="right" variant="secondary" onClick={() => navigate('/reports')}>
          Full Reports
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Billable Hours" value={formatHours(data.totalBillableHours)} subtitle="This month" icon={Clock}
          color="success" />
        <KPICard title="Utilization Rate" value={`${utilization}%`} subtitle="Billable / Total"
          icon={TrendingUp} color={utilization >= 70 ? 'success' : utilization >= 50 ? 'warning' : 'error'} />
        <KPICard title="Pending Approvals" value={data.pendingApprovals} subtitle="Timesheets awaiting"
          icon={CheckSquare} color={data.pendingApprovals > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/approvals')} />
        <KPICard title="Overdue Assignments" value={data.overdueCount} subtitle="Past due date"
          icon={Briefcase} color={data.overdueCount > 0 ? 'error' : 'success'}
          onClick={() => navigate('/assignments')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Client-wise Hours */}
        <Card>
          <CardHeader title="Client-wise Hours" subtitle="This month (approved)" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.clientHours} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="client_name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={(v) => [`${v}h`]} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Bar dataKey="billable_hours" fill="#5B6B7A" radius={[0, 4, 4, 0]} name="Billable" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Billable vs Non-Billable Trend */}
        <Card>
          <CardHeader title="Billable Trend" subtitle="Last 14 days" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="billable" stroke="#22C55E" strokeWidth={2} dot={false} name="Billable" />
              <Line type="monotone" dataKey="non_billable" stroke="#EF4444" strokeWidth={2} dot={false} name="Non-Billable" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Assignment Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className="text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/assignments?status=${status}`)}>
            <p className="text-xl font-bold text-text-primary">{count}</p>
            <Badge className={`${ASSIGNMENT_STATUS_COLORS[status]} mt-1`}>{ASSIGNMENT_STATUS_LABELS[status]}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PartnerDashboard;
