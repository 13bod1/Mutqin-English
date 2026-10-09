/** @type {import('tailwindcss').Config} */
// Design tokens derived from the "Mutqin English" Figma file (café au lait palette).
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4E342E',
          hover: '#3E2723',
          mid: '#6D4C41',
          light: '#8D6E63',
        },
        ink: {
          DEFAULT: '#361F1A', // headings
          body: '#504442',
          soft: '#79564B',
          muted: '#827471',
        },
        line: {
          DEFAULT: '#D4C3BF',
          soft: '#E6DFDA',
        },
        surface: {
          page: '#FFF8F6',
          card: '#FFFFFF',
          tint: '#F9EBE7',
          tint2: '#F3E5E2',
          tint3: '#EDE0DC',
          tint4: '#E4D7D4',
          highlight: '#FFDBCF',
          warm: '#FFF1ED',
        },
        gold: {
          DEFAULT: '#D4AF37',
          dark: '#8C6D1F',
          soft: '#FDF3D7',
        },
        success: {
          DEFAULT: '#047857',
          mid: '#059669',
          soft: '#E7F6EF',
        },
        danger: {
          DEFAULT: '#BA1A1A',
          soft: '#FFEDEA',
          line: '#F2B8B5',
        },
        amber: {
          soft: '#FEF3C7',
          DEFAULT: '#92400E',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em' }],
        'display-lg': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.015em' }],
        'display-md': ['1.5rem', { lineHeight: '2rem' }],
      },
      borderRadius: {
        card: '12px',
        'card-lg': '16px',
        banner: '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(78,52,46,.04), 0 2px 8px -1px rgba(78,52,46,.08)',
        lift: '0 8px 24px -4px rgba(78,52,46,.12)',
        deep: '0 16px 36px -6px rgba(78,52,46,.16)',
        btn: '0 3px 6px -2px rgba(78,52,46,.25)',
      },
      maxWidth: {
        page: '1280px',
      },
    },
  },
  plugins: [],
};
