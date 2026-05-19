/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
      },
      colors: {
        mushroom: {
          50: '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc0c0',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        pop: 'pop 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
