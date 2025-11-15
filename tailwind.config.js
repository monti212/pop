/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Pencils of Promise brand colors
        'primary-blue': '#0170b9',
        'golden-yellow': '#f5b233',
        'deep-navy': '#002F4B',
        'off-white': '#F8F9FA',
        // GreyEd brand colors
        greyed: {
          navy: '#212754',
          blue: '#bbd7eb',
          black: '#292828',
          white: '#efeae4',
          beige: '#dedbc2',
        },
        sand: {
          50: '#FEFEFE',
          100: '#F9F9F8',
          200: '#F7F5F2',
          300: '#EAEAE7',
          400: '#D9D9D4',
        },
        borders: '#EAE7E3',
        navy: {
          DEFAULT: '#19324A',
          50: '#E9EDF1',
          100: '#C5D1DE',
          200: '#8BA3BC',
          300: '#517799',
          400: '#2E4A6A',
          500: '#19324A',
          600: '#132739',
          700: '#0D1B28',
          800: '#080F16',
          900: '#020305',
        },
        teal: {
          DEFAULT: '#0170b9',
          50: '#E6F2F9',
          100: '#B3D9EF',
          200: '#80C0E5',
          300: '#4DA7DB',
          400: '#1A8ED1',
          500: '#0170b9',
          600: '#0165A7',
          700: '#015A95',
          800: '#014F83',
          900: '#014471',
        },
        orange: {
          DEFAULT: '#f5b233',
          50: '#FEF7E8',
          100: '#FDECC6',
          200: '#FBE0A3',
          300: '#F9D481',
          400: '#F7C85F',
          500: '#f5b233',
          600: '#E5A01E',
          700: '#D58E0A',
          800: '#B67808',
          900: '#976206',
        },
      },
      borderRadius: {
        '12': '12px',
        '16': '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.15)',
        glow: '0 0 15px rgba(1, 112, 185, 0.5)',
        premium: '0 8px 32px -4px rgba(1, 112, 185, 0.25), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
        'premium-dark': '0 8px 32px -4px rgba(1, 112, 185, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.2)',
        'card': '0 8px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 20px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.1)',
      },
      screens: {
        xs: '375px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      lineHeight: {
        'tighter': '1.1',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'teal-gradient': 'linear-gradient(135deg, #0170b9 0%, #0165A7 100%)',
        'orange-gradient': 'linear-gradient(135deg, #f5b233 0%, #E5A01E 100%)',
        'premium-gradient': 'linear-gradient(135deg, #0170b9 0%, #f5b233 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};