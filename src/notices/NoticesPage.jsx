import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, Edit2, Pin, ImagePlus, X } from 'lucide-react';
import { noticeService } from '../services/noticeService';
import apiClient from '../services/apiClient';
import useAuthStore from '../store/authStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatTimeAgo } from '../utils/formatters';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const PRIORITY_COLORS = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-gray-100 text-gray-600' };

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const imgSrc = (url) => url ? (url.startsWith('http') ? url : `${API_BASE}${url}`) : null;

const NoticesPage = () => {
  const { user } = useAuthStore();
  const [notices, setNotices]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [imageUrl, setImageUrl]   = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const canManage = ['super_admin','hr','partner'].includes(user?.role);

  const { register, handleSubmit, reset } = useForm();

  const load = async () => {
    setLoading(true);
    try { setNotices(await noticeService.getAll() || []); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    reset({});
    setImageUrl('');
    setShowModal(true);
  };
  const openEdit = (n) => {
    setEditing(n);
    reset({ title: n.title, content: n.content, category: n.category, priority: n.priority, isPinned: n.is_pinned });
    setImageUrl(n.image_url || '');
    setShowModal(true);
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/upload/notices', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(data.data?.url || '');
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, imageUrl: imageUrl || null };
      if (editing) await noticeService.update(editing.id, payload);
      else         await noticeService.create(payload);
      toast.success(editing ? 'Notice updated' : 'Notice published');
      setShowModal(false); load();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    await noticeService.delete(id);
    toast.success('Notice deleted'); load();
  };

  if (loading) return <LoadingSpinner />;

  const pinned = notices.filter(n => n.is_pinned);
  const regular = notices.filter(n => !n.is_pinned);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Office Notices</h2>
          <p className="text-sm text-text-secondary">{notices.length} active notice(s)</p>
        </div>
        {canManage && <Button icon={Plus} onClick={openAdd}>Post Notice</Button>}
      </div>

      {pinned.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5"><Pin size={12} /> Pinned</p>
          {pinned.map(n => <NoticeCard key={n.id} notice={n} canManage={canManage} onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {regular.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Recent</p>}
          {regular.map(n => <NoticeCard key={n.id} notice={n} canManage={canManage} onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {notices.length === 0 && <Card><p className="text-center text-text-secondary py-8">No notices posted yet</p></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Notice' : 'Post Notice'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Title *</label>
            <input className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register('title', { required: true })} placeholder="Notice title" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Content *</label>
            <textarea rows={4} className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              {...register('content', { required: true })} placeholder="Notice content..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-primary">Category</label>
              <select className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" {...register('category')}>
                <option value="general">General</option>
                <option value="hr">HR</option>
                <option value="it">IT</option>
                <option value="finance">Finance</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">Priority</label>
              <select className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" {...register('priority')}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          {/* Image upload */}
          <div>
            <label className="text-sm font-medium text-text-primary">Attachment Photo (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            {imageUrl ? (
              <div className="mt-2 relative inline-block">
                <img
                  src={imgSrc(imageUrl)}
                  alt="Notice attachment"
                  className="rounded-lg border border-border max-h-48 object-cover"
                  onError={e => { e.target.style.display='none'; }}
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors w-full justify-center"
              >
                <ImagePlus size={16} />
                {uploading ? 'Uploading…' : 'Click to add a photo'}
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-primary" {...register('isPinned')} />
            <span className="text-sm text-text-secondary">Pin to top</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading}>{editing ? 'Update' : 'Publish'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const NoticeCard = ({ notice: n, canManage, onEdit, onDelete }) => (
  <Card>
    {/* Photo banner — shown above content when present */}
    {n.image_url && (
      <div className="mb-3 -mx-4 -mt-4 rounded-t-xl overflow-hidden">
        <img
          src={imgSrc(n.image_url)}
          alt={n.title}
          className="w-full max-h-56 object-cover"
          onError={e => { e.target.parentElement.style.display = 'none'; }}
        />
      </div>
    )}
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          {n.is_pinned && <Pin size={12} className="text-primary flex-shrink-0" />}
          <h3 className="text-sm font-semibold text-text-primary">{n.title}</h3>
          <Badge className={PRIORITY_COLORS[n.priority]}>{n.priority}</Badge>
          <Badge className="bg-gray-100 text-gray-600">{n.category}</Badge>
        </div>
        <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{n.content}</p>
        <p className="text-xs text-text-secondary mt-2">
          Posted by {n.first_name} {n.last_name} · {formatTimeAgo(n.created_at)}
        </p>
      </div>
      {canManage && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(n)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-gray-50"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(n.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  </Card>
);

export default NoticesPage;
