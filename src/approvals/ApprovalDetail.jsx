import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { approvalService } from '../services/approvalService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatHours, fullName } from '../utils/formatters';
import { TIMESHEET_STATUS_COLORS, TIMESHEET_STATUS_LABELS } from '../constants';

const ApprovalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Fetch single approval
    approvalService.getAll({ firmId: profile?.firm_id, page: 1, pageSize: 100 })
      .then(({ data }) => {
        const found = data?.find(a => a.id === id);
        setApproval(found);
        setLoading(false);
      });
  }, [id]);

  const handleAction = async (action) => {
    if ((action === 'reject' || action === 'send_back') && !comments.trim()) {
      toast.error('Please provide comments');
      return;
    }
    setProcessing(true);
    try {
      if (action === 'approve') await approvalService.approve(id, profile?.id, comments);
      else if (action === 'reject') await approvalService.reject(id, profile?.id, comments);
      else await approvalService.sendBack(id, profile?.id, comments);
      toast.success('Action completed');
      navigate('/approvals');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!approval) return <p className="text-text-secondary">Approval not found.</p>;

  const ts = approval.timesheets;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/approvals')} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-semibold text-text-primary">Timesheet Approval</h2>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Timesheet Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Employee', value: fullName(ts?.users) },
            { label: 'Date', value: formatDate(ts?.date) },
            { label: 'Client', value: ts?.clients?.client_name },
            { label: 'Assignment', value: ts?.assignments?.title || '—' },
            { label: 'Hours', value: formatHours(ts?.hours_worked) },
            { label: 'Type', value: ts?.is_billable ? 'Billable' : 'Non-Billable' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-xs text-text-secondary">Task Description</p>
          <p className="text-sm text-text-primary mt-1 bg-gray-50 p-3 rounded-lg">{ts?.task_description}</p>
        </div>
        {ts?.remarks && (
          <div className="mt-3">
            <p className="text-xs text-text-secondary">Remarks</p>
            <p className="text-sm text-text-secondary mt-1">{ts.remarks}</p>
          </div>
        )}
      </Card>

      {approval.status === 'pending' && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Review Action</h3>
          <div className="mb-4">
            <label className="text-sm font-medium text-text-primary block mb-1">Comments</label>
            <textarea
              rows={3}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Required for rejection or sending back..."
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button icon={CheckCircle} variant="success" loading={processing} onClick={() => handleAction('approve')}>
              Approve
            </Button>
            <Button icon={XCircle} variant="danger" loading={processing} onClick={() => handleAction('reject')}>
              Reject
            </Button>
            <Button icon={RotateCcw} variant="warning" loading={processing} onClick={() => handleAction('send_back')}>
              Send Back
            </Button>
          </div>
        </Card>
      )}

      {approval.status !== 'pending' && (
        <Card>
          <div className="flex items-center gap-3">
            <Badge className={approval.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
              {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
            </Badge>
            {approval.comments && <p className="text-sm text-text-secondary">{approval.comments}</p>}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ApprovalDetail;
