import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Upload, Save, X, CheckCircle, AlertCircle,
  IndianRupee, Users, FileSpreadsheet, Pencil, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/apiClient';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/common/Button';

// ── API helpers ──────────────────────────────────────────
const listEmployeeSalaries = () =>
  api.get('/payroll/employees/salaries').then(r => r.data.data);

const saveSalaryConfig = (userId, data) =>
  api.put(`/payroll/salary-config/${userId}`, data).then(r => r.data.data);

const downloadSalaryTemplate = async () => {
  const res = await api.get('/payroll/salary-template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a'); a.href = url;
  a.download = 'salary-config-template.xlsx'; a.click();
  window.URL.revokeObjectURL(url);
};

const uploadSalaryExcel = async (file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post('/payroll/employees/salaries/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

// ── Salary form modal ─────────────────────────────────────
const SALARY_FIELDS = [
  { key: 'monthlyGross',        label: 'Monthly Gross (₹)',    required: true },
  { key: 'basicPay',            label: 'Basic Pay (₹)' },
  { key: 'hra',                 label: 'HRA (₹)' },
  { key: 'conveyanceAllowance', label: 'Conveyance (₹)' },
  { key: 'medicalAllowance',    label: 'Medical Allow. (₹)' },
  { key: 'specialAllowance',    label: 'Special Allow. (₹)' },
  { key: 'pf',                  label: 'PF (₹)' },
  { key: 'esic',                label: 'ESIC (₹)' },
  { key: 'professionalTax',     label: 'Professional Tax (₹)' },
  { key: 'tds',                 label: 'TDS (₹)' },
  { key: 'workingDaysPerMonth', label: 'Working Days/Month',   required: true },
];

const SalaryModal = ({ employee, onClose, onSaved }) => {
  const [form, setForm] = useState({
    monthlyGross:        employee.monthly_gross        || '',
    basicPay:            employee.basic_pay            || '',
    hra:                 employee.hra                  || '',
    conveyanceAllowance: employee.conveyance_allowance || '',
    medicalAllowance:    employee.medical_allowance    || '',
    specialAllowance:    employee.special_allowance    || '',
    pf:                  employee.pf                   || '',
    esic:                employee.esic                 || '',
    professionalTax:     employee.professional_tax     || '',
    tds:                 employee.tds                  || '',
    workingDaysPerMonth: employee.working_days_per_month || 26,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.monthlyGross) return toast.error('Monthly Gross is required');
    setSaving(true);
    try {
      await saveSalaryConfig(employee.id, form);
      toast.success(`Salary saved for ${employee.first_name}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-text-primary">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-xs text-text-secondary">{employee.role_name} · {employee.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {SALARY_FIELDS.map(f => (
              <div key={f.key} className={f.key === 'monthlyGross' ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {f.label} {f.required && <span className="text-error">*</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            ))}
          </div>

          {/* Live net pay preview */}
          {form.monthlyGross > 0 && (
            <div className="mt-4 bg-primary/5 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-text-secondary">Estimated Net Pay</span>
              <span className="font-bold text-primary">
                {formatCurrency(
                  Math.max(0,
                    parseFloat(form.monthlyGross || 0)
                    - parseFloat(form.pf || 0)
                    - parseFloat(form.esic || 0)
                    - parseFloat(form.professionalTax || 0)
                    - parseFloat(form.tds || 0)
                  )
                )}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={13} className="mr-1" /> Save Salary
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────
const SalaryManager = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listEmployeeSalaries()
      .then(data => setEmployees(data || []))
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadSalaryExcel(file);
      toast.success(res.message || 'Salaries uploaded');
      if (res.data?.errors?.length) {
        res.data.errors.forEach(err => toast.error(err, { duration: 6000 }));
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const filtered = employees.filter(e =>
    `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(search.toLowerCase())
  );
  const configured = employees.filter(e => e.monthly_gross > 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Salary Management</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {configured}/{employees.length} employees configured
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadSalaryTemplate}>
            <Download size={14} className="mr-1" /> Download Template
          </Button>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border transition-colors
            ${uploading ? 'opacity-60 pointer-events-none' : 'border-primary text-primary hover:bg-primary/5'}`}>
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload Excel'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} disabled={uploading} />
          </label>
          <Button size="sm" onClick={() => navigate('/payroll')}>
            <ChevronRight size={14} className="mr-1" /> Go to Payroll Runs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{employees.length}</p>
          <p className="text-xs text-text-secondary mt-1">Total Employees</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{configured}</p>
          <p className="text-xs text-text-secondary mt-1">Salary Configured</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{employees.length - configured}</p>
          <p className="text-xs text-text-secondary mt-1">Not Configured</p>
        </div>
      </div>

      {/* How to use */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">How to set salaries:</p>
        <p>
          <strong>Option 1 — One by one:</strong> Click "Set Salary" next to any employee and fill the form.&nbsp;
          <strong>Option 2 — Bulk Excel:</strong> Download template → fill in Excel → Upload Excel (sets all at once).
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search employees…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {/* Employee table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Employee</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Gross</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary hidden sm:table-cell">Deductions</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Est. Net Pay</th>
              <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  No employees found
                </td>
              </tr>
            ) : filtered.map(emp => {
              const hasConfig = !!emp.monthly_gross;
              const deductions = (parseFloat(emp.pf || 0) + parseFloat(emp.esic || 0) +
                parseFloat(emp.professional_tax || 0) + parseFloat(emp.tds || 0));
              const netPay = hasConfig ? parseFloat(emp.monthly_gross) - deductions : 0;

              return (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-text-secondary">{emp.role_name} · {emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {hasConfig ? formatCurrency(emp.monthly_gross) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-error hidden sm:table-cell">
                    {hasConfig ? formatCurrency(deductions) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 hidden md:table-cell">
                    {hasConfig ? formatCurrency(netPay) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasConfig ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle size={11} /> Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        <AlertCircle size={11} /> Not set
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(emp)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <Pencil size={12} /> {hasConfig ? 'Edit' : 'Set Salary'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Salary modal */}
      {selected && (
        <SalaryModal
          employee={selected}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default SalaryManager;
