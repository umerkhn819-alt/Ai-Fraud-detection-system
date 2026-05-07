/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#2563eb', 600: '#1d4ed8' },
        fraud: { 500: '#ef4444', 600: '#dc2626' },
      },
    },
  },
  plugins: [],
}
