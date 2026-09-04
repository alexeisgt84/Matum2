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
