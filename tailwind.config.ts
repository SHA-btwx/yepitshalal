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
        // Warmth, and nothing that carries meaning.
        //
        // The site was all cream and one green, which read as careful and also
        // as empty. These are decorative only: a terracotta for emphasis, a
        // sand for surfaces that want to be warmer than white, and a deep
        // forest for large dark grounds.
        //
        // Terracotta specifically because the obvious warm choice, gold, is
        // already spoken for: halal.partial is amber and means "Halal Options".
        // A second gold anywhere near a listing would read as that label.
        spice: {
          DEFAULT: '#C2542B',
          // 6.43:1 on paper, 6.77:1 on white, 5.91:1 on sand. Safe for text.
          // The DEFAULT below is 4.34:1 on paper, so it is for fills and marks,
          // never for small text.
          ink: '#9A3F1D',
          soft: '#FBEDE6',
          onDark: '#F0956D',
        },
        sand: {
          DEFAULT: '#F5EFE4',
          soft: '#FBF7F0',
          line: 'rgba(120,85,45,0.12)',
        },
        forest: {
          DEFAULT: '#0B3D22',
          deep: '#072A17',
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
