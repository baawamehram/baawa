export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'saturn-charcoal': '#111827',
        'saturn-gray':     '#1F2937',
        'saturn-emerald':  '#064E3B',
        'saturn-emerald-mid': '#059669',
        'saturn-emerald-light': '#34D399',
        'saturn-white':    '#F9FAFB',
        'saturn-muted':    '#4B5563',
        'saturn-rose':     '#FB7185',
        'deep-navy':       '#111827', // Legacy fallback for deep-navy
        'warm-white':      '#F9FAFB', // Legacy fallback for warm-white
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
