/**
 * BannerManagement — admin page for creating / editing / deleting announcements.
 * Accessible only to super_admin, partner, hr.
 */
import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Megaphone, Save, X, Upload, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { formatDate } from '../utils/formatters';

// Base URL for uploaded files (backend serves /uploads as static)
const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND}${url}`;
};

const EMPTY_FORM = {
  title: '',
  description: '',
  imageUrl: '',      // stored path, e.g. /uploads/banners/xxx.jpg
  linkUrl: '',
  linkText: '',
  bgColor: '#1e40af',
  textColor: '#ffffff',
  expiresAt: '',
  isActive: true,
};

const BannerManagement = () => {
  const { roleSlug } = usePermissions();
  const canManage = ['super_admin','partner','hr'].includes(roleSlug);

  const [banners, setBanners]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get('/banners');
      setBanners(r.data?.data || []);
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title:       b.title       || '',
      description: b.description || '',
      imageUrl:    b.image_url   || '',
      linkUrl:     b.link_url    || '',
      linkText:    b.link_text   || '',
      bgColor:     b.bg_color    || '#1e40af',
      textColor:   b.text_color  || '#ffffff',
      expiresAt:   b.expires_at ? b.expires_at.slice(0,10) : '',
      isActive:    b.is_active,
    });
    setImagePreview(b.image_url ? resolveImageUrl(b.image_url) : null);
    setShowForm(true);
  };

  // ── Handle local file selection & upload ────────────────────────────────────
  const handleImageFile = async (file) => {
    if (!file) return;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload to backend
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/banners', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data?.data?.url || '';
      set('imageUrl', url);
      setImagePreview(resolveImageUrl(url));
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
      setImagePreview(null);
      set('imageUrl', '');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title:       form.title,
        description: form.description || null,
        imageUrl:    form.imageUrl    || null,
        linkUrl:     form.linkUrl     || null,
        linkText:    form.linkText    || null,
        bgColor:     form.bgColor,
        textColor:   form.textColor,
        expiresAt:   form.expiresAt   || null,
        isActive:    form.isActive,
      };
      if (editing) {
        await api.put(`/banners/${editing.id}`, payload);
        toast.success('Banner updated');
      } else {
        await api.post('/banners', payload);
        toast.success('Banner created');
      }
      setShowForm(false);
      load();
    } catch {
      toast.error('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await api.delete(`/banners/${id}`);
      toast.success('Banner deleted');
      load();
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const toggleActive = async (b) => {
    try {
      await api.put(`/banners/${b.id}`, {
        title:       b.title,
        description: b.description,
        imageUrl:    b.image_url,
        linkUrl:     b.link_url,
        linkText:    b.link_text,
        bgColor:     b.bg_color,
        textColor:   b.text_color,
        isActive:    !b.is_active,
        expiresAt:   b.expires_at,
      });
      load();
    } catch {
      toast.error('Failed to update banner');
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const removeImage = () => {
    set('imageUrl', '');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Megaphone size={20} className="text-primary" />
            Announcements &amp; Banners
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Dashboard banners visible to all employees
          </p>
        </div>
        {canManage && (
          <Button size="sm" icon={Plus} onClick={openNew}>New Banner</Button>
        )}
      </div>

      {/* Migration hint */}
      {!loading && banners.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <p className="font-medium mb-1">First-time setup</p>
          <p>Run <strong>backend/migrations/007_banners.sql</strong> once in pgAdmin to create the banners table, then refresh.</p>
        </div>
      )}

      {/* Banner form */}
      {showForm && (
        <Card>
          <h2 className="font-semibold text-text-primary mb-4">
            {editing ? 'Edit Banner' : 'New Banner'}
          </h2>
          <div className="space-y-3">

            {/* Title */}
            <div>
              <label className="text-sm font-medium text-text-primary">Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Announcement title"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-text-primary">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={2}
                placeholder="Optional details..."
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-text-primary">Background color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.bgColor}
                    onChange={e => set('bgColor', e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer" />
                  <input value={form.bgColor}
                    onChange={e => set('bgColor', e.target.value)}
                    className="flex-1 px-2 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary">Text color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.textColor}
                    onChange={e => set('textColor', e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer" />
                  <input value={form.textColor}
                    onChange={e => set('textColor', e.target.value)}
                    className="flex-1 px-2 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
                </div>
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="text-sm font-medium text-text-primary">
                Background Image <span className="text-text-secondary font-normal">(optional · JPG, PNG, GIF, WebP · max 5 MB)</span>
              </label>

              {imagePreview ? (
                <div className="mt-1 relative rounded-lg overflow-hidden border border-border h-28">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <p className="text-white text-sm font-medium">Uploading…</p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 border-2 border-dashed border-border rounded-lg h-24 flex flex-col
                    items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5
                    transition-colors"
                >
                  {uploading ? (
                    <p className="text-sm text-text-secondary">Uploading…</p>
                  ) : (
                    <>
                      <ImageIcon size={22} className="text-text-secondary" />
                      <p className="text-xs text-text-secondary">
                        <span className="text-primary font-medium">Click to upload</span> or drag and drop
                      </p>
                    </>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={e => handleImageFile(e.target.files[0])}
              />

              {/* Also allow pasting a URL directly */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-text-secondary shrink-0">or paste URL:</span>
                <input
                  value={form.imageUrl.startsWith('/uploads') ? '' : form.imageUrl}
                  onChange={e => { set('imageUrl', e.target.value); if (e.target.value) setImagePreview(e.target.value); else setImagePreview(null); }}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Link */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-text-primary">Link URL</label>
                <input value={form.linkUrl}
                  onChange={e => set('linkUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary">Link button text</label>
                <input value={form.linkText}
                  onChange={e => set('linkText', e.target.value)}
                  placeholder="Learn more"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-sm font-medium text-text-primary">
                Expires on <span className="text-text-secondary font-normal">(leave blank for no expiry)</span>
              </label>
              <input type="date" value={form.expiresAt}
                onChange={e => set('expiresAt', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-text-primary">Active (visible on dashboards)</span>
            </label>

            {/* Live preview */}
            <div
              className="rounded-lg overflow-hidden relative"
              style={{ backgroundColor: form.bgColor, color: form.textColor }}
            >
              {imagePreview && (
                <div className="absolute inset-0">
                  <img src={imagePreview} alt="" className="w-full h-full object-cover opacity-20" />
                </div>
              )}
              <div className="relative px-4 py-3">
                <p className="font-semibold text-sm">{form.title || 'Banner title'}</p>
                {form.description && <p className="text-xs mt-0.5 opacity-80">{form.description}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" icon={X} onClick={() => setShowForm(false)}>Cancel</Button>
              <Button icon={Save} loading={saving || uploading} onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Banner'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Banner list */}
      <div className="space-y-3">
        {banners.map(b => (
          <Card key={b.id} className="group">
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div
                className="w-14 h-10 rounded-lg flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: b.bg_color || '#1e40af' }}
              >
                {b.image_url && (
                  <img
                    src={resolveImageUrl(b.image_url)}
                    alt=""
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-text-primary">{b.title}</p>
                  <Badge className={b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {b.expires_at && (
                    <Badge className="bg-amber-100 text-amber-700">
                      Expires {formatDate(b.expires_at)}
                    </Badge>
                  )}
                </div>
                {b.description && (
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{b.description}</p>
                )}
                <p className="text-xs text-text-secondary mt-1">
                  By {b.author_first} {b.author_last} · {formatDate(b.created_at)}
                </p>
              </div>

              {canManage && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleActive(b)}
                    className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary hover:text-primary transition-colors"
                    title={b.is_active ? 'Deactivate' : 'Activate'}>
                    {b.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button onClick={() => openEdit(b)}
                    className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary hover:text-primary transition-colors"
                    title="Edit">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(b.id)}
                    className="p-1.5 hover:bg-red-50 rounded-md text-text-secondary hover:text-error transition-colors"
                    title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}

        {!loading && banners.length === 0 && (
          <Card>
            <div className="py-10 text-center">
              <Megaphone size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-text-secondary">No banners yet.</p>
              {canManage && (
                <button onClick={openNew}
                  className="mt-3 text-sm text-primary hover:underline font-medium">
                  Create your first announcement
                </button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BannerManagement;
