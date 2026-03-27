export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-navy':    '#0C1220',
        'antique-gold': '#C9A962',
        'warm-white':   '#F5F3EF',
        'stone':        '#8B8680',
        'brand-orange': '#FF6B35',
        'brand-orange-dark': '#E85520',
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'serif'],
        body:    ['Outfit', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
