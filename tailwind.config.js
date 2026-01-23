/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'qcloud': {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          dark: '#0f172a',
          light: '#f8fafc',
          bg: '#f1f5f9',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#1e293b',
          muted: '#64748b',
        }
      }
    },
  },
  plugins: [],
}
