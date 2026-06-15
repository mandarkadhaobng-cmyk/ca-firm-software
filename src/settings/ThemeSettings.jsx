import { useState, useEffect } from 'react';
import { Palette, Save, RotateCcw, Monitor, Sidebar, Sun, Moon, Layers, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import useUIStore, { DEFAULT_THEME, applyThemeToCss } from '../store/uiStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

// ── Sidebar presets ───────────────────────────────────────────────────────────
const SIDEBAR_PRESETS = [
  {
    key: 'light',
    label: 'Light',
    icon: Sun,
    values: {
      sidebarBg: '#ffffff', sidebarBorder: '#E5EAF2',
      sidebarText: '#6B7280', sidebarTextHover: '#1F2937',
      sidebarActiveBg: '#5B6B7A', sidebarActiveText: '#ffffff',
      sidebarHoverBg: '#f3f4f6', sidebarGroupText: '#9CA3AF',
      sidebarGlass: false,
    },
  },
  {
    key: 'dark',
    label: 'Dark Navy',
    icon: Moon,
    values: {
      sidebarBg: '#0f172a', sidebarBorder: '#1e293b',
      sidebarText: '#94a3b8', sidebarTextHover: '#f1f5f9',
      sidebarActiveBg: '#3b82f6', sidebarActiveText: '#ffffff',
      sidebarHoverBg: '#1e293b', sidebarGroupText: '#475569',
      sidebarGlass: false,
    },
  },
  {
    key: 'dark-charcoal',
    label: 'Charcoal',
    icon: Moon,
    values: {
      sidebarBg: '#1c1c1e', sidebarBorder: '#2c2c2e',
      sidebarText: '#aeaeb2', sidebarTextHover: '#f2f2f7',
      sidebarActiveBg: '#6366f1', sidebarActiveText: '#ffffff',
      sidebarHoverBg: '#2c2c2e', sidebarGroupText: '#636366',
      sidebarGlass: false,
    },
  },
  {
    key: 'glass-dark',
    label: 'Glass Dark',
    icon: Layers,
    values: {
      sidebarBg: '#1e293b', sidebarBorder: 'rgba(255,255,255,0.08)',
      sidebarText: '#94a3b8', sidebarTextHover: '#f1f5f9',
      sidebarActiveBg: '#6366f1', sidebarActiveText: '#ffffff',
      sidebarHoverBg: 'rgba(255,255,255,0.06)', sidebarGroupText: '#475569',
      sidebarGlass: true, sidebarGlassBlur: 16, sidebarGlassOpacity: 0.75,
    },
  },
  {
    key: 'glass-light',
    label: 'Glass Light',
    icon: Droplets,
    values: {
      sidebarBg: '#ffffff', sidebarBorder: 'rgba(0,0,0,0.08)',
      sidebarText: '#4b5563', sidebarTextHover: '#111827',
      sidebarActiveBg: '#5B6B7A', sidebarActiveText: '#ffffff',
      sidebarHoverBg: 'rgba(0,0,0,0.04)', sidebarGroupText: '#9ca3af',
      sidebarGlass: true, sidebarGlassBlur: 12, sidebarGlassOpacity: 0.85,
    },
  },
  {
    key: 'brand',
    label: 'Brand',
    icon: Palette,
    values: {
      sidebarBg: '#5B6B7A', sidebarBorder: 'rgba(255,255,255,0.15)',
      sidebarText: 'rgba(255,255,255,0.75)', sidebarTextHover: '#ffffff',
      sidebarActiveBg: 'rgba(255,255,255,0.20)', sidebarActiveText: '#ffffff',
      sidebarHoverBg: 'rgba(255,255,255,0.10)', sidebarGroupText: 'rgba(255,255,255,0.45)',
      sidebarGlass: false,
    },
  },
  {
    key: 'gradient',
    label: 'Gradient',
    icon: Layers,
    values: {
      sidebarBg: '#1a1a2e', sidebarBorder: 'rgba(255,255,255,0.08)',
      sidebarText: '#a5b4fc', sidebarTextHover: '#ffffff',
      sidebarActiveBg: '#7c3aed', sidebarActiveText: '#ffffff',
      sidebarHoverBg: 'rgba(124,58,237,0.15)', sidebarGroupText: '#6366f1',
      sidebarGlass: false,
    },
  },
];

// ── Accent color presets ──────────────────────────────────────────────────────
const ACCENT_PRESETS = [
  { label: 'Slate',   primary: '#5B6B7A', hover: '#4A5A68' },
  { label: 'Indigo',  primary: '#6366f1', hover: '#4f46e5' },
  { label: 'Blue',    primary: '#3b82f6', hover: '#2563eb' },
  { label: 'Violet',  primary: '#7c3aed', hover: '#6d28d9' },
  { label: 'Rose',    primary: '#f43f5e', hover: '#e11d48' },
  { label: 'Green',   primary: '#10b981', hover: '#059669' },
  { label: 'Orange',  primary: '#f97316', hover: '#ea580c' },
  { label: 'Teal',    primary: '#14b8a6', hover: '#0d9488' },
];

// ── Color swatch picker ───────────────────────────────────────────────────────
const Swatch = ({ label, field, value, onChange }) => (
  <div>
    <p className="text-xs text-text-secondary mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <label className="relative w-9 h-9 rounded-lg border border-border overflow-hidden cursor-pointer flex-shrink-0">
        <input
          type="color"
          value={value && value.startsWith('#') ? value : '#888888'}
          onChange={e => onChange(field, e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ background: value || '#888888' }} />
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
        placeholder="#ffffff"
        className="flex-1 min-w-0 px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
    </div>
  </div>
);

// ── Mini sidebar preview ──────────────────────────────────────────────────────
const MiniPreview = ({ theme }) => {
  const navItems = ['Dashboard', 'HRMS', 'Work', 'Payroll'];
  return (
    <div className="flex rounded-xl overflow-hidden border border-border shadow-md" style={{ height: 180 }}>
      {/* Sidebar strip */}
      <div
        className="flex flex-col py-3 px-2 gap-1"
        style={{
          width: 80,
          background: theme.sidebarBg,
          borderRight: `1px solid ${theme.sidebarBorder}`,
          backdropFilter: theme.sidebarGlass ? `blur(${theme.sidebarGlassBlur || 12}px)` : 'none',
        }}
      >
        <div className="w-6 h-6 rounded mb-2 mx-auto flex-shrink-0"
          style={{ background: theme.sidebarActiveBg }} />
        {navItems.map((item, i) => (
          <div
            key={item}
            className="rounded px-1.5 py-1 text-[7px] font-medium truncate"
            style={{
              background: i === 0 ? theme.sidebarActiveBg : 'transparent',
              color: i === 0 ? theme.sidebarActiveText : theme.sidebarText,
            }}
          >
            {item}
          </div>
        ))}
      </div>
      {/* Content area */}
      <div className="flex-1 flex flex-col p-3 gap-2" style={{ background: theme.contentBg }}>
        <div className="h-3 rounded" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }} />
        <div className="flex gap-1.5 flex-1">
          {[1,2,3].map(n => (
            <div key={n} className="flex-1 rounded"
              style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }} />
          ))}
        </div>
        <div className="h-2 w-16 rounded" style={{ background: theme.colorPrimary }} />
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ThemeSettings = () => {
  const { theme: storeTheme, setTheme, saveTheme, resetTheme } = useUIStore();
  const [theme, setLocal] = useState({ ...DEFAULT_THEME, ...storeTheme });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('sidebar');

  // Live preview — apply changes instantly as the user drags color pickers
  useEffect(() => {
    applyThemeToCss(theme);
  }, [theme]);

  const update = (field, value) => {
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset) => {
    const next = { ...theme, ...preset.values, sidebarPreset: preset.key };
    setLocal(next);
  };

  const applyAccent = (a) => {
    setLocal(prev => ({ ...prev, colorPrimary: a.primary, colorPrimaryHover: a.hover,
      sidebarActiveBg: prev.sidebarPreset === 'brand' ? a.primary : prev.sidebarActiveBg }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTheme(theme);
      toast.success('Theme saved — changes apply everywhere instantly');
    } catch {
      // Save to store even if server fails
      setTheme(theme);
      toast.success('Theme applied locally (server save failed)');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocal({ ...DEFAULT_THEME });
    resetTheme();
    toast.success('Theme reset to defaults');
  };

  const sections = [
    { key: 'sidebar',  label: 'Sidebar',  icon: Sidebar },
    { key: 'content',  label: 'Content',  icon: Monitor },
    { key: 'accent',   label: 'Accent',   icon: Palette },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Theme</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Customize colors — changes preview instantly, no reload needed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-error transition-colors px-3 py-2"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <Button icon={Save} loading={saving} onClick={handleSave}>
            Save Theme
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <Card>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Live Preview</p>
        <MiniPreview theme={theme} />
      </Card>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                ${activeSection === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              <Icon size={15} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* ── SIDEBAR SECTION ── */}
      {activeSection === 'sidebar' && (
        <div className="space-y-5">
          {/* Preset cards */}
          <Card>
            <p className="text-sm font-medium text-text-primary mb-3">Preset Styles</p>
            <div className="grid grid-cols-4 gap-2">
              {SIDEBAR_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isActive = theme.sidebarPreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all hover:scale-105
                      ${isActive ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40'}`}
                  >
                    {/* Mini sidebar swatch */}
                    <div
                      className="w-10 h-8 rounded flex items-center justify-center"
                      style={{ background: preset.values.sidebarBg, border: `1px solid ${preset.values.sidebarBorder}` }}
                    >
                      <div className="w-2.5 h-5 rounded-sm flex flex-col gap-0.5 py-0.5">
                        <div className="h-1 rounded-sm w-full" style={{ background: preset.values.sidebarActiveBg }} />
                        <div className="h-0.5 rounded-sm w-full" style={{ background: preset.values.sidebarText, opacity: 0.5 }} />
                        <div className="h-0.5 rounded-sm w-full" style={{ background: preset.values.sidebarText, opacity: 0.5 }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-text-secondary">{preset.label}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Manual colors */}
          <Card>
            <p className="text-sm font-medium text-text-primary mb-4">Manual Colors</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Swatch label="Background"   field="sidebarBg"          value={theme.sidebarBg}          onChange={update} />
              <Swatch label="Border"       field="sidebarBorder"      value={theme.sidebarBorder}      onChange={update} />
              <Swatch label="Text"         field="sidebarText"        value={theme.sidebarText}        onChange={update} />
              <Swatch label="Text (hover)" field="sidebarTextHover"   value={theme.sidebarTextHover}   onChange={update} />
              <Swatch label="Active bg"    field="sidebarActiveBg"    value={theme.sidebarActiveBg}    onChange={update} />
              <Swatch label="Active text"  field="sidebarActiveText"  value={theme.sidebarActiveText}  onChange={update} />
              <Swatch label="Hover bg"     field="sidebarHoverBg"     value={theme.sidebarHoverBg}     onChange={update} />
              <Swatch label="Group labels" field="sidebarGroupText"   value={theme.sidebarGroupText}   onChange={update} />
            </div>
          </Card>

          {/* Glass effect */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-text-primary">Glass Effect</p>
              <label className="relative inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={!!theme.sidebarGlass}
                  onChange={e => update('sidebarGlass', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors" />
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${theme.sidebarGlass ? 'translate-x-4' : ''}`} />
              </label>
            </div>
            {theme.sidebarGlass && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-text-secondary">Blur intensity</span>
                    <span className="text-xs font-mono text-text-primary">{theme.sidebarGlassBlur || 12}px</span>
                  </div>
                  <input
                    type="range" min={0} max={30} step={1}
                    value={theme.sidebarGlassBlur || 12}
                    onChange={e => update('sidebarGlassBlur', parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-text-secondary">Background opacity</span>
                    <span className="text-xs font-mono text-text-primary">
                      {Math.round((theme.sidebarGlassOpacity ?? 0.85) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range" min={0.1} max={1} step={0.05}
                    value={theme.sidebarGlassOpacity ?? 0.85}
                    onChange={e => update('sidebarGlassOpacity', parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── CONTENT SECTION ── */}
      {activeSection === 'content' && (
        <Card>
          <p className="text-sm font-medium text-text-primary mb-4">Content Area Colors</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Swatch label="Page background" field="contentBg"   value={theme.contentBg}   onChange={update} />
            <Swatch label="Card background" field="cardBg"      value={theme.cardBg}      onChange={update} />
            <Swatch label="Card border"     field="cardBorder"  value={theme.cardBorder}  onChange={update} />
            <Swatch label="Border color"    field="borderColor" value={theme.borderColor}  onChange={update} />
            <Swatch label="Primary text"    field="textPrimary"   value={theme.textPrimary}   onChange={update} />
            <Swatch label="Secondary text"  field="textSecondary" value={theme.textSecondary} onChange={update} />
          </div>
        </Card>
      )}

      {/* ── ACCENT SECTION ── */}
      {activeSection === 'accent' && (
        <div className="space-y-5">
          <Card>
            <p className="text-sm font-medium text-text-primary mb-3">Accent Presets</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map(a => (
                <button
                  key={a.label}
                  onClick={() => applyAccent(a)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105
                    ${theme.colorPrimary === a.primary ? 'ring-2 ring-offset-1 scale-105' : ''}`}
                  style={{
                    background: a.primary + '18',
                    borderColor: a.primary,
                    color: a.primary,
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.primary }} />
                  {a.label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-medium text-text-primary mb-4">Custom Accent Colors</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Swatch label="Primary (buttons, links)" field="colorPrimary"      value={theme.colorPrimary}      onChange={update} />
              <Swatch label="Primary hover"            field="colorPrimaryHover" value={theme.colorPrimaryHover} onChange={update} />
              <Swatch label="Accent / secondary"       field="colorAccent"       value={theme.colorAccent}       onChange={update} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ThemeSettings;
