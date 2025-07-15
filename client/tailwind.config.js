/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3b82f6',
          dark: '#1d4ed8',
        },
        background: {
          light: '#ffffff',
          dark: '#1f2937',
        },
        surface: {
          light: '#f9fafb',
          dark: '#374151',
        },
        text: {
          light: '#1f2937',
          dark: '#f9fafb',
        }
      }
    },
  },
  plugins: [],
}