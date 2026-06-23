/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1a1612',
          light: '#302c26',
          muted: '#554e45',
          faint: '#8a8074',
        },
        cream: {
          DEFAULT: '#f7f3ed',
          warm: '#ede6db',
          dark: '#e2d9cc',
        },
        paper: {
          DEFAULT: '#fdfcfa',
        },
        sienna: {
          DEFAULT: '#c45a2e',
          light: '#e0784f',
          dark: '#a0431e',
          50: '#fdf4ef',
          100: '#f8e0d3',
          200: '#f0c0a8',
          300: '#e4997a',
          400: '#d97a55',
          500: '#c45a2e',
          600: '#a0431e',
          700: '#7a3215',
          800: '#59240f',
          900: '#3a1609',
        },
        olive: {
          DEFAULT: '#8b7e4a',
          light: '#a89a66',
          dark: '#6e632f',
          50: '#f7f5ed',
          100: '#e9e4d1',
          200: '#d4ccab',
          300: '#b8ad7e',
          400: '#9e9260',
          500: '#8b7e4a',
          600: '#6e632f',
          700: '#51481f',
          800: '#342f13',
          900: '#1c1908',
        },
        // Legacy mapping for smooth migration
        brand: {
          50: '#fdf4ef', 100: '#f8e0d3', 200: '#f0c0a8', 300: '#e4997a',
          400: '#d97a55', 500: '#c45a2e', 600: '#a0431e', 700: '#7a3215',
          800: '#59240f', 900: '#3a1609',
        },
        surface: {
          50: '#fdfcfa', 100: '#f7f3ed', 200: '#ede6db', 300: '#e2d9cc',
          400: '#c9bda9', 500: '#a89a82', 600: '#8a8074', 700: '#6b6055',
          800: '#4d453d', 900: '#302c26',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'Times', 'serif'],
        display: ['"DM Serif Display"', 'Georgia', 'Times', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 12px 24px -6px rgb(0 0 0 / 0.08), 0 6px 12px -4px rgb(0 0 0 / 0.04)',
        'elevated': '0 24px 48px -8px rgb(0 0 0 / 0.12), 0 12px 20px -8px rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        'card': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}
