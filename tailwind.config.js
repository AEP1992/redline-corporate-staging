/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1a2a4a', light: '#2a3f6a', dark: '#0f1a30' },
        brand: { DEFAULT: '#c41e24', light: '#e63946', dark: '#9a1118' },
        surface: { DEFAULT: '#f5f7fa', card: '#ffffff', border: '#e2e8f0' },
        status: {
          pass: '#22c55e', passLight: '#dcfce7',
          fail: '#ef4444', failLight: '#fee2e2',
          oos: '#f59e0b', oosLight: '#fef3c7',
          action: '#f97316', actionLight: '#fff7ed',
          expired: '#dc2626', expiredLight: '#fecaca'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
