/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens using CSS variables
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          secondary: 'var(--color-accent-secondary)',
        },
        // Destiny rarity colors
        destiny: {
          exotic: '#ceae33',
          legendary: '#522f65',
          rare: '#5076a3',
          uncommon: '#366f42',
          common: '#c3bcb4',
        }
      },
      // Ring offset color for theme-aware perk icons
      ringOffsetColor: {
        surface: 'var(--color-surface)',
      }
    },
  },
  plugins: [],
}
