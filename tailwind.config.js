/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        siren: {
          bg: '#0a0a0f',
          surface: '#141419',
          border: '#2a2a35',
          accent: '#7c3aed',
          'accent-hover': '#8b5cf6',
          text: '#e4e4e7',
          'text-muted': '#71717a',
        }
      }
    },
  },
  plugins: [],
}
