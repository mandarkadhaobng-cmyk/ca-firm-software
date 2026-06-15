/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #5B6B7A)',
          50: '#F0F3F5',
          100: '#E1E7EB',
          200: '#C3CED7',
          300: '#A5B5C3',
          400: '#879CAF',
          500: '#5B6B7A',
          600: '#4A5A68',
          700: '#394956',
          800: '#283844',
          900: '#172732',
        },
        background: 'var(--content-bg, #F7F9FC)',
        sidebar: 'var(--sidebar-bg, #FFFFFF)',
        border: 'var(--border-color, #E5EAF2)',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        text: {
          primary: 'var(--text-primary, #1F2937)',
          secondary: 'var(--text-secondary, #6B7280)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
