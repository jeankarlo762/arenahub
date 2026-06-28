import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        orange: {
          50:  '#fffbea',
          100: '#fef3c0',
          200: '#fde37a',
          300: '#fbd034',
          400: '#f7c118',
          500: '#F2B705',
          600: '#d4a004',
          700: '#b08500',
          800: '#8a6500',
          900: '#6d5000',
        },
        primary: {
          50:  '#fffbea',
          100: '#fef3c0',
          500: '#F2B705',
          600: '#d4a004',
          700: '#b08500',
          900: '#6d5000',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
