import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RotateCcw, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { approvalService } from '../services/approvalService';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatHours, fullName } from '../utils/formatters';

const ApprovalQueue = () => {
  const navigate = useNavigate();
  const { profile, getFirmId } = useAuthStore();
  const [approvals, setApprovals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [actionModal, setActionModal] = useState({ open: false, type: null, ids: [] });
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await approvalService.getPending({
        firmId: getFirmId(),
        approverId: profile?.id,
        page, pageSize
      });
      setApprovals(data || []);
      setTotal(count || 0);
    } catch {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const openModal = (type, ids) => {
    setActionModal({ open: true, type, ids });
    setComments('');
  };

  const handleAction = async () => {
    if ((actionModal.type === 'reject' || actionModal.type === 'send_back') && !comments.trim()) {
      toast.error('Please provide comments');
      return;
    }
    setProcessing(true);
    try {
      if (actionModal.type === 'approve') {
        await approvalService.bulkApprove(actionModal.ids, profile?.id, comments);
        toast.success(`${actionModal.ids.length} timesheet(s) approved`);
      } else if (actionModal.type === 'reject') {
        await approvalService.bulkReject(actionModal.ids, profile?.id, comments);
        toast.success(`${actionModal.ids.length} timesheet(s) rejected`);
      } else if (actionModal.type === 'send_back') {
        for (const id of actionModal.ids) {
          await approvalService.sendBack(id, profile?.id, comments);
        }
        toast.success('Sent back to employee');
      }
      setSelected([]);
      setActionModal({ open: false, type: null, ids: [] });
      fetchApprovals();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === approvals.length ? [] : approvals.map(a => a.id));

  const columns = [
    {
      key: 'select',
      header: (
        <input type="checkbox" checked={selected.length === approvals.length && approvals.length > 0}
          onChange={toggleAll} className="w-4 h-4 text-primary border-border rounded" />
      ),
      width: '40px',
      render: (_, row) => (
        <input type="checkbox" checked={selected.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 text-primary border-border rounded" />
      ),
    },
    {
      key: 'timesheets',
      header: 'Employee',
      render: v => (
        <div>
          <p className="font-medium text-text-primary">{fullName(v?.users)}</p>
          <p className="text-xs text-text-secondary">{v?.users?.employee_id} · {v?.users?.designation}</p>
        </div>
      ),
    },
    { key: 'timesheets', header: 'Date', render: v => formatDate(v?.date) },
    { key: 'timesheets', header: 'Client', render: v => v?.clients?.client_name || '—' },
    { key: 'timesheets', header: 'Assignment', render: v => v?.assignments?.title || '—' },
    {
      key: 'timesheets',
      header: 'Task',
      render: v => <span className="line-clamp-1 max-w-[200px]">{v?.task_description}</span>
    },
    {
      key: 'timesheets',
      header: 'Hours',
      render: v => (
        <div className="text-center">
          <p className="font-semibold text-text-primary">{formatHours(v?.hours_worked)}</p>
          {!v?.is_billable && <span className="text-xs text-text-secondary">Non-billable</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openModal('approve', [row.id])}
            className="p-1.5 hover:bg-green-50 rounded-md text-text-secondary hover:text-success transition-colors" title="Approve">
            <CheckCircle size={16} />
          </button>
          <button onClick={() => openModal('reject', [row.id])}
            className="p-1.5 hover:bg-red-50 rounded-md text-text-secondary hover:text-error transition-colors" title="Reject">
            <XCircle size={16} />
          </button>
          <button onClick={() => openModal('send_back', [row.id])}
            className="p-1.5 hover:bg-amber-50 rounded-md text-text-secondary hover:text-warning transition-colors" title="Send Back">
            <RotateCcw size={16} />
          </button>
        </div>
      ),
    },
  ];

  const MODAL_CONFIG = {
    approve: { title: 'Approve Timesheets', color: 'success', btnLabel: 'Approve', needsComment: false },
    reject: { title: 'Reject Timesheets', color: 'danger', btnLabel: 'Reject', needsComment: true },
    send_back: { title: 'Send Back for Revision', color: 'warning', btnLabel: 'Send Back', needsComment: true },
  };

  const modalConfig = actionModal.type ? MODAL_CONFIG[actionModal.type] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Approval Queue</h2>
          <p className="text-xs text-text-secondary mt-0.5">{total} pending approvals</p>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <Button size="sm" icon={CheckCircle} variant="success" onClick={() => openModal('approve', selected)}>
              Approve ({selected.length})
            </Button>
            <Button size="sm" icon={XCircle} variant="danger" onClick={() => openModal('reject', selected)}>
              Reject ({selected.length})
            </Button>
          </div>
        )}
      </div>

      <Card padding={false}>
        <Table columns={columns} data={approvals} loading={loading} emptyMessage="No pending approvals" />
        <div className="px-4">
          <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }} />
        </div>
      </Card>

      {/* Action Modal */}
      {modalConfig && (
        <Modal
          isOpen={actionModal.open}
          onClose={() => setActionModal({ open: false, type: null, ids: [] })}
          title={`${modalConfig.title} (${actionModal.ids.length} entries)`}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setActionModal({ open: false, type: null, ids: [] })}>Cancel</Button>
              <Button variant={modalConfig.color} loading={processing} onClick={handleAction}>{modalConfig.btnLabel}</Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              {actionModal.type === 'approve'
                ? 'Are you sure you want to approve the selected timesheet entries?'
                : actionModal.type === 'reject'
                ? 'Please provide a reason for rejection:'
                : 'Please provide feedback for the employee:'}
            </p>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">
                Comments {modalConfig.needsComment && <span className="text-error">*</span>}
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={modalConfig.needsComment ? 'Required...' : 'Optional...'}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ApprovalQueue;
