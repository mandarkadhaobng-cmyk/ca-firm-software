/**
 * AppearanceSettings — unified Branding + Theme settings page.
 * Two tabs: Branding (logo, firm details, colours) | Theme (sidebar, content, glass effects)
 */
import { useState, useEffect, useRef } from 'react';
import {
  Palette, Upload, Save, RotateCcw, Building2, Image, Mail,
  Phone, Globe, AlignLeft, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../services/settingsService';
import useUIStore, { DEFAULT_THEME, applyThemeToCss } from '../store/uiStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ColorSwatch = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-lg border border-border overflow-hidden flex-shrink-0 shadow-sm">
        <input type="color" value={value || '#5B6B7A'}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 opacity-0" />
        <div className="w-full h-full rounded-lg" style={{ backgroundColor: value || '#5B6B7A' }} />
      </div>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder="#5B6B7A" maxLength={7}
        className="w-24 px-2 py-1.5 border border-border rounded-lg text-xs font-mono
                   focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card-bg text-text-primary" />
    </div>
  </div>
);

const FieldRow = ({ label, icon: Icon, children }) => (
  <div>
    <label className="block text-xs font-medium text-text-secondary mb-1">
      {Icon && <Icon size={11} className="inline mr-1 mb-0.5" />}{label}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
  <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-3 py-2 border border-border rounded-lg text-sm
               focus:outline-none focus:ring-2 focus:ring-primary/20
               bg-card-bg text-text-primary placeholder:text-text-secondary" />
);

// ── Sidebar presets ───────────────────────────────────────────────────────────
const SIDEBAR_PRESETS = [
  { label: 'Light',       key: 'light',      bg: '#ffffff', text: '#6B7280', active: '#5B6B7A' },
  { label: 'Navy',        key: 'navy',       bg: '#0f172a', text: '#94a3b8', active: '#3b82f6' },
  { label: 'Charcoal',    key: 'charcoal',   bg: '#1c1c1e', text: '#a1a1aa', active: '#6366f1' },
  { label: 'Forest',      key: 'forest',     bg: '#1a2e1a', text: '#86efac', active: '#22c55e' },
  { label: 'Warm Sand',   key: 'sand',       bg: '#faf8f4', text: '#78716c', active: '#d97706' },
  { label: 'Slate Blue',  key: 'slateblue',  bg: '#1e3a5f', text: '#93c5fd', active: '#60a5fa' },
];

const applyPresetToTheme = (preset, theme) => {
  const isDark = preset.bg < '#888888';
  return {
    ...theme,
    sidebarBg:         preset.bg,
    sidebarText:       preset.text,
    sidebarTextHover:  isDark ? '#f1f5f9' : '#1F2937',
    sidebarActiveBg:   preset.active,
    sidebarActiveText: '#ffffff',
    sidebarHoverBg:    isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
    sidebarGroupText:  isDark ? '#475569' : '#9CA3AF',
    sidebarBorder:     isDark ? 'rgba(255,255,255,0.08)' : '#E5EAF2',
    sidebarPreset:     preset.key,
  };
};

// ── Mini live preview ─────────────────────────────────────────────────────────
const MiniPreview = ({ theme }) => (
  <div className="rounded-xl overflow-hidden border border-border shadow-sm flex" style={{ height: 100 }}>
    {/* Sidebar strip */}
    <div className="flex flex-col gap-1 p-2 flex-shrink-0" style={{ width: 60, backgroundColor: theme.sidebarBg }}>
      <div className="rounded text-center" style={{ backgroundColor: theme.sidebarActiveBg, padding: '2px 0' }}>
        <span style={{ color: theme.sidebarActiveText, fontSize: 7, fontWeight: 600 }}>Dash</span>
      </div>
      {['HRMS', 'Work', 'Pay'].map(l => (
        <div key={l} className="rounded px-1" style={{ padding: '2px 0' }}>
          <span style={{ color: theme.sidebarText, fontSize: 7 }}>{l}</span>
        </div>
      ))}
    </div>
    {/* Content area */}
    <div className="flex-1 p-2" style={{ backgroundColor: theme.contentBg }}>
      <div className="h-3 rounded mb-1.5" style={{ backgroundColor: theme.cardBg, width: '70%' }} />
      <div className="h-2 rounded mb-1" style={{ backgroundColor: theme.cardBg, width: '50%' }} />
      <div className="h-10 rounded" style={{ backgroundColor: theme.cardBg, border: '1px solid ' + theme.cardBorder }} />
    </div>
  </div>
);

// ── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'branding', label: 'Branding', icon: Building2 },
  { id: 'theme',    label: 'Theme',    icon: Palette },
];

// ── Main Component ───────────────────────────────────────────────────────────
const AppearanceSettings = () => {
  const { setBranding: setStoreBranding, saveTheme, resetTheme, darkMode, toggleDarkMode } = useUIStore();
  const [tab, setTab] = useState('branding');
  const [loading, setLoading] = useState(true);
  const [savingB, setSavingB] = useState(false);
  const [savingT, setSavingT] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Branding state — field names match branding_settings DB columns
  const [branding, setBranding] = useState({
    firm_name: '', tagline: '', email: '', phone: '', website: '', address: '',
    primary_color: '#5B6B7A', accent_color: '#818cf8',
    text_color: '#1F2937', bg_color: '#F7F9FC', logo_url: '', favicon_url: '',
  });

  // Theme state (mirrors DEFAULT_THEME)
  const [theme, setTheme] = useState({ ...DEFAULT_THEME });
  const logoInputRef    = useRef();
  const faviconInputRef = useRef();

  // Load both branding and theme on mount
  useEffect(() => {
    Promise.all([
      settingsService.getBranding().catch(() => null),
      settingsService.getTheme().catch(() => null),
    ]).then(([b, t]) => {
      if (b) setBranding(prev => ({ ...prev, ...b }));
      if (t && Object.keys(t).length > 0) setTheme(prev => ({ ...DEFAULT_THEME, ...t }));
    }).finally(() => setLoading(false));
  }, []);

  // Live theme preview — apply to CSS whenever theme state changes
  useEffect(() => {
    if (!loading) applyThemeToCss(theme);
  }, [theme, loading]);

  // ── Branding handlers ─────────────────────────────────────
  const handleBrandingChange = (key, val) => setBranding(prev => ({ ...prev, [key]: val }));

  const handleLogoUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('File must be under 2 MB');
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd,
        headers: { Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('ca-auth') || '{}')?.state?.accessToken || '') }
      });
      const json = await res.json();
      if (json.success) handleBrandingChange(key, json.data.url);
      else toast.error('Upload failed');
    } catch { toast.error('Upload error'); }
    finally { setUploading(false); }
  };

  const saveBranding = async () => {
    setSavingB(true);
    try {
      // Map frontend state keys to what the backend updateBranding controller expects
      const payload = {
        firm_name:     branding.firm_name,
        tagline:       branding.tagline,
        email:         branding.email,
        phone:         branding.phone,
        website:       branding.website,
        address:       branding.address,
        primary_color: branding.primary_color,
        accent_color:  branding.accent_color,
        text_color:    branding.text_color,
        bg_color:      branding.bg_color,
        logo_url:      branding.logo_url,
        favicon_url:   branding.favicon_url,
      };
      await settingsService.updateBranding(payload);
      setStoreBranding(branding);
      toast.success('Branding saved!');
    } catch { toast.error('Save failed'); }
    finally { setSavingB(false); }
  };

  // ── Theme handlers ────────────────────────────────────────
  const setThemeKey = (key, val) => setTheme(prev => ({ ...prev, [key]: val }));

  const applyPreset = (preset) => setTheme(prev => applyPresetToTheme(preset, prev));

  const saveThemeSettings = async () => {
    setSavingT(true);
    try {
      await saveTheme(theme);
      toast.success('Theme saved!');
    } catch { toast.error('Save failed'); }
    finally { setSavingT(false); }
  };

  const handleReset = () => {
    resetTheme();
    setTheme({ ...DEFAULT_THEME });
    toast('Theme reset to defaults');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Appearance</h1>
        <p className="text-sm text-text-secondary mt-1">Manage branding, colours, and theme for your firm</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── BRANDING TAB ─────────────────────────────────── */}
      {tab === 'branding' && (
        <div className="space-y-6">
          {/* Logo upload */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Firm Logo</h2>
            <div className="flex items-start gap-6">
              {/* Logo preview */}
              <div className="w-28 h-20 rounded-xl border-2 border-dashed border-border flex items-center
                              justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                {branding.logo_url
                  ? <img src={branding.logo_url} alt="logo"
                      className="max-w-full max-h-full object-contain p-1" />
                  : <Image size={24} className="text-text-secondary opacity-40" />}
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-3">
                  Upload your firm logo (PNG, SVG recommended). Max 2 MB. Optimal size: 300×100 px.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleLogoUpload(e, 'logo_url')} />
                  <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}
                    loading={uploading}>
                    <Upload size={13} className="mr-1" /> Upload Logo
                  </Button>
                  {branding.logo_url && (
                    <Button size="sm" variant="ghost"
                      onClick={() => handleBrandingChange('logo_url', '')}>
                      Remove
                    </Button>
                  )}
                </div>
                <div className="mt-3">
                  <FieldRow label="Or paste logo URL">
                    <TextInput value={branding.logo_url}
                      onChange={v => handleBrandingChange('logo_url', v)}
                      placeholder="https://example.com/logo.png" />
                  </FieldRow>
                </div>
              </div>
            </div>
          </Card>

          {/* Firm details */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Firm Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Firm Name" icon={Building2}>
                <TextInput value={branding.firm_name}
                  onChange={v => handleBrandingChange('firm_name', v)}
                  placeholder="CA Practice Firm" />
              </FieldRow>
              <FieldRow label="Tagline" icon={AlignLeft}>
                <TextInput value={branding.tagline}
                  onChange={v => handleBrandingChange('tagline', v)}
                  placeholder="Excellence in every audit" />
              </FieldRow>
              <FieldRow label="Official Email" icon={Mail}>
                <TextInput value={branding.email}
                  onChange={v => handleBrandingChange('email', v)}
                  placeholder="hr@yourfirm.com" />
              </FieldRow>
              <FieldRow label="Phone / Contact" icon={Phone}>
                <TextInput value={branding.phone}
                  onChange={v => handleBrandingChange('phone', v)}
                  placeholder="+91 98765 43210" />
              </FieldRow>
              <FieldRow label="Website" icon={Globe}>
                <TextInput value={branding.website}
                  onChange={v => handleBrandingChange('website', v)}
                  placeholder="https://yourfirm.com" />
              </FieldRow>
              <FieldRow label="Address" icon={Building2}>
                <TextInput value={branding.address}
                  onChange={v => handleBrandingChange('address', v)}
                  placeholder="123 Main Street, City, State" />
              </FieldRow>
            </div>
          </Card>

          {/* Brand colours */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Brand Colours</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch label="Primary" value={branding.primary_color}
                onChange={v => handleBrandingChange('primary_color', v)} />
              <ColorSwatch label="Accent" value={branding.accent_color}
                onChange={v => handleBrandingChange('accent_color', v)} />
              <ColorSwatch label="Text" value={branding.text_color}
                onChange={v => handleBrandingChange('text_color', v)} />
              <ColorSwatch label="Background" value={branding.bg_color}
                onChange={v => handleBrandingChange('bg_color', v)} />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveBranding} loading={savingB}>
              <Save size={14} className="mr-1.5" /> Save Branding
            </Button>
          </div>
        </div>
      )}

      {/* ── THEME TAB ────────────────────────────────────── */}
      {tab === 'theme' && (
        <div className="space-y-6">
          {/* Dark mode toggle */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-400" />}
                <div>
                  <p className="text-sm font-semibold text-text-primary">Dark Mode</p>
                  <p className="text-xs text-text-secondary">Switch between light and dark interface</p>
                </div>
              </div>
              <button onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${darkMode ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </Card>

          {/* Sidebar presets */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Sidebar Style</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
              {SIDEBAR_PRESETS.map(preset => (
                <button key={preset.key}
                  onClick={() => applyPreset(preset)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all
                    ${theme.sidebarPreset === preset.key
                      ? 'border-primary shadow-md scale-[1.03]'
                      : 'border-border hover:border-gray-300'}`}>
                  <div className="w-10 h-10 rounded-lg flex flex-col gap-0.5 p-1.5 overflow-hidden"
                    style={{ backgroundColor: preset.bg }}>
                    <div className="h-1.5 rounded-sm" style={{ backgroundColor: preset.active }} />
                    {[1,2].map(i => (
                      <div key={i} className="h-1 rounded-sm" style={{ backgroundColor: preset.text, opacity: 0.5 }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-text-secondary font-medium">{preset.label}</span>
                </button>
              ))}
            </div>

            {/* Fine-tune sidebar colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch label="Sidebar Background" value={theme.sidebarBg}
                onChange={v => setThemeKey('sidebarBg', v)} />
              <ColorSwatch label="Active Item BG" value={theme.sidebarActiveBg}
                onChange={v => setThemeKey('sidebarActiveBg', v)} />
              <ColorSwatch label="Nav Text" value={theme.sidebarText}
                onChange={v => setThemeKey('sidebarText', v)} />
              <ColorSwatch label="Active Text" value={theme.sidebarActiveText}
                onChange={v => setThemeKey('sidebarActiveText', v)} />
            </div>
          </Card>

          {/* Content area colors */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Content Area</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch label="Page Background" value={theme.contentBg}
                onChange={v => setThemeKey('contentBg', v)} />
              <ColorSwatch label="Card Background" value={theme.cardBg}
                onChange={v => setThemeKey('cardBg', v)} />
              <ColorSwatch label="Primary Colour" value={theme.colorPrimary}
                onChange={v => setThemeKey('colorPrimary', v)} />
              <ColorSwatch label="Accent Colour" value={theme.colorAccent}
                onChange={v => setThemeKey('colorAccent', v)} />
            </div>
          </Card>

          {/* Live preview */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Live Preview</h2>
            <div className="max-w-sm">
              <MiniPreview theme={theme} />
            </div>
          </Card>

          {/* Glass effect toggle */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Glass Effect</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-primary">Enable glass / blur effect on sidebar</p>
                <p className="text-xs text-text-secondary">Requires a background image or gradient behind the sidebar</p>
              </div>
              <button onClick={() => setThemeKey('sidebarGlass', !theme.sidebarGlass)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${theme.sidebarGlass ? 'bg-primary' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${theme.sidebarGlass ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {theme.sidebarGlass && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">
                    Blur: {theme.sidebarGlassBlur}px
                  </label>
                  <input type="range" min={0} max={30} value={theme.sidebarGlassBlur}
                    onChange={e => setThemeKey('sidebarGlassBlur', parseInt(e.target.value))}
                    className="w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">
                    Opacity: {Math.round((theme.sidebarGlassOpacity || 0.85) * 100)}%
                  </label>
                  <input type="range" min={10} max={100}
                    value={Math.round((theme.sidebarGlassOpacity || 0.85) * 100)}
                    onChange={e => setThemeKey('sidebarGlassOpacity', parseInt(e.target.value) / 100)}
                    className="w-full" />
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw size={13} className="mr-1.5" /> Reset to Defaults
            </Button>
            <Button onClick={saveThemeSettings} loading={savingT}>
              <Save size={14} className="mr-1.5" /> Save Theme
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppearanceSettings;
