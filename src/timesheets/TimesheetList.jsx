import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Trash2, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { timesheetService } from '../services/timesheetService';
import { usePermissions } from '../hooks/usePermissions';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SearchBar from '../components/common/SearchBar';
import Select from '../components/common/Select';
import Pagination from '../components/common/Pagination';
import { formatDate, formatHours } from '../utils/formatters';
// Note: no Input import — DateInput is defined locally below
import { TIMESHEET_STATUS, TIMESHEET_STATUS_COLORS, TIMESHEET_STATUS_LABELS } from '../constants';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  ...Object.entries(TIMESHEET_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

const TimesheetList = () => {
  const navigate = useNavigate();
  const { profile, getFirmId } = useAuthStore();
  const { isManagerOrAbove } = usePermissions();
  const [timesheets, setTimesheets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewAll, setViewAll] = useState(false);

  const fetchTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await timesheetService.getAll({
        firmId: getFirmId(), userId: profile?.id,
        search, status, fromDate, toDate, page, pageSize,
        viewAll: viewAll && isManagerOrAbove(),
      });
      setTimesheets(data || []);
      setTotal(count || 0);
    } catch {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, [search, status, fromDate, toDate, page, pageSize, viewAll]);

  useEffect(() => {
    const timer = setTimeout(fetchTimesheets, 300);
    return () => clearTimeout(timer);
  }, [fetchTimesheets]);

  const handleBulkSubmit = async () => {
    if (!selected.length) return;
    try {
      await timesheetService.submit(selected, getFirmId());
      toast.success(`${selected.length} timesheet(s) submitted for approval`);
      setSelected([]);
      fetchTimesheets();
    } catch (err) {
      toast.error(err.message || 'Failed to submit timesheets');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this timesheet entry?')) return;
    try {
      await timesheetService.delete(id);
      toast.success('Timesheet deleted');
      fetchTimesheets();
    } catch {
      toast.error('Cannot delete submitted timesheet');
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const draftIds = timesheets.filter(t => t.status === 'draft').map(t => t.id);
    if (selected.length === draftIds.length) setSelected([]);
    else setSelected(draftIds);
  };

  const draftCount = timesheets.filter(t => t.status === 'draft').length;

  const columns = [
    {
      key: 'select',
      header: (
        <input type="checkbox"
          checked={selected.length === draftCount && draftCount > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4 text-primary border-border rounded" />
      ),
      width: '40px',
      render: (_, row) => row.status === 'draft' ? (
        <input type="checkbox"
          checked={selected.includes(row.id)}
          onChange={(e) => toggleSelect(row.id, e)}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 text-primary border-border rounded" />
      ) : null,
    },
    {
      key: 'date',
      header: 'Date',
      render: v => <span className="font-medium text-text-primary">{formatDate(v)}</span>
    },
    {
      key: 'clients',
      header: 'Client',
      render: v => v?.client_name || '—'
    },
    {
      key: 'assignments',
      header: 'Assignment',
      render: v => v?.title || '—',
    },
    {
      key: 'task_description',
      header: 'Task',
      render: v => <span className="line-clamp-1">{v}</span>
    },
    {
      key: 'hours_worked',
      header: 'Hours',
      render: (v, row) => (
        <div>
          <span className="font-medium text-text-primary">{formatHours(v)}</span>
          {!row.is_billable && <span className="text-xs text-text-secondary ml-1">(NB)</span>}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: v => <Badge className={TIMESHEET_STATUS_COLORS[v]}>{TIMESHEET_STATUS_LABELS[v]}</Badge>
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          {row.status === 'draft' && (
            <button onClick={(e) => handleDelete(row.id, e)}
              className="p-1.5 hover:bg-red-50 rounded-md text-text-secondary hover:text-error transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Add employee column when manager views all
  if (viewAll && isManagerOrAbove()) {
    columns.splice(1, 0, {
      key: 'users',
      header: 'Employee',
      render: v => v ? `${v.first_name} ${v.last_name}` : '—'
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Timesheets</h2>
          <p className="text-xs text-text-secondary mt-0.5">{total} entries</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button size="sm" icon={Send} onClick={handleBulkSubmit} variant="success">
              Submit {selected.length} Selected
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={Calendar} onClick={() => navigate('/timesheets/weekly')}>
            Weekly View
          </Button>
          <Button size="sm" icon={Plus} onClick={() => navigate('/timesheets/entry')}>Log Time</Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by task description..." className="flex-1 min-w-48" />
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS} placeholder="" className="w-40" />
          <DateInput type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="w-36" style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E5EAF2', borderRadius: '8px' }} />
          <DateInput type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="w-36" style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E5EAF2', borderRadius: '8px' }} />
          {isManagerOrAbove() && (
            <label className="flex items-center gap-2 cursor-pointer px-1">
              <input type="checkbox" checked={viewAll} onChange={e => setViewAll(e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded" />
              <span className="text-sm text-text-secondary">All Employees</span>
            </label>
          )}
        </div>

        <Table columns={columns} data={timesheets} loading={loading} emptyMessage="No timesheet entries found" />

        <div className="px-4">
          <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }} />
        </div>
      </Card>
    </div>
  );
};

// Inline date input for date filters (named DateInput to avoid conflict with common Input)
const DateInput = ({ className, style, ...props }) => (
  <input className={`border rounded-lg text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${className}`} style={style} {...props} />
);

export default TimesheetList;
