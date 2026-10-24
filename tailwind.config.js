/** @type {import('tailwindcss').Config} */

/* Market colours read from CSS variables (space-separated RGB) so they
 * shift with the theme and still support Tailwind's /alpha modifiers. */
const v = name => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand — taken from the Foliyo mark
        ink:      '#16171b',
        cream:    '#f5f0e6',
        marigold: '#e8a43e',
        steel:    '#5a8ca0',
        harbor:   '#2e4a57',

        // Up / down / caution, retuned to sit with the brand palette
        emerald: { 300: v('--up-soft'),   400: v('--up'),   500: v('--up')   },
        red:     { 300: v('--down-soft'), 400: v('--down'), 500: v('--down') },
        yellow:  { 400: v('--caution') },

        // Neutrals — cool slate, matching the light theme
        slate: { 400: '#8a939c', 500: '#6b747d', 700: '#3a4148', 800: '#262b31' },
        gray:  { 300: '#c4cad0', 400: '#8a939c' },
      },
      fontFamily: {
        sans:    ['Archivo', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
        // Figures use the text face with tabular numerals (see .font-mono in index.css)
        mono:    ['Archivo', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
