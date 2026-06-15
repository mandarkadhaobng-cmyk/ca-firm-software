import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { assignmentService } from '../services/assignmentService';
import { clientService } from '../services/clientService';
import { employeeService } from '../services/employeeService';
import apiClient from '../services/apiClient';

// ── Helpers ───────────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = (err) =>
  `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
    err ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 focus:ring-primary/20 focus:border-primary'
  }`;

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
    <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">{title}</h3>
    {children}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const AssignmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isEdit = !!id;
  const role = profile?.role || profile?.roles?.slug || 'employee';

  const [loading, setLoading]       = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [clients, setClients]       = useState([]);
  const [types, setTypes]           = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [errors, setErrors]         = useState({});

  const [form, setForm] = useState({
    title: '',
    description: '',
    clientId: '',
    assignmentTypeId: '',
    managerId: '',
    priority: 'medium',
    status: 'pending',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    progress: 0,
    remarks: '',
    memberIds: [],
  });

  // Load dropdowns
  useEffect(() => {
    const load = async () => {
      try {
        const [cls, tps] = await Promise.all([
          clientService.getAllForSelect().catch(() => []),
          assignmentService.getAllTypes().catch(() => []),
        ]);
        setClients(cls);
        setTypes(tps);

        // Load employee list (excludes partners automatically via backend)
        const { data } = await apiClient.get('/employees', { params: { pageSize: 500 } });
        setEmployees(data?.data || data?.employees || []);
      } catch {}
    };
    load();
  }, []);

  // Load existing assignment for edit
  useEffect(() => {
    if (!isEdit) return;
    setPageLoading(true);
    assignmentService.getById(id).then(a => {
      setForm({
        title:            a.title || '',
        description:      a.description || '',
        clientId:         a.client_id || '',
        assignmentTypeId: a.assignment_type_id || '',
        managerId:        a.manager_id || '',
        priority:         a.priority || 'medium',
        status:           a.status || 'pending',
        startDate:        a.start_date?.split('T')[0] || '',
        dueDate:          a.due_date?.split('T')[0] || '',
        estimatedHours:   a.estimated_hours ?? '',
        progress:         a.progress ?? 0,
        remarks:          a.remarks || '',
        memberIds:        (a.members || []).map(m => m.user_id),
      });
      setPageLoading(false);
    }).catch(() => {
      toast.error('Failed to load assignment');
      navigate('/assignments');
    });
  }, [id, isEdit]);

  const set = (key) => (e) => {
    const val = e.target ? e.target.value : e;
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.dueDate)      errs.dueDate = 'Due date is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        title:            form.title.trim(),
        description:      form.description || null,
        clientId:         form.clientId || null,
        assignmentTypeId: form.assignmentTypeId || null,
        managerId:        form.managerId || null,
        priority:         form.priority,
        status:           form.status,
        startDate:        form.startDate || null,
        dueDate:          form.dueDate,
        estimatedHours:   form.estimatedHours ? parseFloat(form.estimatedHours) : null,
        progress:         parseInt(form.progress) || 0,
        remarks:          form.remarks || null,
        memberIds:        form.memberIds,
      };

      if (isEdit) {
        await assignmentService.update(id, payload);
        toast.success('Assignment updated');
      } else {
        await assignmentService.create(payload);
        toast.success('Assignment created');
      }
      navigate('/assignments');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (uid) => {
    setForm(f => ({
      ...f,
      memberIds: f.memberIds.includes(uid)
        ? f.memberIds.filter(id => id !== uid)
        : [...f.memberIds, uid],
    }));
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/assignments')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Assignment' : 'New Assignment'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isEdit ? 'Update assignment details' : 'Create a new client assignment'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core details */}
        <Section title="Assignment Details">
          <div className="col-span-2">
            <Field label="Assignment Title" required error={errors.title}>
              <input
                value={form.title}
                onChange={set('title')}
                placeholder="e.g., Statutory Audit FY 2025-26"
                className={inputCls(errors.title)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client / Project">
              <select value={form.clientId} onChange={set('clientId')} className={inputCls()}>
                <option value="">— Select client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.client_name}</option>
                ))}
              </select>
            </Field>

            <Field label="Assignment Type">
              <select value={form.assignmentTypeId} onChange={set('assignmentTypeId')} className={inputCls()}>
                <option value="">— Select type —</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select value={form.priority} onChange={set('priority')} className={inputCls()}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputCls()}>
                <option value="pending">Pending</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </Field>

            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={set('startDate')} className={inputCls()} />
            </Field>

            <Field label="Due Date" required error={errors.dueDate}>
              <input type="date" value={form.dueDate} onChange={set('dueDate')} className={inputCls(errors.dueDate)} />
            </Field>

            <Field label="Estimated Hours">
              <input
                type="number" min="0" step="0.5"
                value={form.estimatedHours}
                onChange={set('estimatedHours')}
                placeholder="0"
                className={inputCls()}
              />
            </Field>

            {isEdit && (
              <Field label={`Progress (${form.progress}%)`}>
                <input
                  type="range" min="0" max="100" step="5"
                  value={form.progress}
                  onChange={set('progress')}
                  className="w-full accent-primary"
                />
              </Field>
            )}
          </div>

          <Field label="Description / Scope">
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Describe the scope, objectives and deliverables of this assignment..."
              className={`${inputCls()} resize-none`}
            />
          </Field>

          <Field label="Remarks / Notes">
            <textarea
              rows={2}
              value={form.remarks}
              onChange={set('remarks')}
              placeholder="Any additional remarks or special instructions..."
              className={`${inputCls()} resize-none`}
            />
          </Field>
        </Section>

        {/* Team */}
        <Section title="Team Assignment">
          <Field label="Responsible Manager">
            <select value={form.managerId} onChange={set('managerId')} className={inputCls()}>
              <option value="">— Assign a manager —</option>
              {employees
                .filter(e => ['manager', 'hr'].includes(e.role || e.role_slug))
                .map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
            </select>
          </Field>

          {employees.length > 0 && (
            <Field label="Team Members">
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {employees.map(e => (
                  <label key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.memberIds.includes(e.id)}
                      onChange={() => toggleMember(e.id)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm text-gray-800">{e.first_name} {e.last_name}</p>
                      <p className="text-xs text-gray-400">{e.designation || e.role_name || ''}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{form.memberIds.length} member{form.memberIds.length !== 1 ? 's' : ''} selected</p>
            </Field>
          )}
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/assignments')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isEdit ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentForm;
