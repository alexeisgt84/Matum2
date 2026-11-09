/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        // Tipografía de las tiendas públicas: texto en Inter, títulos en Plus Jakarta Sans
        store: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
      fontSize: {
        xs: ['0.6875rem', { lineHeight: '0.95rem' }],     // 11px
        sm: ['0.75rem', { lineHeight: '1.05rem' }],       // 12px
        base: ['0.8125rem', { lineHeight: '1.2rem' }],    // 13px
        lg: ['0.875rem', { lineHeight: '1.25rem' }],      // 14px
        xl: ['0.9375rem', { lineHeight: '1.35rem' }],     // 15px
        '2xl': ['1.0625rem', { lineHeight: '1.45rem' }],  // 17px
        '3xl': ['1.25rem', { lineHeight: '1.6rem' }],     // 20px
        '4xl': ['1.5rem', { lineHeight: '1.85rem' }],     // 24px
      },
      keyframes: {
        'store-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'store-slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'store-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'store-fade-up': 'store-fade-up 260ms ease-out both',
        'store-slide-up': 'store-slide-up 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'store-pop': 'store-pop 320ms ease-out',
      },
      colors: {
        background: 'color-mix(in srgb, var(--background) calc(100% * <alpha-value>), transparent)',
        surface: 'color-mix(in srgb, var(--surface) calc(100% * <alpha-value>), transparent)',
        'surface-hover': 'color-mix(in srgb, var(--surface-hover) calc(100% * <alpha-value>), transparent)',
        border: 'color-mix(in srgb, var(--border) calc(100% * <alpha-value>), transparent)',
        primary: 'color-mix(in srgb, var(--text-primary) calc(100% * <alpha-value>), transparent)',
        secondary: 'color-mix(in srgb, var(--text-secondary) calc(100% * <alpha-value>), transparent)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
      },
      screens: {
        'xs': '400px',
      },
    },
  },
  plugins: [],
}
