/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1F3A',
        royal: '#1E4ED8',
        teal: '#14B8A6',
        gold: '#D4A63A',
        'light-gray': '#F4F7FB',
        'mid-gray': '#5B6B7F',
        'dark-text': '#111827',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
