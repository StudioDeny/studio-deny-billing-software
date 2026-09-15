/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deny: {
          black: '#0A0A0A',
          white: '#FFFFFF',
          light: '#F1F1F3',
          soft: '#E7E7E9',
          border: '#CFCFD2',
          text: '#111111',
          secondary: '#666666',
          muted: '#888888',
          subtle: '#FAFAFA',
        },
        status: {
          green: '#15803D',
          greenBg: '#F0FDF4',
          greenBorder: '#BBF7D0',
          amber: '#B45309',
          amberBg: '#FFFBEB',
          amberBorder: '#FDE68A',
          red: '#B91C1C',
          redBg: '#FEF2F2',
          redBorder: '#FECACA',
          blue: '#1D4ED8',
          blueBg: '#EFF6FF',
          blueBorder: '#BFDBFE',
        }
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        'tightest': '-0.035em',
        'tighter': '-0.02em',
        'widest-editorial': '0.18em',
        'ultra-wide': '0.24em',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'float': '0 12px 36px -8px rgba(10, 10, 10, 0.12)',
        'modal': '0 24px 48px -12px rgba(10, 10, 10, 0.2)',
      }
    },
  },
  plugins: [],
}
