export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-navy': '#0C1220',
        'slate': '#1A2332',
        'antique-gold': '#C9A962',
        'warm-white': '#F5F3EF',
        'stone': '#8B8680',
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'serif'],
        body: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
