import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2 } from 'lucide-react';
import { holidayService } from '../services/holidayService';
import useAuthStore from '../store/authStore';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const TYPES = { public: 'bg-blue-100 text-blue-700', optional: 'bg-amber-100 text-amber-700', restricted: 'bg-gray-100 text-gray-600' };

const HolidaysPage = () => {
  const { user } = useAuthStore();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const canManage = ['super_admin','hr','partner'].includes(user?.role);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await holidayService.getAll({ year: new Date().getFullYear() });
      setHolidays(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); reset({}); setShowModal(true); };
  const openEdit = (h) => {
    setEditing(h);
    reset({ name: h.name, date: h.date?.split('T')[0], type: h.type, description: h.description });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editing) await holidayService.update(editing.id, data);
      else         await holidayService.create(data);
      toast.success(editing ? 'Holiday updated' : 'Holiday added');
      setShowModal(false);
      load();
    } catch { /* toast shown by interceptor */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    await holidayService.delete(id);
    toast.success('Holiday deleted');
    load();
  };

  // Group by month
  const grouped = holidays.reduce((acc, h) => {
    const month = new Date(h.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    (acc[month] = acc[month] || []).push(h);
    return acc;
  }, {});

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Holidays {new Date().getFullYear()}</h2>
          <p className="text-sm text-text-secondary">{holidays.length} holiday(s) this year</p>
        </div>
        {canManage && <Button icon={Plus} onClick={openAdd}>Add Holiday</Button>}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card><p className="text-center text-text-secondary py-8">No holidays added yet</p></Card>
      ) : (
        Object.entries(grouped).map(([month, list]) => (
          <Card key={month} padding={false}>
            <div className="px-5 py-3 bg-gray-50 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">{month}</h3>
            </div>
            <div className="divide-y divide-border">
              {list.map(h => (
                <div key={h.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{h.name}</p>
                      <p className="text-xs text-text-secondary">{formatDate(h.date, 'EEEE, dd MMMM')}{h.description ? ` — ${h.description}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={TYPES[h.type] || TYPES.public}>{h.type}</Badge>
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(h)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-gray-50"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(h.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Holiday' : 'Add Holiday'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Holiday Name *</label>
            <input className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register('name', { required: true })} placeholder="e.g. Diwali" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-primary">Date *</label>
              <input type="date" className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register('date', { required: true })} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Type</label>
              <select className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register('type')}>
                <option value="public">Public</option>
                <option value="optional">Optional</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Description</label>
            <input className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register('description')} placeholder="Optional note" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Add Holiday'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HolidaysPage;
