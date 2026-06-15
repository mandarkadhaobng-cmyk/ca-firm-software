import { useState, useEffect } from 'react';
import { Plus, Users, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as orgService from '../services/organizationService';
import Button from '../../components/common/Button';
import { usePermissions } from '../../hooks/usePermissions';

const DepartmentManager = () => {
  const { roleSlug } = usePermissions();
  const canEdit = ['super_admin','partner','hr'].includes(roleSlug);

  const [depts, setDepts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    orgService.listDepartments()
      .then(d => setDepts(d || []))
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await orgService.createDepartment({ name: newName.trim() });
      setNewName(''); setAdding(false);
      toast.success('Department created');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await orgService.updateDepartment(id, { name: editName.trim() });
      setEditId(null); setEditName('');
      toast.success('Department updated');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Departments</h1>
          <p className="text-sm text-text-secondary mt-0.5">{depts.length} department{depts.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={14} className="mr-1" /> Add Department
          </Button>
        )}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {adding && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
            <input
              autoFocus
              type="text"
              placeholder="Department name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button onClick={handleAdd} disabled={saving} className="p-1.5 rounded-md hover:bg-green-50 text-green-600">
              <Check size={16} />
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); }} className="p-1.5 rounded-md hover:bg-red-50 text-error">
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_,i) => <div key={i} className="h-14 px-4 py-3 animate-pulse bg-gray-50" />)}
          </div>
        ) : depts.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No departments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {depts.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  {editId === d.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEdit(d.id); if (e.key === 'Escape') setEditId(null); }}
                        className="border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button onClick={() => handleEdit(d.id)} disabled={saving} className="p-1 rounded hover:bg-green-50 text-green-600"><Check size={14} /></button>
                      <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-red-50 text-error"><X size={14} /></button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-text-primary">{d.name}</p>
                  )}
                  <p className="text-xs text-text-secondary mt-0.5">
                    {d.member_count || 0} member{d.member_count !== 1 ? 's' : ''}
                    {d.head_first ? ` · Head: ${d.head_first} ${d.head_last}` : ''}
                  </p>
                </div>
                {canEdit && editId !== d.id && (
                  <button
                    onClick={() => { setEditId(d.id); setEditName(d.name); }}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentManager;
