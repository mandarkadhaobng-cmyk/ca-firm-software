import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RefreshCw, ChevronRight, CheckCircle, Clock, Send,
  Download, Upload, Search, IndianRupee, Users, AlertCircle,
  FileText, MailCheck, MailX, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../services/payrollService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/common/Button';
import { usePermissions } from '../../hooks/usePermissions';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const STATUS_BADGE = {
  draft:    { label: 'Draft',    cls: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  sent:     { label: 'Sent',     cls: 'bg-blue-100 text-blue-700' },
};

const StatusBadge = ({ status }) => {
  const b = STATUS_BADGE[status] || STATUS_BADGE.draft;
  return <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + b.cls}>{b.label}</span>;
};

// ── Salary Modal ────────────────────────────────────────────
const SalaryModal = ({ employee, onClose, onSaved }) => {
  const [amount, setAmount] = useState(employee.monthly_salary || '');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0)
      return toast.error('Enter a valid monthly salary');
    setSaving(true);
    try {
      await svc.upsertSalaryConfig(employee.id, { monthlySalary: parseFloat(amount), notes });
      toast.success('Salary saved for ' + employee.first_name);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-text-primary mb-1">
          {employee.monthly_salary ? 'Edit Salary' : 'Set Salary'}
        </h3>
        <p className="text-sm text-text-secondary mb-5">
          {employee.first_name} {employee.last_name} · {employee.role_name}
        </p>

        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Monthly Salary (₹)
        </label>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <IndianRupee size={14} />
          </span>
          <input
            type="number" min="0" step="100"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 30000"
            className="w-full border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {parseFloat(amount) > 0 && (
          <div className="bg-primary/5 rounded-lg p-3 mb-4 text-xs text-text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Monthly Salary</span>
              <span className="font-medium text-text-primary">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Per Day (÷ ~26 days)</span>
              <span>{formatCurrency(parseFloat(amount) / 26)}</span>
            </div>
          </div>
        )}

        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. revised from April 2026"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-5"
        />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </div>
    </div>
  );
};

// ── New Run Modal ───────────────────────────────────────────
const NewRunModal = ({ onClose, onCreated }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      const run = await svc.getOrCreateRun(month, year);
      toast.success('Payroll run created for ' + MONTHS_FULL[month - 1] + ' ' + year);
      onCreated(run);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const years = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-text-primary mb-5">New Payroll Run</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Month</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Year</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handle} loading={saving}>Create Run</Button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────
const PayrollDashboard = () => {
  const navigate = useNavigate();
  const { roleSlug } = usePermissions();
  const isHR      = ['super_admin','partner','hr'].includes(roleSlug);
  const isPartner = ['super_admin','partner'].includes(roleSlug);

  const [tab, setTab] = useState('runs');
  const [runs,    setRuns]    = useState([]);
  const [empList, setEmpList] = useState([]);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);

  const [salaryModal, setSalaryModal] = useState(null); // employee object
  const [newRunModal, setNewRunModal] = useState(false);

  // Load runs
  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await svc.listRuns({ year: yearFilter });
      setRuns(data || []);
    } catch { toast.error('Failed to load payroll runs'); }
    finally { setLoading(false); }
  }, [yearFilter]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Load employees (only when Salary Setup tab opens)
  const loadEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const data = await svc.listEmployeeSalaries();
      setEmpList(data || []);
    } catch (err) { toast.error(err?.response?.data?.message || err?.message || 'Failed to load employee salaries'); }
    finally { setEmpLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'salary' && isHR) loadEmployees();
  }, [tab, isHR, loadEmployees]);

  const filteredEmp = empList.filter(e =>
    !search || (e.first_name + ' ' + e.last_name + ' ' + (e.email || '') + ' ' + (e.employee_code || ''))
      .toLowerCase().includes(search.toLowerCase())
  );

  const configured   = empList.filter(e => e.monthly_salary > 0).length;
  const notConfigured = empList.length - configured;

  const curYear = new Date().getFullYear();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Payroll</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage salary runs and employee payslips</p>
        </div>
        {isHR && tab === 'runs' && (
          <Button size="sm" onClick={() => setNewRunModal(true)}>
            <Plus size={14} className="mr-1.5" /> New Run
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        {[
          { key: 'runs',   label: 'Payroll Runs' },
          ...(isHR ? [{ key: 'salary', label: 'Salary Setup' }] : []),
        ].map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={'pb-3 text-sm font-medium border-b-2 transition-colors ' +
              (tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PAYROLL RUNS TAB ── */}
      {tab === 'runs' && (
        <div className="space-y-4">
          {/* Year filter */}
          <div className="flex gap-2">
            {[curYear - 1, curYear, curYear + 1].map(y => (
              <button key={y} onClick={() => setYearFilter(y)}
                className={'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ' +
                  (yearFilter === y
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200')}>
                {y}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No payroll runs for {yearFilter}</p>
              {isHR && (
                <Button size="sm" variant="outline" className="mt-4"
                  onClick={() => setNewRunModal(true)}>
                  <Plus size={13} className="mr-1" /> Create First Run
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map(run => (
                <div key={run.id}
                  className="bg-white border border-border rounded-xl p-4 hover:shadow-sm
                             transition-shadow cursor-pointer group"
                  onClick={() => navigate('/payroll/runs/' + run.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center
                                    justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-base leading-tight">
                        {MONTHS[run.month - 1]}
                      </span>
                      <span className="text-primary/60 text-xs">{run.year}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary text-sm">
                          {MONTHS_FULL[run.month - 1]} {run.year}
                        </span>
                        <StatusBadge status={run.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                        <span>{run.slip_count || 0} employees</span>
                        {run.total_net > 0 && (
                          <span className="font-medium text-text-primary">
                            {formatCurrency(run.total_net)}
                          </span>
                        )}
                        {run.status === 'approved' && run.emails_sent > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <MailCheck size={11} />
                            {run.emails_sent} sent
                          </span>
                        )}
                        {run.emails_failed > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <MailX size={11} />
                            {run.emails_failed} failed
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-text-secondary flex-shrink-0
                      group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SALARY SETUP TAB ── */}
      {tab === 'salary' && isHR && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Employees', value: empList.length, icon: Users, color: 'text-primary' },
              { label: 'Salary Configured', value: configured, icon: CheckCircle, color: 'text-green-600' },
              { label: 'Not Configured', value: notConfigured, icon: AlertCircle, color: 'text-amber-500' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <c.icon size={16} className={c.color} />
                  <span className="text-xs text-text-secondary">{c.label}</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search employee…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Employee table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {empLoading ? (
              <div className="divide-y divide-border">
                {[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse bg-gray-50" />)}
              </div>
            ) : filteredEmp.length === 0 ? (
              <div className="py-10 text-center text-text-secondary text-sm">No employees found</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEmp.map(emp => (
                  <div key={emp.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center
                                    flex-shrink-0 text-primary text-xs font-bold">
                      {(emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {emp.role_name}
                        {emp.employee_code ? ' · ' + emp.employee_code : ''}
                      </p>
                    </div>

                    <div className="text-right mr-2">
                      {emp.monthly_salary > 0 ? (
                        <p className="text-sm font-semibold text-text-primary">
                          {formatCurrency(emp.monthly_salary)}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500 font-medium">Not set</p>
                      )}
                      <p className="text-xs text-text-secondary">/ month</p>
                    </div>

                    <Button
                      size="sm" variant="outline"
                      onClick={() => setSalaryModal(emp)}>
                      {emp.monthly_salary > 0 ? 'Edit' : 'Set Salary'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {salaryModal && (
        <SalaryModal
          employee={salaryModal}
          onClose={() => setSalaryModal(null)}
          onSaved={loadEmployees}
        />
      )}
      {newRunModal && (
        <NewRunModal
          onClose={() => setNewRunModal(false)}
          onCreated={(run) => {
            loadRuns();
            navigate('/payroll/runs/' + run.id);
          }}
        />
      )}
    </div>
  );
};

export default PayrollDashboard;
