import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, CheckCircle2, Clock, Loader2,
  AlertCircle, X, MessageSquare, Filter, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import apiClient from '../services/apiClient';
import { assignmentService } from '../services/assignmentService';
import { employeeService } from '../services/employeeService';

// ── Helpers ────────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }) : '—';

const fmtDateShort = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short',
  }) : '—';

const isToday = (d) => d === todayStr();

const groupByDate = (logs) => {
  const map = new Map();
  for (const log of logs) {
    const key = log.log_date?.split('T')[0] || log.log_date || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(log);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
};

const STATUS_BADGE = {
  draft:     'bg-gray-100 text-gray-500 border border-gray-200',
  submitted: 'bg-blue-100 text-blue-700 border border-blue-200',
  reviewed:  'bg-green-100 text-green-700 border border-green-200',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

// ── Log Form ───────────────────────────────────────────────────────────────────
const LogForm = ({ assignments, initial, onSave, onCancel }) => {
  const [form, setForm] = useState({
    assignmentId: initial?.assignment_id || '',
    logDate:      initial?.log_date?.split('T')[0] || todayStr(),
    hoursWorked:  initial?.hours_worked ?? '',
    workDone:     initial?.work_done || '',
    blockers:     initial?.blockers || '',
  });
  const [saving, setSaving] = useState(false);
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.workDone.trim()) { toast.error('Work done description is required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 shadow-sm">
      <h4 className="text-sm font-semibold text-blue-900">
        {initial ? 'Edit Log Entry' : "Add Work Log"}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
          <input type="date" value={form.logDate} onChange={set('logDate')}
            max={todayStr()} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hours Worked</label>
          <input type="number" min="0" max="24" step="0.25" value={form.hoursWorked}
            onChange={set('hoursWorked')} placeholder="e.g. 7.5" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Assignment (optional)</label>
          <select value={form.assignmentId} onChange={set('assignmentId')} className={inputCls}>
            <option value="">— General / Other work —</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Work Done <span className="text-red-500">*</span>
        </label>
        <textarea ref={textRef} rows={3} value={form.workDone} onChange={set('workDone')}
          placeholder="Describe what you accomplished today..."
          className={`${inputCls} resize-none`} />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Blockers / Issues (if any)</label>
        <textarea rows={2} value={form.blockers} onChange={set('blockers')}
          placeholder="Any blockers, dependencies or issues..."
          className={`${inputCls} resize-none`} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {initial ? 'Update Log' : 'Submit Log'}
        </button>
        <button onClick={onCancel}
          className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Inline Review Panel ────────────────────────────────────────────────────────
const ReviewPanel = ({ log, onReview, onClose }) => {
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try { await onReview(log.id, remarks); } finally { setSaving(false); }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-green-800">Review Log — {log.first_name} {log.last_name}</p>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={13} />
        </button>
      </div>
      <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)}
        autoFocus
        placeholder="Add reviewer remarks / feedback (optional)..."
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-300 bg-white resize-none" />
      <div className="flex items-center gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-1 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          Mark Reviewed
        </button>
        <button onClick={onClose}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Employee log card ──────────────────────────────────────────────────────────
const LogCard = ({ log, canEdit, onEdit, onDelete }) => {
  const todayFlag = isToday(log.log_date?.split('T')[0]);
  return (
    <div className={`bg-white border rounded-xl p-4 space-y-2 transition-shadow hover:shadow-sm ${
      todayFlag ? 'border-primary/30 ring-1 ring-primary/10' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {log.hours_worked > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <Clock size={10} /> {log.hours_worked}h
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[log.status] || STATUS_BADGE.submitted}`}>
            {log.status}
          </span>
          {todayFlag && <span className="text-xs text-primary font-medium">Today</span>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(log)}
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(log.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {log.assignment_title && (
        <p className="text-xs text-primary/80 font-medium">{log.assignment_title}</p>
      )}
      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{log.work_done}</p>

      {log.blockers && (
        <div className="flex items-start gap-1.5 bg-yellow-50 border border-yellow-100 rounded-lg p-2.5">
          <AlertCircle size={12} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">{log.blockers}</p>
        </div>
      )}

      {log.status === 'reviewed' && (
        <div className="flex items-start gap-1.5 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          <MessageSquare size={12} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-green-700">
              Reviewed by {log.reviewer_first} {log.reviewer_last}
            </p>
            {log.reviewer_remarks && (
              <p className="text-xs text-green-800 mt-0.5">{log.reviewer_remarks}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Date group label ───────────────────────────────────────────────────────────
const DateLabel = ({ dateStr, logs }) => {
  const totalHours = logs.reduce((s, l) => s + (parseFloat(l.hours_worked) || 0), 0);
  return (
    <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
      <p className={`text-xs font-semibold ${isToday(dateStr) ? 'text-primary' : 'text-gray-500'}`}>
        {isToday(dateStr) ? '📅 Today' : fmtDate(dateStr)}
      </p>
      {totalHours > 0 && <span className="text-xs text-gray-400">{totalHours}h</span>}
    </div>
  );
};

// ── Admin table row ────────────────────────────────────────────────────────────
const AdminRow = ({ log, reviewingId, setReviewingId, onReview }) => {
  const isReviewing = reviewingId === log.id;
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-medium">
          {fmtDateShort(log.log_date?.split('T')[0])}
          {isToday(log.log_date?.split('T')[0]) && (
            <span className="ml-1.5 text-primary font-semibold">Today</span>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900">{log.first_name} {log.last_name}</p>
        </td>
        <td className="px-4 py-3 max-w-xs">
          <p className="text-xs text-gray-700 line-clamp-2">{log.work_done}</p>
          {log.assignment_title && (
            <p className="text-xs text-primary/70 mt-0.5 truncate">{log.assignment_title}</p>
          )}
          {log.blockers && (
            <p className="text-xs text-yellow-600 flex items-center gap-0.5 mt-0.5">
              <AlertCircle size={10} /> Blocker reported
            </p>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-gray-500">
            {log.hours_worked > 0 ? `${log.hours_worked}h` : '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[log.status] || STATUS_BADGE.submitted}`}>
            {log.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {log.status === 'submitted' && (
              <button
                onClick={() => setReviewingId(isReviewing ? null : log.id)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  isReviewing
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'text-green-600 border-green-200 hover:bg-green-50'
                }`}
              >
                <Eye size={11} />
                {isReviewing ? 'Reviewing…' : 'Review'}
              </button>
            )}
            {log.status === 'reviewed' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={11} /> Reviewed
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Reviewer remarks row (for already-reviewed logs) */}
      {log.status === 'reviewed' && log.reviewer_remarks && (
        <tr className="bg-green-50/40">
          <td colSpan={6} className="px-8 pb-2 pt-0">
            <p className="text-xs text-green-700 italic flex items-center gap-1">
              <MessageSquare size={10} />
              <span className="font-medium">{log.reviewer_first} {log.reviewer_last}:</span>
              {log.reviewer_remarks}
            </p>
          </td>
        </tr>
      )}

      {/* Inline review panel */}
      {isReviewing && (
        <tr className="bg-green-50/50">
          <td colSpan={6} className="px-4 py-3">
            <ReviewPanel
              log={log}
              onReview={onReview}
              onClose={() => setReviewingId(null)}
            />
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const DailyLog = () => {
  const { profile } = useAuthStore();
  const [searchParams] = useSearchParams();
  const urlAssignmentId = searchParams.get('assignmentId') || '';
  const role    = profile?.role || profile?.roles?.slug || 'employee';
  const isAdmin = ['super_admin', 'partner', 'hr', 'manager'].includes(role);

  const [logs, setLogs]               = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(!!urlAssignmentId);
  const [editLog, setEditLog]         = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate]                     = useState(todayStr);
  const [filterAssignmentId, setFilterAssignmentId] = useState(urlAssignmentId);
  const [filterUserId, setFilterUserId]         = useState('');
  const [filterStatus, setFilterStatus]         = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/daily-logs', {
        params: {
          fromDate,
          toDate,
          limit: 200,
          assignmentId: filterAssignmentId || undefined,
          userId:       filterUserId       || undefined,
          status:       filterStatus       || undefined,
        },
      });
      // Backend: success(res, { data: rows, total: N, ... })
      // Axios: data = { success: true, data: { data: [...], total: N } }
      const payload = data?.data;
      const rows    = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setLogs(rows);
      setTotal(payload?.total ?? rows.length);
    } catch (e) {
      if (e?.response?.status !== 404) toast.error('Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, filterAssignmentId, filterUserId, filterStatus]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    assignmentService.getDropdown().then(setAssignments).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin) {
      employeeService.getDropdown().then(setEmployees).catch(() => {});
    }
  }, [isAdmin]);

  const handleCreate = async (form) => {
    try {
      await apiClient.post('/daily-logs', form);
      toast.success('Log submitted');
      setShowForm(false);
      fetchLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save log');
    }
  };

  const handleUpdate = async (form) => {
    try {
      await apiClient.put(`/daily-logs/${editLog.id}`, form);
      toast.success('Log updated');
      setEditLog(null);
      fetchLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update log');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this log entry?')) return;
    try {
      await apiClient.delete(`/daily-logs/${id}`);
      toast.success('Log deleted');
      fetchLogs();
    } catch { toast.error('Failed to delete log'); }
  };

  const handleReview = async (id, reviewerRemarks) => {
    try {
      await apiClient.patch(`/daily-logs/${id}/review`, {
        status: 'reviewed',
        reviewerRemarks: reviewerRemarks || null,
      });
      toast.success('Log marked as reviewed');
      setReviewingId(null);
      fetchLogs();
    } catch { toast.error('Failed to review log'); }
  };

  const hasFilters = filterUserId || filterStatus || filterAssignmentId;
  const pendingCount = logs.filter(l => l.status === 'submitted').length;

  // ── ADMIN VIEW ─────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Daily Work Logs</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {total} {total === 1 ? 'entry' : 'entries'}
              {pendingCount > 0 && (
                <span className="ml-2 text-orange-600 font-medium">· {pendingCount} awaiting review</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg transition-colors ${
              showFilters || hasFilters
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            Filters
            {hasFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>
        </div>

        {/* Collapsible filter panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Employee</label>
                <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 text-gray-700">
                  <option value="">All employees</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 text-gray-700">
                  <option value="">All</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <button onClick={fetchLogs}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
                  Apply
                </button>
                {hasFilters && (
                  <button
                    onClick={() => { setFilterUserId(''); setFilterStatus(''); setFilterAssignmentId(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X size={11} /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-14">
              <Clock size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No log entries found</p>
              <p className="text-xs text-gray-400 mt-1">
                {hasFilters ? 'Try adjusting the filters above' : 'No logs submitted in this period'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Done</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Hrs</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <AdminRow
                      key={log.id}
                      log={log}
                      reviewingId={reviewingId}
                      setReviewingId={setReviewingId}
                      onReview={handleReview}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── EMPLOYEE VIEW ─────────────────────────────────────────────────────────
  const grouped = groupByDate(logs);
  const hasTodayLog = logs.some(l => isToday(l.log_date?.split('T')[0]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Daily Work Log</h2>
          <p className="text-xs text-gray-500 mt-0.5">{total} {total === 1 ? 'entry' : 'entries'}</p>
        </div>
        {!showForm && !editLog && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus size={14} /> {hasTodayLog ? 'Add Another Log' : "Log Today's Work"}
          </button>
        )}
      </div>

      {/* Today's reminder */}
      {!hasTodayLog && !showForm && !loading && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" />
            <p className="text-sm text-amber-800 font-medium">You haven't logged today's work yet</p>
          </div>
          <span className="text-xs text-amber-600 font-medium flex-shrink-0">Log now →</span>
        </button>
      )}

      {/* Date range + assignment filter */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-3">
        <span className="text-xs text-gray-500 font-medium">Show:</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" value={toDate} max={todayStr()} onChange={e => setToDate(e.target.value)}
          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        {assignments.length > 0 && (
          <select value={filterAssignmentId} onChange={e => setFilterAssignmentId(e.target.value)}
            className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 text-gray-600 max-w-48">
            <option value="">All assignments</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        )}
        {filterAssignmentId && (
          <button onClick={() => setFilterAssignmentId('')}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <LogForm
          assignments={assignments}
          initial={urlAssignmentId ? { assignment_id: urlAssignmentId } : null}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Grouped logs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
          <Clock size={34} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No logs in this period</p>
          <p className="text-xs text-gray-400 mt-1">Log your daily work to keep track of progress</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="mt-4 text-sm text-primary hover:underline">
              Add your first log
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateStr, dateLogs]) => (
            <div key={dateStr}>
              <DateLabel dateStr={dateStr} logs={dateLogs} />
              <div className="space-y-3">
                {dateLogs.map(log =>
                  editLog?.id === log.id ? (
                    <LogForm key={log.id} assignments={assignments} initial={log}
                      onSave={handleUpdate} onCancel={() => setEditLog(null)} />
                  ) : (
                    <LogCard key={log.id} log={log}
                      canEdit={log.status !== 'reviewed'}
                      onEdit={setEditLog}
                      onDelete={handleDelete}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyLog;
