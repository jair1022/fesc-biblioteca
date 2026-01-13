/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#DC143C',
        'primary-hover': '#B01030',
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        gray: {
          light: '#F5F5F5',
          dark: '#333333',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

