/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0a1f44',
        gold: '#c9a24b',
        cream: '#faf6ee',
      },
    },
  },
  plugins: [],
}
