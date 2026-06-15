import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, AlertCircle, CheckCircle2, Clock, ClipboardList,
  ChevronRight, Filter, BarChart2, User, Calendar, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { assignmentService } from '../services/assignmentService';

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const isOverdue = (a) =>
  a.due_date && a.due_date < today() && !['completed', 'closed', 'cancelled'].includes(a.status);

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  high:     'bg-orange-100 text-orange-700 border border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low:      'bg-green-100 text-green-700 border border-green-200',
  urgent:   'bg-red-100 text-red-700 border border-red-200',
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
  pending:     'Pending',
  open:        'Open',
  in_progress: 'In Progress',
  review:      'In Review',
  completed:   'Completed',
  closed:      'Closed',
  cancelled:   'Cancelled',
};

const PRIORITY_LABELS = {
  critical: 'Critical', urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ value = 0, status }) => {
  const pct = Math.min(100, Math.max(0, parseInt(value) || 0));
  const color = status === 'completed' ? 'bg-green-500'
    : status === 'review' ? 'bg-purple-500'
    : pct >= 75 ? 'bg-blue-500'
    : pct >= 40 ? 'bg-indigo-400'
    : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
};

// ── Assignment Card (employee-friendly) ───────────────────────────────────────
const AssignmentCard = ({ assignment: a, onView }) => {
  const overdue = isOverdue(a);
  return (
    <div
      onClick={() => onView(a.id)}
      className={`bg-white rounded-xl border cursor-pointer hover:shadow-md transition-all p-4 space-y-3 ${
        overdue ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-primary/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.medium}`}>
              {PRIORITY_LABELS[a.priority] || a.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status] || STATUS_STYLES.pending}`}>
              {STATUS_LABELS[a.status] || a.status}
            </span>
            {overdue && (
              <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium">
                <AlertCircle size={11} /> Overdue
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mt-1.5 line-clamp-2">{a.title}</h3>
          {a.client_name && (
            <p className="text-xs text-gray-500 mt-0.5">{a.client_name}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>

      {/* Progress */}
      <ProgressBar value={a.progress} status={a.status} />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {a.due_date ? (
            <span className={overdue ? 'text-red-600 font-medium' : ''}>Due {fmtDate(a.due_date)}</span>
          ) : 'No due date'}
        </span>
        {a.assignment_type_name && (
          <span className="bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
            {a.assignment_type_name}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Admin/Partner Row ─────────────────────────────────────────────────────────
const AssignmentRow = ({ assignment: a, onView, onEdit, onDelete, canEdit }) => {
  const overdue = isOverdue(a);
  return (
    <tr
      onClick={() => onView(a.id)}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900 truncate">{a.title}</span>
              {overdue && (
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{a.client_name || '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.medium}`}>
          {PRIORITY_LABELS[a.priority] || a.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[a.status] || STATUS_STYLES.pending}`}>
          {STATUS_LABELS[a.status] || a.status}
        </span>
      </td>
      <td className="px-4 py-3 w-36">
        <ProgressBar value={a.progress} status={a.status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {a.manager_first_name ? `${a.manager_first_name} ${a.manager_last_name}` : '—'}
      </td>
      <td className={`px-4 py-3 text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
        {fmtDate(a.due_date)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {a.member_count ?? 0} {a.member_count === 1 ? 'member' : 'members'}
      </td>
      {canEdit && (
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => onEdit(a.id)}
              className="text-xs px-2 py-1 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(a.id, a.title)}
              className="text-xs px-2 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, onClick, active }) => (
  <button
    onClick={onClick}
    className={`text-left bg-white rounded-xl border p-4 transition-all hover:shadow-md flex items-center gap-3 ${
      active ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <Icon size={16} className="text-white" />
    </div>
    <div>
      <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </button>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AssignmentList = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const role = profile?.role || profile?.roles?.slug || 'employee';
  const isAdmin = ['super_admin', 'partner', 'hr'].includes(role);
  const canCreate = ['super_admin', 'partner', 'manager', 'hr'].includes(role);

  const [assignments, setAssignments] = useState([]);
  const [stats, setStats]     = useState(null);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [priority, setPriority] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        assignmentService.getAll({
          search, status, priority, page, pageSize: PAGE_SIZE,
          overdue: overdueOnly || undefined,
        }),
        isAdmin ? assignmentService.getStats().catch(() => null) : Promise.resolve(null),
      ]);
      setAssignments(res.data || []);
      setTotal(res.count || 0);
      if (statsRes) setStats(statsRes);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, overdueOnly, page, isAdmin]);

  useEffect(() => {
    const t = setTimeout(fetchData, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete assignment "${title}"? This cannot be undone.`)) return;
    try {
      await assignmentService.delete(id);
      toast.success('Assignment deleted');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const filterByStatus = (s) => {
    setStatus(status === s ? '' : s);
    setOverdueOnly(false);
    setPage(1);
  };

  // ── Employee view — card grid ───────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">My Assignments</h2>
            <p className="text-xs text-gray-500 mt-0.5">{total} assignment{total !== 1 ? 's' : ''} assigned to you</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search assignments..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5">
            {['in_progress', 'review', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => filterByStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  status === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            {status && (
              <button onClick={() => setStatus('')} className="text-xs px-2 py-1.5 text-gray-400 hover:text-gray-600">
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">No assignments found</p>
            <p className="text-xs text-gray-400 mt-1">Assignments given to you will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(a => (
              <AssignmentCard key={a.id} assignment={a} onView={id => navigate(`/assignments/${id}`)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <span className="text-xs px-3 py-1.5 text-gray-500">
              Page {page} of {Math.ceil(total / PAGE_SIZE)}
            </span>
            <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Admin / Partner view — table with stats ─────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Assignments</h2>
          <p className="text-xs text-gray-500 mt-0.5">{total} total assignments</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/assignments/new')}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> New Assignment
          </button>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Active"      value={stats.active}      icon={ClipboardList} color="bg-blue-500"   onClick={() => { filterByStatus(''); setOverdueOnly(false); }}  active={!status && !overdueOnly} />
          <StatCard label="Pending"     value={stats.pending}     icon={Clock}         color="bg-gray-400"   onClick={() => filterByStatus('pending')}      active={status==='pending'} />
          <StatCard label="In Progress" value={stats.in_progress} icon={BarChart2}     color="bg-indigo-500" onClick={() => filterByStatus('in_progress')}  active={status==='in_progress'} />
          <StatCard label="In Review"   value={stats.review ?? 0} icon={BookOpen}      color="bg-purple-500" onClick={() => filterByStatus('review')}       active={status==='review'} />
          <StatCard label="Completed"   value={stats.completed}   icon={CheckCircle2}  color="bg-green-500"  onClick={() => filterByStatus('completed')}    active={status==='completed'} />
          <StatCard label="Overdue"     value={stats.overdue}     icon={AlertCircle}   color="bg-red-500"    onClick={() => { setStatus(''); setOverdueOnly(o => !o); setPage(1); }} active={overdueOnly} />
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by title, client..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Priority</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No assignments found</p>
              {canCreate && (
                <button
                  onClick={() => navigate('/assignments/new')}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Create the first assignment
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignment</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Progress</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Team</th>
                  {canCreate && <th className="px-4 py-2.5 w-24" />}
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    onView={id => navigate(`/assignments/${id}`)}
                    onEdit={id => navigate(`/assignments/${id}/edit`)}
                    onDelete={handleDelete}
                    canEdit={canCreate}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentList;
