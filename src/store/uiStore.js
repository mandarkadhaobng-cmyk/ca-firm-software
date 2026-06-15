import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsService } from '../services/settingsService';

// ── Default theme values (must match :root in index.css) ────────────────────
export const DEFAULT_THEME = {
  // Sidebar
  sidebarBg:          '#ffffff',
  sidebarBorder:      '#E5EAF2',
  sidebarText:        '#6B7280',
  sidebarTextHover:   '#1F2937',
  sidebarActiveBg:    '#5B6B7A',
  sidebarActiveText:  '#ffffff',
  sidebarHoverBg:     '#f3f4f6',
  sidebarGroupText:   '#9CA3AF',
  sidebarGlass:       false,
  sidebarGlassBlur:   12,
  sidebarGlassOpacity: 0.85,
  sidebarPreset:      'light',
  // Content
  contentBg:    '#F7F9FC',
  cardBg:       '#ffffff',
  cardBorder:   '#E5EAF2',
  // Brand / accent
  colorPrimary:      '#5B6B7A',
  colorPrimaryHover: '#4A5A68',
  colorAccent:       '#818cf8',
  // Text
  textPrimary:   '#1F2937',
  textSecondary: '#6B7280',
  borderColor:   '#E5EAF2',
};

// ── Apply a theme object as CSS custom properties ────────────────────────────
export const applyThemeToCss = (theme = {}) => {
  const t = { ...DEFAULT_THEME, ...theme };
  const r = document.documentElement;

  // Brand
  r.style.setProperty('--color-primary',       t.colorPrimary);
  r.style.setProperty('--color-primary-hover',  t.colorPrimaryHover);
  r.style.setProperty('--color-accent',         t.colorAccent);

  // Sidebar
  r.style.setProperty('--sidebar-bg',          t.sidebarBg);
  r.style.setProperty('--sidebar-border',      t.sidebarBorder);
  r.style.setProperty('--sidebar-text',        t.sidebarText);
  r.style.setProperty('--sidebar-text-hover',  t.sidebarTextHover);
  r.style.setProperty('--sidebar-active-bg',   t.sidebarActiveBg);
  r.style.setProperty('--sidebar-active-text', t.sidebarActiveText);
  r.style.setProperty('--sidebar-hover-bg',    t.sidebarHoverBg);
  r.style.setProperty('--sidebar-group-text',  t.sidebarGroupText);

  // Glass effect
  if (t.sidebarGlass) {
    const blur = t.sidebarGlassBlur || 12;
    const opacity = t.sidebarGlassOpacity ?? 0.85;
    // Parse sidebarBg as hex and add opacity
    const hex = t.sidebarBg.replace('#', '');
    const rgb = hex.length === 6
      ? [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)]
      : [255, 255, 255];
    r.style.setProperty('--sidebar-backdrop', `blur(${blur}px)`);
    r.style.setProperty('--sidebar-bg', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity})`);
  } else {
    r.style.setProperty('--sidebar-backdrop', 'none');
  }

  // Content
  r.style.setProperty('--content-bg',   t.contentBg);
  r.style.setProperty('--card-bg',      t.cardBg);
  r.style.setProperty('--card-border',  t.cardBorder);

  // Text / border
  r.style.setProperty('--text-primary',   t.textPrimary);
  r.style.setProperty('--text-secondary', t.textSecondary);
  r.style.setProperty('--border-color',   t.borderColor);
};

// ── Zustand store ────────────────────────────────────────────────────────────
const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      branding: null,
      theme: { ...DEFAULT_THEME },
      darkMode: false,

      toggleSidebar:       () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleMobileSidebar: () => set(s => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
      closeMobileSidebar:  () => set({ sidebarMobileOpen: false }),

      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        document.documentElement.setAttribute('data-dark-mode', next ? 'true' : 'false');
        // When turning dark mode OFF, re-apply the saved theme so custom colors come back
        if (!next) applyThemeToCss(get().theme);
      },

      // ── Branding (legacy — kept for Login page logo/color) ──────────────
      setBranding: (data) => {
        set({ branding: data });
        const r = document.documentElement;
        if (data?.primary_color) r.style.setProperty('--color-primary', data.primary_color);
        if (data?.accent_color)  r.style.setProperty('--color-accent',  data.accent_color);
        if (data?.text_color)    r.style.setProperty('--text-primary',   data.text_color);
        if (data?.bg_color)      r.style.setProperty('--content-bg',     data.bg_color);
      },

      applyBrandingColors: (data) => {
        if (!data) return;
        const r = document.documentElement;
        if (data.primary_color) r.style.setProperty('--color-primary', data.primary_color);
        if (data.accent_color)  r.style.setProperty('--color-accent',  data.accent_color);
        if (data.text_color)    r.style.setProperty('--text-primary',   data.text_color);
        if (data.bg_color)      r.style.setProperty('--content-bg',     data.bg_color);
      },

      fetchBranding: async () => {
        try {
          const data = await settingsService.getBranding();
          set({ branding: data });
          get().applyBrandingColors(data);
        } catch (e) {
          console.error('Failed to fetch branding', e);
        }
      },

      // ── Full theme ──────────────────────────────────────────────────────
      setTheme: (theme) => {
        set({ theme });
        applyThemeToCss(theme);
      },

      fetchTheme: async () => {
        try {
          const data = await settingsService.getTheme();
          if (data && Object.keys(data).length > 0) {
            set({ theme: { ...DEFAULT_THEME, ...data } });
            applyThemeToCss(data);
          }
        } catch (e) {
          console.error('Failed to fetch theme', e);
        }
      },

      saveTheme: async (theme) => {
        try {
          const saved = await settingsService.updateTheme(theme);
          const merged = { ...DEFAULT_THEME, ...(saved || theme) };
          set({ theme: merged });
          applyThemeToCss(merged);
          return merged;
        } catch (e) {
          console.error('Failed to save theme', e);
          throw e;
        }
      },

      resetTheme: () => {
        set({ theme: { ...DEFAULT_THEME } });
        applyThemeToCss(DEFAULT_THEME);
      },
    }),
    {
      name: 'ca-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        darkMode: state.darkMode,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-apply CSS vars and dark mode attribute on page load from persisted state
        if (state?.darkMode) {
          document.documentElement.setAttribute('data-dark-mode', 'true');
        } else {
          document.documentElement.setAttribute('data-dark-mode', 'false');
          if (state?.theme) applyThemeToCss(state.theme);
        }
      },
    }
  )
);

export default useUIStore;
