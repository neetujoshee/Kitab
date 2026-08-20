/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#07070f',
        surface: '#0f0f1c',
        card:    '#161625',
        raised:  '#1e1e30',
        border:  '#28284a',
        accent:  '#f5c842',
        muted:   '#6868a0',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gold-shimmer': 'linear-gradient(135deg, #f5c842 0%, #ff9d6c 50%, #ff7eb3 100%)',
      },
    },
  },
  plugins: [],
}
