/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Smitt-Dent palette (del diseño de referencia)
        'blue-dark':   '#0d2b55',
        'blue-mid':    '#1a4a8a',
        'blue-accent': '#2272d4',
        'blue-light':  '#e8f1fb',
        'teal':        '#00b2a9',
        'surface':     '#f4f7fc',
        'border-col':  '#dce5f0',
        'text-muted':  '#6b7fa3',
        'text-main':   '#0d2b55',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      borderRadius: {
        'xl2': '14px',
      },
      width: {
        sidebar: '220px',
      },
      height: {
        topbar: '60px',
      },
    },
  },
  plugins: [],
}
