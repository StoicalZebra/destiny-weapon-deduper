/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        destiny: {
          exotic: '#ceae33',
          legendary: '#522f65',
          rare: '#5076a3',
          uncommon: '#366f42',
          common: '#c3bcb4',
        }
      }
    },
  },
  plugins: [],
}
