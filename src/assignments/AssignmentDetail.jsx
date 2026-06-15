import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, AlertCircle, CheckCircle2, Clock, Users,
  Calendar, ChevronRight, BookOpen, ClipboardList, Loader2,
  Plus, ExternalLink, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { assignmentService } from '../services/assignmentService';
import apiClient from '../services/apiClient';

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysLeft = (due) => {
  if (!due) return null;
  const diff = Math.ceil((new Date(due) - new Date()) / 86400000);
  return diff;
};

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  urgent:   'bg-red-100 text-red-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-green-100 text-green-700',
};

const STATUS_STYLES = {
  pending:     'bg-gray-100 text-gray-600',
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  review:      'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  closed:      'bg-gray-200 text-gray-500',
  cancelled:   'bg-red-100 text-red-500',
};

const STATUS_LABELS = {
  pending: 'Pending', open: 'Open', in_progress: 'In Progress',
  review: 'In Review', completed: 'Completed', closed: 'Closed', cancelled: 'Cancelled',
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ value = 0, large }) => {
  const pct = Math.min(100, Math.max(0, parseInt(value) || 0));
  const color = pct === 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 40 ? 'bg-indigo-400' : 'bg-gray-300';
  return (
    <div className="space-y-1">
      <div className={`w-full ${large ? 'h-3' : 'h-2'} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {large && <p className="text-xs text-gray-500 text-right">{pct}% complete</p>}
    </div>
  );
};

// ── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-start gap-2 py-2 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
    <span className="text-xs font-medium text-gray-800 text-right">{value || '—'}</span>
  </div>
);

// ── Recent Daily Logs preview ─────────────────────────────────────────────────
const RecentLogs = ({ assignmentId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/daily-logs', { params: { assignmentId, limit: 5 } })
      .then(r => setLogs(r.data?.data?.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div className="h-12 bg-gray-50 animate-pulse rounded-lg" />;
  if (!logs.length) return (
    <p className="text-xs text-gray-400 italic py-2">No daily logs yet for this assignment.</p>
  );

  return (
    <div className="space-y-2">
      {logs.map(l => (
        <div key={l.id} className="flex items-start gap-3 text-xs">
          <span className="text-gray-400 flex-shrink-0 pt-0.5">{fmtDate(l.log_date)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-gray-700 line-clamp-2">{l.work_done}</p>
            {l.hours_worked > 0 && (
              <span className="text-gray-400">{l.hours_worked}h worked</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Employee Progress Updater ─────────────────────────────────────────────────
const ProgressUpdater = ({ assignment, onUpdated }) => {
  const [progress, setProgress] = useState(parseInt(assignment.progress) || 0);
  const [status, setStatus]     = useState(assignment.status || 'in_progress');
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await assignmentService.update(assignment.id, { progress, status });
      toast.success('Progress updated');
      onUpdated({ progress, status });
    } catch {
      toast.error('Failed to update progress');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
      <h4 className="text-sm font-semibold text-blue-900">Update My Progress</h4>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium">Progress</span>
          <span className="text-blue-700 font-bold">{progress}%</span>
        </div>
        <input
          type="range" min="0" max="100" step="5" value={progress}
          onChange={e => setProgress(parseInt(e.target.value))}
          className="w-full accent-primary h-2"
        />
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">My Status</label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
        >
          <option value="in_progress">In Progress</option>
          <option value="review">Ready for Review</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Save Progress
      </button>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const role = profile?.role || profile?.roles?.slug || 'employee';
  const isAdmin = ['super_admin', 'partner', 'hr'].includes(role);
  const canEdit = ['super_admin', 'partner', 'manager', 'hr'].includes(role);

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [adminStatus, setAdminStatus] = useState('');
  const [updatingAdminStatus, setUpdatingAdminStatus] = useState(false);

  useEffect(() => {
    setLoading(true);
    assignmentService.getById(id)
      .then(a => {
        setAssignment(a);
        setAdminStatus(a.status || 'pending');
      })
      .catch(() => toast.error('Assignment not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdminStatusChange = async (newStatus) => {
    setUpdatingAdminStatus(true);
    try {
      await assignmentService.update(id, { status: newStatus, progress: assignment.progress });
      setAssignment(a => ({ ...a, status: newStatus }));
      setAdminStatus(newStatus);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingAdminStatus(false);
    }
  };

  const handleProgressUpdate = ({ progress, status }) => {
    setAssignment(a => ({ ...a, progress, status }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Assignment not found.</p>
        <button onClick={() => navigate('/assignments')} className="mt-3 text-sm text-primary hover:underline">
          Back to assignments
        </button>
      </div>
    );
  }

  const due = assignment.due_date;
  const overdue = due && due < today() && !['completed', 'closed', 'cancelled'].includes(assignment.status);
  const dl = daysLeft(due);
  const progress = parseInt(assignment.progress) || 0;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/assignments')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex-shrink-0 mt-0.5 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[assignment.priority] || PRIORITY_STYLES.medium}`}>
                  {assignment.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[assignment.status] || STATUS_STYLES.pending}`}>
                  {STATUS_LABELS[assignment.status] || assignment.status}
                </span>
                {overdue && (
                  <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertCircle size={12} /> Overdue
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 mt-1.5">{assignment.title}</h2>
              {assignment.client_name && (
                <p className="text-sm text-gray-500 mt-0.5">{assignment.client_name}</p>
              )}
            </div>
            {canEdit && (
              <button
                onClick={() => navigate(`/assignments/${id}/edit`)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <ProgressBar value={progress} large />
          </div>
        </div>
      </div>

      {/* Due date / days left banner */}
      {due && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
          overdue ? 'bg-red-50 text-red-700 border border-red-200'
          : dl !== null && dl <= 7 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          : 'bg-gray-50 text-gray-600 border border-gray-200'
        }`}>
          <Calendar size={14} />
          Due {fmtDate(due)}
          {dl !== null && !overdue && dl <= 30 && (
            <span className="ml-1 text-xs opacity-75">({dl} day{dl !== 1 ? 's' : ''} left)</span>
          )}
          {overdue && dl !== null && (
            <span className="ml-1 text-xs">(overdue by {Math.abs(dl)} day{Math.abs(dl) !== 1 ? 's' : ''})</span>
          )}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          {assignment.description && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{assignment.description}</p>
            </div>
          )}

          {/* Employee: progress updater */}
          {!isAdmin && (
            <ProgressUpdater assignment={assignment} onUpdated={handleProgressUpdate} />
          )}

          {/* Quick actions — Daily Log & Weekly Report */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={`/daily-logs?assignmentId=${id}`}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardList size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Daily Log</p>
                <p className="text-xs text-gray-400">Log today's work on this assignment</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/weekly-reports"
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Weekly Report</p>
                <p className="text-xs text-gray-400">Submit your weekly summary</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 group-hover:text-primary transition-colors" />
            </Link>
          </div>

          {/* Recent Daily Logs */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Recent Daily Logs</h3>
              <Link
                to={`/daily-logs?assignmentId=${id}`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View all <ExternalLink size={11} />
              </Link>
            </div>
            <RecentLogs assignmentId={id} />
            <Link
              to={`/daily-logs?assignmentId=${id}`}
              className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus size={12} /> Add a log for today
            </Link>
          </div>

          {/* Team Members */}
          {assignment.members?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Team Members ({assignment.members.length})
              </h3>
              <div className="space-y-2">
                {assignment.members.map(m => (
                  <div key={m.id || m.user_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {(m.first_name?.[0] || '?')}{(m.last_name?.[0] || '')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{m.role_name || m.role}</p>
                    </div>
                    {m.role === 'manager' && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Manager
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          {assignment.remarks && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-yellow-800 mb-1">Remarks / Notes</h3>
              <p className="text-sm text-yellow-900 whitespace-pre-line">{assignment.remarks}</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Admin: status control */}
          {canEdit && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Assignment Status
              </h3>
              <select
                value={adminStatus}
                onChange={e => handleAdminStatusChange(e.target.value)}
                disabled={updatingAdminStatus}
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {updatingAdminStatus && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> Saving…
                </p>
              )}
            </div>
          )}

          {/* Progress stat */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Progress</h3>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={progress === 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="3"
                    strokeDasharray={`${progress} ${100 - progress}`}
                    strokeLinecap="round"
                    strokeDashoffset="0"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                  {progress}%
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{progress}%</p>
                <p className="text-xs text-gray-400">
                  {progress === 100 ? 'Completed' : progress >= 75 ? 'Nearly done' : progress >= 40 ? 'In progress' : 'Just started'}
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Details</h3>
            <InfoRow label="Client" value={assignment.client_name} />
            <InfoRow label="Type" value={assignment.assignment_type_name} />
            <InfoRow label="Priority" value={assignment.priority} />
            <InfoRow label="Start Date" value={fmtDate(assignment.start_date)} />
            <InfoRow label="Due Date" value={fmtDate(assignment.due_date)} />
            {assignment.estimated_hours && (
              <InfoRow label="Est. Hours" value={`${assignment.estimated_hours}h`} />
            )}
            <InfoRow
              label="Manager"
              value={assignment.manager_first_name
                ? `${assignment.manager_first_name} ${assignment.manager_last_name}`
                : null}
            />
          </div>

          {/* Admin: monitoring links */}
          {isAdmin && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Monitoring</h3>
              <Link
                to={`/daily-logs?assignmentId=${id}`}
                className="flex items-center justify-between text-xs text-gray-600 hover:text-primary py-1.5 transition-colors"
              >
                <span className="flex items-center gap-2"><ClipboardList size={13} /> View All Daily Logs</span>
                <ChevronRight size={13} />
              </Link>
              <Link
                to="/weekly-reports"
                className="flex items-center justify-between text-xs text-gray-600 hover:text-primary py-1.5 transition-colors"
              >
                <span className="flex items-center gap-2"><BookOpen size={13} /> Review Weekly Reports</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;
