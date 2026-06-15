import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle, XCircle, Clock, User, Calendar, MessageSquare, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { leaveService } from '../services/leaveService';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fullName } from '../utils/formatters';

const LEAVE_TYPE_LABELS = {
  casual: 'Casual', sick: 'Sick', earned: 'Earned',
  maternity: 'Maternity', paternity: 'Paternity',
  lop: 'LOP', comp_off: 'Comp Off', other: 'Other',
};

const LeaveApproval = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState(null); // { leave, action: 'approve'|'reject' }
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const result = await leaveService.getAll({ status: filter === 'all' ? undefined : filter, team: true });
      const arr = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
      setLeaves(arr);
    } catch {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeaves(); }, [filter]);

  const handleAction = async () => {
    if (!actionModal) return;
    const { leave, action } = actionModal;
    if (action === 'reject' && !comment.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setProcessing(true);
    try {
      if (action === 'approve') {
        await leaveService.approve(leave.id, comment);
        toast.success('Leave approved');
      } else {
        await leaveService.reject(leave.id, comment);
        toast.success('Leave rejected');
      }
      setActionModal(null);
      setComment('');
      loadLeaves();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = leaves.filter(l => {
    if (!search) return true;
    const name = fullName(l) || `${l.first_name || ''} ${l.last_name || ''}`.trim();
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Leave Approvals</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Review and action team leave requests
            {pendingCount > 0 && (
              <span className="ml-2 bg-warning/20 text-warning text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all
                ${filter === s ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* List */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No leave requests"
          description={filter === 'pending' ? 'No pending requests to review' : 'No leave requests found'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(leave => {
            const empName = `${leave.first_name || ''} ${leave.last_name || ''}`.trim() || 'Employee';
            const isPending = leave.status === 'pending';
            return (
              <Card key={leave.id}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-xs font-bold">
                        {empName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary text-sm">{empName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                            leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'}`}>
                          {leave.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                        {' · '}
                        {leave.from_date && format(parseISO(leave.from_date), 'dd MMM')}
                        {' – '}
                        {leave.to_date && format(parseISO(leave.to_date), 'dd MMM yyyy')}
                        {' · '}
                        <strong>{leave.total_days}</strong> day{leave.total_days !== 1 ? 's' : ''}
                      </p>
                      {leave.reason && (
                        <p className="text-xs text-text-secondary mt-1 max-w-sm">{leave.reason}</p>
                      )}
                      {leave.rejection_reason && (
                        <p className="text-xs text-error mt-1">Rejected: {leave.rejection_reason}</p>
                      )}
                      <p className="text-xs text-text-secondary mt-1">
                        Applied {leave.created_at && format(parseISO(leave.created_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setActionModal({ leave, action: 'approve' }); setComment(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => { setActionModal({ leave, action: 'reject' }); setComment(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setComment(''); }}
        title={actionModal?.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-text-primary">
                {`${actionModal.leave.first_name || ''} ${actionModal.leave.last_name || ''}`.trim()}
              </p>
              <p className="text-text-secondary text-xs mt-1">
                {LEAVE_TYPE_LABELS[actionModal.leave.leave_type]} ·{' '}
                {actionModal.leave.total_days} day{actionModal.leave.total_days !== 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                {actionModal.action === 'reject' ? 'Rejection Reason *' : 'Comment (optional)'}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={actionModal.action === 'reject' ? 'Explain why the leave is being rejected…' : 'Add a note (optional)…'}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setActionModal(null); setComment(''); }}>
                Cancel
              </Button>
              <Button
                variant={actionModal.action === 'approve' ? 'primary' : 'danger'}
                onClick={handleAction}
                loading={processing}
                icon={actionModal.action === 'approve' ? CheckCircle : XCircle}
              >
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeaveApproval;
