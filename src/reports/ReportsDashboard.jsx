import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, Clock, DollarSign, Filter, RefreshCw } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { reportService } from '../services/reportService';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { exportToExcel } from '../utils/exportHelpers';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const KPI = ({ label, value, sub, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10' }) => (
  <Card>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-text-secondary font-medium">{label}</p>
        <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
      </div>
      <div className={`p-3 ${bgColor} rounded-xl`}>
        <Icon size={20} className={color} />
      </div>
    </div>
  </Card>
);

const ReportsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [clientHours, setClientHours] = useState([]);
  const [billable, setBillable] = useState([]);
  const [leaveReport, setLeaveReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, utilData, clientData, billData, leaveData] = await Promise.all([
        reportService.getDashboardStats(),
        reportService.getUtilizationReport(dateRange),
        reportService.getClientHoursReport(dateRange),
        reportService.getBillableReport(dateRange),
        reportService.getLeaveReport(dateRange),
      ]);
      setStats(statsData);
      setUtilization(utilData || []);
      setClientHours((clientData || []).slice(0, 10));
      setBillable(billData || []);
      setLeaveReport(leaveData || []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateRange.from, dateRange.to]);

  const handleExport = (data, name) => {
    try {
      exportToExcel(data, name);
      toast.success('Exported successfully');
    } catch {
      toast.error('Export failed');
    }
  };

  const TABS = [
    { key: 'overview',     label: 'Overview' },
    { key: 'utilization',  label: 'Utilization' },
    { key: 'clients',      label: 'Client Hours' },
    { key: 'billable',     label: 'Billable' },
    { key: 'leaves',       label: 'Leaves' },
  ];

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Reports & Analytics</h1>
          <p className="text-sm text-text-secondary mt-0.5">Performance insights for your firm</p>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
          <Filter size={14} className="text-text-secondary" />
          <input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
            className="text-sm border-0 outline-none bg-transparent"
          />
          <span className="text-text-secondary text-sm">—</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
            className="text-sm border-0 outline-none bg-transparent"
          />
          <button onClick={loadData} className="p-1 hover:bg-gray-100 rounded text-text-secondary">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Total Employees"
          value={stats?.total_employees || 0}
          sub={`${stats?.active_employees || 0} active`}
          icon={Users}
          color="text-blue-600" bgColor="bg-blue-50"
        />
        <KPI
          label="Hours Logged"
          value={stats?.total_hours || 0}
          sub={`${stats?.billable_hours || 0} billable`}
          icon={Clock}
          color="text-green-600" bgColor="bg-green-50"
        />
        <KPI
          label="Utilization"
          value={`${stats?.avg_utilization || 0}%`}
          sub="avg this period"
          icon={TrendingUp}
          color="text-primary" bgColor="bg-primary/10"
        />
        <KPI
          label="Billable %"
          value={`${stats?.billable_pct || 0}%`}
          sub="of total hours"
          icon={DollarSign}
          color="text-yellow-600" bgColor="bg-yellow-50"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Billable vs Non-billable */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary text-sm">Billable vs Non-Billable Hours</h3>
              <button onClick={() => handleExport(billable, 'billable-report')} className="p-1.5 hover:bg-gray-100 rounded text-text-secondary">
                <Download size={14} />
              </button>
            </div>
            {billable.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={billable}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="billable_hours" name="Billable" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="non_billable_hours" name="Non-Billable" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Top Clients */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary text-sm">Top Clients by Hours</h3>
              <button onClick={() => handleExport(clientHours, 'client-hours')} className="p-1.5 hover:bg-gray-100 rounded text-text-secondary">
                <Download size={14} />
              </button>
            </div>
            {clientHours.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={clientHours.slice(0, 6)}
                    dataKey="total_hours"
                    nameKey="client_name"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ client_name, percent }) =>
                      `${(client_name || '').slice(0, 12)} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {clientHours.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'utilization' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary text-sm">Employee Utilization</h3>
            <button onClick={() => handleExport(utilization, 'utilization-report')} className="p-1.5 hover:bg-gray-100 rounded text-text-secondary">
              <Download size={14} />
            </button>
          </div>
          {utilization.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-12">No utilization data for this period</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={utilization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="employee_name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [`${v}%`, 'Utilization']} />
                  <Bar dataKey="utilization_pct" name="Utilization" radius={[0, 4, 4, 0]}>
                    {utilization.map((entry, i) => (
                      <Cell key={i} fill={entry.utilization_pct >= 80 ? '#10b981' : entry.utilization_pct >= 60 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> ≥80% On target</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> 60-79% Moderate</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> &lt;60% Low</span>
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab === 'clients' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary text-sm">Hours by Client</h3>
            <button onClick={() => handleExport(clientHours, 'client-hours')} className="p-1.5 hover:bg-gray-100 rounded text-text-secondary">
              <Download size={14} />
            </button>
          </div>
          {clientHours.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-12">No client hours data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-text-secondary font-medium">#</th>
                    <th className="text-left py-2 px-3 text-xs text-text-secondary font-medium">Client</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Total Hours</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Billable</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Non-Billable</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {clientHours.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-text-secondary">{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-text-primary">{row.client_name || '—'}</td>
                      <td className="py-2.5 px-3 text-right">{(row.total_hours || 0).toFixed(1)}h</td>
                      <td className="py-2.5 px-3 text-right text-green-600">{(row.billable_hours || 0).toFixed(1)}h</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{(row.non_billable_hours || 0).toFixed(1)}h</td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{row.entry_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'billable' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary text-sm">Billable Hours Trend</h3>
            <button onClick={() => handleExport(billable, 'billable-report')} className="p-1.5 hover:bg-gray-100 rounded text-text-secondary">
              <Download size={14} />
            </button>
          </div>
          {billable.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-12">No billable data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={billable}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="billable_hours" name="Billable" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="non_billable_hours" name="Non-Billable" stroke="#e5e7eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {activeTab === 'leaves' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary text-sm">Leave Summary</h3>
            <button onClick={() => handleExport(leaveReport, 'leave-report')} className="p-1.5 hover:bg-gray-100 rounded text-text-secondary">
              <Download size={14} />
            </button>
          </div>
          {leaveReport.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-12">No leave data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-text-secondary font-medium">Employee</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Casual</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Sick</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Earned</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">LOP</th>
                    <th className="text-right py-2 px-3 text-xs text-text-secondary font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveReport.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-text-primary">
                        {row.employee_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()}
                      </td>
                      <td className="py-2.5 px-3 text-right">{row.casual || 0}</td>
                      <td className="py-2.5 px-3 text-right">{row.sick || 0}</td>
                      <td className="py-2.5 px-3 text-right">{row.earned || 0}</td>
                      <td className="py-2.5 px-3 text-right text-red-500">{row.lop || 0}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{row.total_days || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ReportsDashboard;
