/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          900: '#0c4a6e',
        },
        noah: {
          blue: '#1E40AF',
          dark: '#0F172A',
          emerald: '#10B981',
          amber: '#F59E0B',
        }
      }
    },
  },
  plugins: [],
}
