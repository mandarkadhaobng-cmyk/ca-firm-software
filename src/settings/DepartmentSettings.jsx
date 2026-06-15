import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../services/settingsService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6',
];

const DepartmentSettings = () => {
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: 'dept'|'branch', item: null|{} }
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], head_id: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const [depts, brs] = await Promise.all([
        settingsService.getDepartments(),
        settingsService.getBranches(),
      ]);
      setDepartments(depts || []);
      setBranches(brs || []);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDept = (item = null) => {
    setForm(item
      ? { name: item.name, description: item.description || '', color: item.color || COLORS[0] }
      : { name: '', description: '', color: COLORS[0] }
    );
    setModal({ type: 'dept', item });
  };

  const openBranch = (item = null) => {
    setForm(item
      ? { name: item.name, address: item.address || '', phone: item.phone || '', is_head_office: item.is_head_office || false }
      : { name: '', address: '', phone: '', is_head_office: false }
    );
    setModal({ type: 'branch', item });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (modal.type === 'dept') {
        if (modal.item) {
          await settingsService.updateDepartment(modal.item.id, form);
          toast.success('Department updated');
        } else {
          await settingsService.createDepartment(form);
          toast.success('Department created');
        }
      } else {
        if (modal.item) {
          await settingsService.updateBranch(modal.item.id, form);
          toast.success('Branch updated');
        } else {
          await settingsService.createBranch(form);
          toast.success('Branch created');
        }
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      if (type === 'dept') await settingsService.deleteDepartment(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Cannot delete — item may be in use');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Departments & Branches</h1>
        <p className="text-sm text-text-secondary mt-0.5">Organise your firm's structure</p>
      </div>

      {/* Departments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-text-primary flex items-center gap-2">
            <Building size={16} className="text-primary" /> Departments
          </h2>
          <Button size="sm" icon={Plus} onClick={() => openDept()}>Add</Button>
        </div>

        {departments.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No departments"
            description="Add departments to organise your team"
            action={{ label: 'Add Department', onClick: () => openDept() }}
          />
        ) : (
          <div className="space-y-2">
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#6366f1' }} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{dept.name}</p>
                    {dept.description && <p className="text-xs text-text-secondary">{dept.description}</p>}
                    {dept.employee_count != null && (
                      <p className="text-xs text-text-secondary">{dept.employee_count} employee{dept.employee_count !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openDept(dept)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary"
                  ><Pencil size={14} /></button>
                  <button
                    onClick={() => handleDelete('dept', dept.id)}
                    disabled={deleting === dept.id}
                    className="p-1.5 rounded-md hover:bg-red-50 text-text-secondary hover:text-error disabled:opacity-50"
                  ><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Branches */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-text-primary flex items-center gap-2">
            <Building size={16} className="text-primary" /> Branches / Offices
          </h2>
          <Button size="sm" icon={Plus} onClick={() => openBranch()}>Add</Button>
        </div>

        {branches.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No branches"
            description="Add branches or office locations"
            action={{ label: 'Add Branch', onClick: () => openBranch() }}
          />
        ) : (
          <div className="space-y-2">
            {branches.map(branch => (
              <div key={branch.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{branch.name}</p>
                    {branch.is_head_office && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Head Office</span>
                    )}
                  </div>
                  {branch.address && <p className="text-xs text-text-secondary mt-0.5">{branch.address}</p>}
                  {branch.phone && <p className="text-xs text-text-secondary">{branch.phone}</p>}
                </div>
                <button
                  onClick={() => openBranch(branch)}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary"
                ><Pencil size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dept / Branch Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.item
          ? `Edit ${modal?.type === 'dept' ? 'Department' : 'Branch'}`
          : `Add ${modal?.type === 'dept' ? 'Department' : 'Branch'}`}
      >
        {modal && (
          <div className="space-y-4">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={modal.type === 'dept' ? 'e.g. Audit' : 'e.g. Mumbai Office'}
            />

            {modal.type === 'dept' && (
              <>
                <Input
                  label="Description"
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description…"
                />
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {modal.type === 'branch' && (
              <>
                <Input
                  label="Address"
                  value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Branch address"
                />
                <Input
                  label="Phone"
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_head_office || false}
                    onChange={e => setForm(f => ({ ...f, is_head_office: e.target.checked }))}
                    className="w-4 h-4 text-primary border-border rounded"
                  />
                  <span className="text-sm text-text-primary">Mark as Head Office</span>
                </label>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(null)} icon={X}>Cancel</Button>
              <Button onClick={handleSave} loading={saving} icon={Save}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepartmentSettings;
