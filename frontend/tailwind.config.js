/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-blue': '#F0F9FF',
        'custom-purple': '#EAE3FA',
        'custom-pink': '#FFF0F7',
        'custom-darkPink': '#EAE3FA',
        'custom-yellow': '#FFFAE1',
        'custom-red': '#FCE5F0',
        'custom-selectedPurple': '#B21FDC',
        'brand-blue': '#00416A',
        'brand-lightBlue': '#0072B5',
        'brand-yellow': '#FFD700',
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
      borderRadius: {
        lg: '1rem',
        xl: '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.9)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-in-delay': 'fade-in 1s ease-out forwards',
        'slide-up': 'slide-up 0.6s ease-out forwards',
        'slide-down': 'slide-down 0.6s ease-out forwards',
        'zoom-in': 'zoom-in 0.5s ease-out forwards',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};
