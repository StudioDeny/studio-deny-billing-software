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
          black: '#111111',
          white: '#E2E2E4',
          light: '#D5D5D8',
          soft: '#D5D5D8',
          border: 'rgba(0,0,0,0.18)',
          text: '#111111',
          secondary: '#4A4844',
          muted: '#4A4844',
          subtle: '#E2E2E4',
        },
        accent: '#E0202A',
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
        display: ['Anton', 'Bebas Neue', 'system-ui', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        mono: ['Barlow', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'tightest': '-0.035em',
        'tighter': '-0.02em',
        'widest-editorial': '0.18em',
        'ultra-wide': '0.24em',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'float': '0 12px 36px -8px rgba(17, 17, 17, 0.12)',
        'modal': '0 24px 48px -12px rgba(17, 17, 17, 0.2)',
      }
    },
  },
  plugins: [],
}
