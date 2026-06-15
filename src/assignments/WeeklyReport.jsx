import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Save, Send, CheckCircle2,
  Loader2, FileText, Clock, User, MessageSquare, X,
  Search, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import apiClient from '../services/apiClient';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '';

const fmtShort = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short',
  }) : '';

function weekStart(date = new Date()) {
  const d   = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function addWeeks(startStr, n) {
  const d = new Date(startStr + 'T00:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function weekEndOf(startStr) {
  const d = new Date(startStr + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

const thisWeek = weekStart();

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none';

const STATUS_STYLES = {
  draft:     'bg-gray-100 text-gray-500',
  submitted: 'bg-blue-100 text-blue-700',
  reviewed:  'bg-green-100 text-green-700',
};

// ── Report Field ───────────────────────────────────────────────────────────────
const ReportField = ({ label, hint, value, onChange, readOnly, rows = 4, required }) => (
  <div className="space-y-1.5">
    <div>
      <label className="text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
    {readOnly ? (
      <div className="w-full px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-700 whitespace-pre-line min-h-12">
        {value || <span className="text-gray-400 italic">Not filled</span>}
      </div>
    ) : (
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
        placeholder={hint} className={inputCls} />
    )}
  </div>
);

// ── Read-only Report View ──────────────────────────────────────────────────────
const ReportView = ({ report }) => (
  <div className="space-y-4">
    {report.total_hours != null && (
      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 w-fit">
        <Clock size={13} className="text-blue-600" />
        <span className="text-xs font-medium text-blue-700">Total hours: {report.total_hours}h</span>
      </div>
    )}
    <ReportField label="✅ Completed This Week"     value={report.completed_work} readOnly />
    <ReportField label="🔄 Pending / Carry-Forward"  value={report.pending_work}   readOnly />
    <ReportField label="🚧 Blockers & Issues"        value={report.blockers}       readOnly />
    <ReportField label="📅 Plan for Next Week"       value={report.next_week_plan} readOnly />
    {report.other_work && (
      <ReportField label="🗂 Other Work"             value={report.other_work}     readOnly />
    )}
  </div>
);

// ── Admin Review Panel ─────────────────────────────────────────────────────────
const AdminReviewPanel = ({ report, onReview, onCancel }) => {
  const [remarks, setRemarks] = useState(report.reviewer_remarks || '');
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try { await onReview(report.id, remarks); } finally { setSaving(false); }
  };

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700">Your Review Remarks (optional)</label>
        {onCancel && (
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>
      <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)}
        placeholder="Add feedback, guidance, or observations for this employee..."
        className={`${inputCls} bg-green-50 border-green-200`} autoFocus />
      <button onClick={handleSubmit} disabled={saving}
        className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Mark as Reviewed
      </button>
    </div>
  );
};

// ── Week Navigator Bar ─────────────────────────────────────────────────────────
const WeekNav = ({ currentWeek, onChange, disableForward }) => {
  const end = weekEndOf(currentWeek);
  const isCurrent = currentWeek === thisWeek;
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
      <button
        onClick={() => onChange(addWeeks(currentWeek, -1))}
        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">
          {fmtShort(currentWeek)} — {fmtDate(end)}
        </p>
        {isCurrent && (
          <p className="text-xs text-primary mt-0.5">Current Week</p>
        )}
      </div>
      <button
        onClick={() => onChange(addWeeks(currentWeek, 1))}
        disabled={disableForward || currentWeek >= thisWeek}
        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
const WeeklyReport = () => {
  const { profile } = useAuthStore();
  const role    = profile?.role || profile?.roles?.slug || 'employee';
  const isAdmin = ['super_admin', 'partner', 'hr', 'manager'].includes(role);

  // ── Shared week state ────────────────────────────────────────────────────────
  const [currentWeek, setCurrentWeek] = useState(thisWeek);

  // ── Employee state ───────────────────────────────────────────────────────────
  const [myReport, setMyReport]   = useState(null);
  const [myLoading, setMyLoading] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({
    completedWork: '', pendingWork: '', blockers: '',
    nextWeekPlan: '', otherWork: '', totalHours: '',
  });

  // ── Admin state ──────────────────────────────────────────────────────────────
  const [weekReports, setWeekReports]       = useState([]);
  const [adminLoading, setAdminLoading]     = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [reviewing, setReviewing]           = useState(false);

  // ── Fetch employee's own report for the selected week ────────────────────────
  const fetchMyReport = useCallback(async () => {
    if (isAdmin) return;
    setMyLoading(true);
    try {
      const { data } = await apiClient.get('/weekly-reports/current', {
        params: { weekStart: currentWeek },
      });
      const r = data?.data;
      setMyReport(r || null);
      if (r?.id) {
        setForm({
          completedWork: r.completed_work || '',
          pendingWork:   r.pending_work   || '',
          blockers:      r.blockers       || '',
          nextWeekPlan:  r.next_week_plan || '',
          otherWork:     r.other_work     || '',
          totalHours:    r.total_hours    ?? '',
        });
      } else {
        setForm({ completedWork: '', pendingWork: '', blockers: '', nextWeekPlan: '', otherWork: '', totalHours: '' });
      }
    } catch {
      setMyReport(null);
    } finally {
      setMyLoading(false);
    }
  }, [currentWeek, isAdmin]);

  useEffect(() => { fetchMyReport(); }, [fetchMyReport]);

  // ── Fetch all reports for admin for the selected week ────────────────────────
  const fetchWeekReports = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const { data } = await apiClient.get('/weekly-reports', {
        params: {
          fromWeek: currentWeek,
          toWeek:   currentWeek,
          limit: 100,
          status: filterStatus || undefined,
        },
      });
      const payload = data?.data;
      const rows    = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setWeekReports(rows);
      // Reset selection if it's no longer in the list
      setSelectedReport(prev =>
        prev ? (rows.find(r => r.id === prev.id) || null) : null
      );
    } catch {
      setWeekReports([]);
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin, currentWeek, filterStatus]);

  useEffect(() => { fetchWeekReports(); }, [fetchWeekReports]);

  // ── Save / submit (employee) ─────────────────────────────────────────────────
  const handleSave = async (submit = false) => {
    if (submit && !form.completedWork.trim()) {
      toast.error('Please fill in what you completed before submitting');
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.post('/weekly-reports', {
        weekStart: currentWeek,
        ...form,
        submit,
      });
      setMyReport(data?.data);
      toast.success(submit ? '✅ Weekly report submitted!' : 'Draft saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  // ── Review (admin) ───────────────────────────────────────────────────────────
  const handleReview = async (id, reviewerRemarks) => {
    try {
      await apiClient.patch(`/weekly-reports/${id}/review`, { reviewerRemarks });
      toast.success('Report reviewed');
      setReviewing(false);
      // Update selected report inline
      setSelectedReport(prev =>
        prev?.id === id
          ? { ...prev, status: 'reviewed', reviewer_remarks: reviewerRemarks,
              reviewer_first: profile?.first_name, reviewer_last: profile?.last_name }
          : prev
      );
      fetchWeekReports();
    } catch { toast.error('Failed to mark as reviewed'); }
  };

  const isSubmitted = myReport?.status === 'submitted' || myReport?.status === 'reviewed';

  // ── Admin view stats ─────────────────────────────────────────────────────────
  const total      = weekReports.length;
  const submitted  = weekReports.filter(r => r.status === 'submitted').length;
  const reviewed   = weekReports.filter(r => r.status === 'reviewed').length;
  const pending    = submitted; // "submitted" = awaiting review

  const filteredList = weekReports.filter(r => {
    if (searchTerm) {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      if (!name.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ADMIN VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if (isAdmin) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-gray-900">Weekly Reports</h2>
          <p className="text-xs text-gray-500 mt-0.5">Review and provide feedback on team submissions</p>
        </div>

        {/* Week navigator */}
        <WeekNav currentWeek={currentWeek} onChange={w => { setCurrentWeek(w); setSelectedReport(null); }} />

        {/* Stats row */}
        {!adminLoading && total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Submitted', value: total,     color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Pending Review',  value: pending,   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
              { label: 'Reviewed',        value: reviewed,  color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main split layout */}
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* Left: employee list */}
          <div className="lg:w-64 flex-shrink-0 space-y-2">
            {/* Search + status filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none text-gray-600">
                <option value="">All</option>
                <option value="submitted">Pending</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>

            {adminLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
                <FileText size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">
                  {total === 0 ? 'No reports for this week' : 'No matches'}
                </p>
              </div>
            ) : (
              filteredList.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedReport(r); setReviewing(false); }}
                  className={`w-full text-left bg-white border rounded-xl p-3 transition-all hover:shadow-sm ${
                    selectedReport?.id === r.id
                      ? 'border-primary ring-1 ring-primary/20 shadow-sm'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {r.first_name?.[0]}{r.last_name?.[0]}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {r.first_name} {r.last_name}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[r.status] || STATUS_STYLES.draft}`}>
                      {r.status === 'submitted' ? 'Pending' : r.status}
                    </span>
                  </div>
                  {r.total_hours != null && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {r.total_hours}h
                    </p>
                  )}
                  {r.status === 'submitted' && (
                    <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-0.5">
                      <AlertCircle size={10} /> Awaiting review
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Right: report detail */}
          <div className="flex-1 min-w-0">
            {selectedReport ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
                {/* Report header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        {selectedReport.first_name} {selectedReport.last_name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedReport.status] || STATUS_STYLES.draft}`}>
                        {selectedReport.status === 'submitted' ? 'Pending Review' : selectedReport.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Week of {fmtDate(selectedReport.week_start)} – {fmtDate(selectedReport.week_end)}
                    </p>
                    {selectedReport.submitted_at && (
                      <p className="text-xs text-gray-400">
                        Submitted {fmtDate(selectedReport.submitted_at?.split('T')[0])}
                      </p>
                    )}
                  </div>
                  {selectedReport.status === 'submitted' && !reviewing && (
                    <button
                      onClick={() => setReviewing(true)}
                      className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 size={13} /> Review Report
                    </button>
                  )}
                </div>

                {/* Report content */}
                <ReportView report={selectedReport} />

                {/* Existing reviewer remarks */}
                {selectedReport.status === 'reviewed' && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={13} className="text-green-600" />
                      <p className="text-xs font-semibold text-green-700">
                        Reviewed by {selectedReport.reviewer_first} {selectedReport.reviewer_last}
                      </p>
                    </div>
                    {selectedReport.reviewer_remarks ? (
                      <p className="text-sm text-green-800 mt-1">{selectedReport.reviewer_remarks}</p>
                    ) : (
                      <p className="text-xs text-green-600 italic">No remarks added</p>
                    )}
                  </div>
                )}

                {/* Admin review panel */}
                {reviewing && (
                  <AdminReviewPanel
                    report={selectedReport}
                    onReview={handleReview}
                    onCancel={() => setReviewing(false)}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-white border border-dashed border-gray-300 rounded-xl">
                <div className="text-center">
                  <FileText size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">Select an employee to review their report</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // EMPLOYEE VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Weekly Report</h2>
        <p className="text-xs text-gray-500 mt-0.5">Submit your weekly work summary to your manager</p>
      </div>

      {/* Week navigator */}
      <WeekNav currentWeek={currentWeek} onChange={setCurrentWeek} />

      {/* Status banners */}
      {myReport?.status === 'submitted' && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} className="text-blue-600" />
          <p className="text-sm text-blue-800 font-medium">Report submitted for this week</p>
        </div>
      )}
      {myReport?.status === 'reviewed' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} className="text-green-600" />
          <div>
            <p className="text-sm text-green-800 font-medium">
              Report reviewed by {myReport.reviewer_first} {myReport.reviewer_last}
            </p>
            {myReport.reviewer_remarks && (
              <p className="text-xs text-green-700 mt-0.5">{myReport.reviewer_remarks}</p>
            )}
          </div>
        </div>
      )}

      {myLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          {isSubmitted ? (
            /* Read-only view for submitted/reviewed */
            <ReportView report={myReport} />
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Total Hours This Week</label>
                <input type="number" min="0" step="0.25" value={form.totalHours}
                  onChange={e => setForm(f => ({ ...f, totalHours: e.target.value }))}
                  placeholder="e.g. 42"
                  className="w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              <ReportField
                label="✅ What did you complete this week?"
                hint="List the tasks, assignments, or deliverables you finished"
                required
                value={form.completedWork}
                onChange={v => setForm(f => ({ ...f, completedWork: v }))}
              />
              <ReportField
                label="🔄 What is still pending or in progress?"
                hint="Work that carries over to next week"
                value={form.pendingWork}
                onChange={v => setForm(f => ({ ...f, pendingWork: v }))}
              />
              <ReportField
                label="🚧 Any blockers or issues?"
                hint="Mention dependencies, challenges, or support needed"
                rows={3}
                value={form.blockers}
                onChange={v => setForm(f => ({ ...f, blockers: v }))}
              />
              <ReportField
                label="📅 Plan for next week"
                hint="What do you intend to accomplish next week?"
                value={form.nextWeekPlan}
                onChange={v => setForm(f => ({ ...f, nextWeekPlan: v }))}
              />
              <ReportField
                label="🗂 Other / Miscellaneous Work (optional)"
                hint="Ad-hoc tasks, internal work, or support not linked to an assignment"
                rows={2}
                value={form.otherWork}
                onChange={v => setForm(f => ({ ...f, otherWork: v }))}
              />

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Draft
                </button>
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Submit Report
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;
