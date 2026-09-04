import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14181A',
        paper: '#FAF9F6',
        accent: {
          DEFAULT: '#1C9A4B',
          ink: '#0F5E2E',
          soft: '#E3F5E9',
        },
        halal: {
          full: '#1F7A45',
          fullSoft: '#E1F1E5',
          partial: '#A8720F',
          partialSoft: '#F6ECD6',
          unverified: '#6D766F',
          unverifiedSoft: '#EBEAE3',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
