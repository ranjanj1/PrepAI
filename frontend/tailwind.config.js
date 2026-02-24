/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0c10',
        surface: '#111318',
        border:  '#1e2229',
        accent:  '#00e5a0',
        muted:   '#5a6070',
        warn:    '#ff6b4a',
        text:    '#e8eaf0',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
