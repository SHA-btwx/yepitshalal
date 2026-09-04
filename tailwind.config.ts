import type { Config } from 'tailwindcss';

// Colour tokens are contrast-checked against the two surfaces they actually sit
// on: paper (#FAF9F6) and card white. Every `*Ink` token clears 4.5:1 on both,
// so status text stays readable at the 12-13px sizes the badges use. The
// unsuffixed `full`/`partial`/`unverified` values are the saturated *dot and map
// pin* colours — they are decoration next to a text label, never text themselves.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14181A',
        // Secondary body text. 5.87:1 on paper, 6.18:1 on white.
        muted: '#5B6360',
        // Tertiary/meta text — the lightest tone still allowed on text. 4.68:1 / 4.92:1.
        subtle: '#6B7270',
        paper: '#FAF9F6',
        line: 'rgba(20,24,26,0.08)',
        accent: {
          DEFAULT: '#1C9A4B',
          ink: '#0F5E2E',
          soft: '#E3F5E9',
          // Green that still reads on the ink surface (7.95:1) — #1C9A4B only manages 4.91:1.
          onDark: '#34C56B',
        },
        halal: {
          full: '#1F7A45',
          fullInk: '#166534',
          fullSoft: '#E1F1E5',
          partial: '#A8720F',
          partialInk: '#7A5200',
          partialSoft: '#F6ECD6',
          unverified: '#6D766F',
          unverifiedInk: '#4F564F',
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
      spacing: {
        // Bottom action bars and mobile nav sit above the iOS home indicator.
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
      },
      transitionTimingFunction: {
        // Decelerating curve — things arrive quickly then settle.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
