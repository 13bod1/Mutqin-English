/** @type {import('tailwindcss').Config} */
// Design tokens derived from the "Mutqin English" Figma file (café au lait palette).
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          hover: 'var(--color-primary-hover)',
          mid: 'var(--color-primary-mid)',
          light: 'var(--color-primary-light)',
          foreground: 'var(--color-primary-foreground)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink-rgb) / <alpha-value>)', // headings
          body: 'rgb(var(--color-ink-body-rgb) / <alpha-value>)',
          soft: 'rgb(var(--color-ink-soft-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-ink-muted-rgb) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--color-line-rgb) / <alpha-value>)',
          soft: 'rgb(var(--color-line-soft-rgb) / <alpha-value>)',
        },
        surface: {
          page: 'rgb(var(--color-surface-page-rgb) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card-rgb) / <alpha-value>)',
          tint: 'rgb(var(--color-surface-tint-rgb) / <alpha-value>)',
          tint2: 'rgb(var(--color-surface-tint2-rgb) / <alpha-value>)',
          tint3: 'rgb(var(--color-surface-tint3-rgb) / <alpha-value>)',
          tint4: 'rgb(var(--color-surface-tint4-rgb) / <alpha-value>)',
          highlight: 'rgb(var(--color-surface-highlight-rgb) / <alpha-value>)',
          warm: 'rgb(var(--color-surface-warm-rgb) / <alpha-value>)',
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
