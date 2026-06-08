/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-body)',    'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },
      colors: {
        // Semantic colors driven by CSS variables (theme-aware)
        ink:        'var(--c-ink)',         // page background
        surface:    'var(--c-surface)',     // card background
        panel:      'rgb(var(--c-panel-rgb) / <alpha-value>)',    // elevated panel
        border:     'var(--c-border)',
        light:      'rgb(var(--c-light-rgb) / <alpha-value>)',  // primary text
        muted:      'var(--c-muted)',       // secondary text
        accent:     'var(--c-accent)',      // primary accent (acid lime)
        'accent-ink': 'var(--c-accent-ink)',// readable color ON accent
        accent2:    'rgb(var(--c-accent2-rgb) / <alpha-value>)', // danger
      },
      boxShadow: {
        'card':  '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
        'pop':   '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
