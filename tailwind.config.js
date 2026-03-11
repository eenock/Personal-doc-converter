/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:    '#1a1412',
        paper:  '#f5f0e8',
        cream:  '#ede7d9',
        rust: {
          DEFAULT: '#c4471a',
          light:   '#e8b89a',
        },
        muted:  '#7a6f65',
        border: '#d4c9b8',
      },
      fontFamily: {
        mono:    ['var(--font-mono)', 'monospace'],
        serif:   ['var(--font-serif)', 'serif'],
      },
      boxShadow: {
        card: '0 4px 40px rgba(26,20,18,0.06)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up':   'fadeUp 0.5s ease both',
        'spin-slow': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};
