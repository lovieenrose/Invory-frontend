/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — a cool-neutral "ledger" palette: deep moss green as
        // the working brand color (growth/stock), warm rust reserved strictly
        // for alerts, gold for highlights (top performers). Deliberately not
        // the generic cream+terracotta or indigo-on-dark defaults.
        ink: {
          DEFAULT: '#12161C',
          soft: '#5C6470',
          faint: '#8B93A1',
        },
        paper: '#F6F7F9',
        surface: '#FFFFFF',
        border: '#E4E7EB',
        brand: {
          50: '#EEF5F0',
          100: '#D6E7DC',
          400: '#4A8B67',
          500: '#2F6F4F',
          600: '#24593F',
          700: '#1B4530',
        },
        rust: {
          50: '#FBEEE9',
          400: '#D3714A',
          500: '#B5482A',
          600: '#933A21',
        },
        gold: {
          50: '#FBF3E3',
          400: '#D9A441',
          500: '#C68A2E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 22, 28, 0.04), 0 1px 12px rgba(18, 22, 28, 0.04)',
        popover: '0 8px 30px rgba(18, 22, 28, 0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};
