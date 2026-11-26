/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'IBM Plex Sans Arabic', 'sans-serif'],
        display: ['Playfair Display', 'Cairo', 'serif'],
        hero: ['Inter', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
      colors: {
        forest: '#2B362E',
        bronze: '#A37E5E',
        ivory: '#FAF9F5',
        ink: '#1C221E',
        line: '#E5E2D9',
      },
    },
  },
  plugins: [],
};
