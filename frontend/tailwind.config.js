/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#faf7f2',
        surface: '#ffffff',
        surface2:'#f0ece4',
        border:  '#e2ddd5',
        accent:  '#ff5c35',
        accent2: '#ffb830',
        muted:   '#8a8078',
        warn:    '#e63946',
        text:    '#1a1612',
        easy:    '#2a9d8f',
        medium:  '#f4a261',
      },
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
        display: ['Fraunces', 'serif'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(26,22,18,0.08)',
        'card-lg': '0 8px 40px rgba(26,22,18,0.12)',
        accent: '0 4px 14px rgba(255,92,53,0.3)',
      },
    },
  },
  plugins: [],
}
