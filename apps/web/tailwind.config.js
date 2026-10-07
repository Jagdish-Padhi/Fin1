/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        trust: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          primary: '#0F2A43',
          'primary-hover': '#0A1E30',
          secondary: '#1F5A7A',
          'secondary-hover': '#184761',
          accent: '#0F766E',
          'accent-light': '#F0FDFA',
          'accent-hover': '#0D655E',
          text: '#17202A',
          'text-muted': '#5A6A7E',
          'text-subtle': '#8795A5',
          border: '#D8E0E8',
          'border-subtle': '#E8EEF3',
          success: '#18794E',
          'success-bg': '#F0FDF4',
          'success-border': '#BBF7D0',
          warning: '#A16207',
          'warning-bg': '#FEFCE8',
          'warning-border': '#FEF08A',
          error: '#B42318',
          'error-bg': '#FEF2F2',
          'error-border': '#FECDD3',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
        logo: ['Outfit', 'Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(15, 42, 67, 0.04), 0 1px 2px -1px rgba(15, 42, 67, 0.04)',
        card: '0 4px 12px -2px rgba(15, 42, 67, 0.05), 0 2px 6px -2px rgba(15, 42, 67, 0.03)',
        popover: '0 10px 25px -5px rgba(15, 42, 67, 0.08), 0 8px 10px -6px rgba(15, 42, 67, 0.04)',
      },
    },
  },
  plugins: [],
};
