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
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        ink: '#0f1117',
        surface: '#1a1d27',
        panel: '#222536',
        border: '#2e3248',
        accent: '#f5a623',
        accent2: '#e85d75',
        muted: '#6b7280',
        light: '#e8e9f0',
      },
    },
  },
  plugins: [],
}
