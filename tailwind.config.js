/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0f172a', // Slate 900
          hover: '#1e293b',   // Slate 800
          active: '#334155',  // Slate 700
          text: '#94a3b8',    // Slate 400
          textActive: '#f8fafc', // Slate 50
          border: '#334155',  // Slate 700
        },
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // Cyan 500
          600: '#0891b2', // Cyan 600
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63', // Cyan 900
          950: '#083344',
        },
        nexus: {
          dark: '#0B1120', // Deep Blue-Black
          card: '#0f172a', // Card background Slate-900
          border: '#1e293b', // Border Slate-800
          grape: '#1e1b4b', // Deep Indigo
          glass: 'rgba(255, 255, 255, 0.05)',
        },
      },
      backgroundImage: {
        'nexus-gradient': 'linear-gradient(135deg, #0B1120 0%, #111827 100%)',
        'nexus-accent': 'linear-gradient(to right, #06b6d4, #6366f1)', // Cyan to Indigo
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
