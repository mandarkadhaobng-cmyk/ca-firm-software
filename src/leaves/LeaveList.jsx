import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { leaveService } from '../services/leaveService';
import { usePermissions } from '../hooks/usePermissions';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,         color: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: 'Approved',  icon: CheckCircle,   color: 'bg-green-100 text-green-700'  },
  rejected:  { label: 'Rejected',  icon: XCircle,       color: 'bg-red-100 text-red-700'      },
  cancelled: { label: 'Cancelled', icon: AlertCircle,   color: 'bg-gray-100 text-gray-500'    },
};

const LEAVE_TYPE_LABELS = {
  casual:    'Casual Leave',
  sick:      'Sick Leave',
  earned:    'Earned Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  lop:       'Loss of Pay',
  comp_off:  'Comp Off',
  other:     'Other',
};

const LeaveList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancelling, setCancelling] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesData, balanceData] = await Promise.all([
        leaveService.getAll({ status: filter === 'all' ? undefined : filter }),
        leaveService.getBalance(),
      ]);
      setLeaves(Array.isArray(leavesData?.data) ? leavesData.data : (Array.isArray(leavesData) ? leavesData : []));
      setBalance(balanceData || {});
    } catch {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return;
    setCancelling(id);
    try {
      await leaveService.cancel(id);
      toast.success('Leave request cancelled');
      loadData();
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setCancelling(null);
    }
  };

  const balanceCards = [
    { key: 'casual',   label: 'Casual',   total: balance.casual_total   || 0, used: balance.casual_used   || 0 },
    { key: 'sick',     label: 'Sick',     total: balance.sick_total     || 0, used: balance.sick_used     || 0 },
    { key: 'earned',   label: 'Earned',   total: balance.earned_total   || 0, used: balance.earned_used   || 0 },
    { key: 'comp_off', label: 'Comp Off', total: balance.comp_off_total || 0, used: balance.comp_off_used || 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">My Leaves</h1>
          <p className="text-sm text-text-secondary mt-0.5">Track and manage your leave requests</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/leaves/apply')}>Apply Leave</Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {balanceCards.map(b => {
          const remaining = Math.max(0, b.total - b.used);
          const pct = b.total > 0 ? Math.round((b.used / b.total) * 100) : 0;
          return (
            <Card key={b.key} className="text-center">
              <p className="text-xs font-medium text-text-secondary">{b.label}</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{remaining}</p>
              <p className="text-xs text-text-secondary">remaining</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-text-secondary mt-1">{b.used}/{b.total} used</p>
            </Card>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all
              ${filter === s ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Leave List */}
      {loading ? (
        <LoadingSpinner />
      ) : leaves.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No leave requests"
          description="You haven't applied for any leaves yet"
          action={{ label: 'Apply for Leave', onClick: () => navigate('/leaves/apply') }}
        />
      ) : (
        <div className="space-y-3">
          {leaves.map((leave) => {
            const status = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            return (
              <Card key={leave.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${status.color} flex-shrink-0`}>
                      <StatusIcon size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">
                        {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {leave.from_date && format(parseISO(leave.from_date), 'dd MMM yyyy')}
                        {' – '}
                        {leave.to_date && format(parseISO(leave.to_date), 'dd MMM yyyy')}
                        {' · '}
                        <strong>{leave.total_days}</strong> day{leave.total_days !== 1 ? 's' : ''}
                      </p>
                      {leave.reason && (
                        <p className="text-xs text-text-secondary mt-1 max-w-md truncate">{leave.reason}</p>
                      )}
                      {leave.rejection_reason && (
                        <p className="text-xs text-error mt-1">Reason: {leave.rejection_reason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {leave.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(leave.id)}
                        disabled={cancelling === leave.id}
                        className="text-xs text-error hover:underline disabled:opacity-50"
                      >
                        {cancelling === leave.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Applied date */}
                <p className="text-xs text-text-secondary mt-2 pl-11">
                  Applied {leave.created_at && format(parseISO(leave.created_at), 'dd MMM yyyy')}
                  {leave.approved_by_name && ` · Reviewed by ${leave.approved_by_name}`}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manager quick-link */}
      {can('leaves.approve') && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => navigate('/leaves/approvals')}
            className="text-sm text-primary hover:underline font-medium"
          >
            → Manage team leave approvals
          </button>
        </div>
      )}
    </div>
  );
};

export default LeaveList;
