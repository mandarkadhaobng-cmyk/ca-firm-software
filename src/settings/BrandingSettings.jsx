import { useState, useEffect } from 'react';
import { Palette, Upload, Save, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../services/settingsService';
import useUIStore from '../store/uiStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PRESET_THEMES = [
  { name: 'Indigo',  primary: '#6366f1', accent: '#818cf8' },
  { name: 'Blue',    primary: '#3b82f6', accent: '#60a5fa' },
  { name: 'Green',   primary: '#10b981', accent: '#34d399' },
  { name: 'Purple',  primary: '#8b5cf6', accent: '#a78bfa' },
  { name: 'Rose',    primary: '#f43f5e', accent: '#fb7185' },
  { name: 'Orange',  primary: '#f97316', accent: '#fb923c' },
  { name: 'Teal',    primary: '#14b8a6', accent: '#2dd4bf' },
  { name: 'Slate',   primary: '#475569', accent: '#64748b' },
];

const ColorSwatch = ({ label, name, value, onChange }) => (
  <div>
    <label className="text-xs font-medium text-text-secondary block mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10 rounded-lg border border-border overflow-hidden flex-shrink-0">
        <input
          type="color"
          value={value || '#6366f1'}
          onChange={e => onChange(name, e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 opacity-0"
        />
        <div className="w-full h-full" style={{ backgroundColor: value || '#6366f1' }} />
        <Palette size={12} className="absolute bottom-0.5 right-0.5 text-white drop-shadow" />
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(name, e.target.value)}
        placeholder="#6366f1"
        className="flex-1 px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
        maxLength={7}
      />
    </div>
  </div>
);

const BrandingSettings = () => {
  const { setBranding: setStoreBranding } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({
    firm_name: '',
    tagline: '',
    primary_color: '#6366f1',
    accent_color: '#818cf8',
    text_color: '#1e293b',
    bg_color: '#f8fafc',
    logo_url: '',
    favicon_url: '',
  });
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    settingsService.getBranding()
      .then(data => { if (data) setBranding(prev => ({ ...prev, ...data })); })
      .catch(() => toast.error('Failed to load branding'))
      .finally(() => setLoading(false));
  }, []);

  const setColor = (key, val) => setBranding(prev => ({ ...prev, [key]: val }));

  const applyPreset = (preset) => {
    setBranding(prev => ({ ...prev, primary_color: preset.primary, accent_color: preset.accent }));
  };

  const handleFileUpload = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBranding(prev => ({ ...prev, [key]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await settingsService.updateBranding(branding);
      // Update UIStore so sidebar logo/name and CSS vars update instantly without reload
      setStoreBranding(saved ?? branding);
      toast.success('Branding saved successfully');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Branding</h1>
          <p className="text-sm text-text-secondary mt-0.5">Customise your firm's visual identity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => setPreview(p => !p)}
          >
            {preview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button icon={Save} loading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      {preview && (
        <div className="rounded-xl overflow-hidden border-2 border-dashed border-border">
          <div
            className="h-14 flex items-center px-4 gap-3"
            style={{ backgroundColor: branding.primary_color }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: branding.accent_color }}
            >
              {(branding.firm_name || 'CA').slice(0, 2).toUpperCase()}
            </div>
            <span className="text-white font-semibold text-sm">{branding.firm_name || 'Your Firm'}</span>
            {branding.tagline && <span className="text-white/70 text-xs">— {branding.tagline}</span>}
          </div>
          <div className="h-24 flex items-center justify-center" style={{ backgroundColor: branding.bg_color }}>
            <p className="text-sm" style={{ color: branding.text_color }}>Main content area preview</p>
          </div>
        </div>
      )}

      {/* Firm Name & Tagline */}
      <Card>
        <h2 className="font-medium text-text-primary mb-4">Identity</h2>
        <div className="space-y-4">
          <Input
            label="Firm Name (display)"
            value={branding.firm_name}
            onChange={e => setBranding(p => ({ ...p, firm_name: e.target.value }))}
            placeholder="e.g. Shah & Associates"
          />
          <Input
            label="Tagline"
            value={branding.tagline || ''}
            onChange={e => setBranding(p => ({ ...p, tagline: e.target.value }))}
            placeholder="e.g. Trusted advisors since 1995"
          />
        </div>
      </Card>

      {/* Color Presets */}
      <Card>
        <h2 className="font-medium text-text-primary mb-3">Color Presets</h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {PRESET_THEMES.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              title={p.name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${branding.primary_color === p.primary
                  ? 'ring-2 ring-offset-1 scale-105'
                  : 'hover:scale-105'}`}
              style={{
                backgroundColor: p.primary + '15',
                borderColor: p.primary,
                color: p.primary,
                ringColor: p.primary,
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.primary }} />
              {p.name}
            </button>
          ))}
        </div>

        <h3 className="text-sm font-medium text-text-primary mb-3">Custom Colors</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <ColorSwatch label="Primary Color"    name="primary_color"  value={branding.primary_color}  onChange={setColor} />
          <ColorSwatch label="Accent Color"     name="accent_color"   value={branding.accent_color}   onChange={setColor} />
          <ColorSwatch label="Text Color"       name="text_color"     value={branding.text_color}     onChange={setColor} />
          <ColorSwatch label="Background Color" name="bg_color"       value={branding.bg_color}       onChange={setColor} />
        </div>
      </Card>

      {/* Logo */}
      <Card>
        <h2 className="font-medium text-text-primary mb-4">Logo & Favicon</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Upload Logo</label>
            <div className="flex items-center gap-3">
              {branding.logo_url && (
                <img
                  src={branding.logo_url}
                  alt="Logo preview"
                  className="h-10 w-auto object-contain border border-border rounded p-1 bg-white"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={e => handleFileUpload(e, 'logo_url')}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">Upload a local image file for your firm's logo (Max 2MB)</p>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Upload Favicon</label>
            <div className="flex items-center gap-3">
              {branding.favicon_url && (
                <img
                  src={branding.favicon_url}
                  alt="Favicon preview"
                  className="h-10 w-10 object-contain border border-border rounded p-1 bg-white"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <input
                type="file"
                accept="image/x-icon,image/png,image/jpeg,image/svg+xml"
                onChange={e => handleFileUpload(e, 'favicon_url')}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">Upload a local image file for your site's favicon (Max 2MB)</p>
          </div>
        </div>
      </Card>

      {/* Reset */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setBranding(prev => ({
            ...prev,
            primary_color: '#6366f1',
            accent_color: '#818cf8',
            text_color: '#1e293b',
            bg_color: '#f8fafc',
          }))}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-error transition-colors"
        >
          <RotateCcw size={14} />
          Reset to defaults
        </button>
        <Button icon={Save} loading={saving} onClick={handleSave}>
          Save Branding
        </Button>
      </div>
    </div>
  );
};

export default BrandingSettings;
