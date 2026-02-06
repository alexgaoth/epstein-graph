/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        graph: {
          bg: '#06060c',
          surface: '#0d0d18',
          border: '#1a1a2e',
          accent: '#00d4ff',
          'accent-dim': '#0088aa',
          muted: '#444466',
          faded: '#1a1a2e',
          text: '#c8c8e0',
          'text-dim': '#666688',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
