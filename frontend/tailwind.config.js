/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(40 33% 97%)',
        foreground: 'hsl(214 61% 15%)',
        border: 'hsl(42 23% 85%)',
        input: 'hsl(42 23% 88%)',
        ring: 'hsl(210 82% 21%)',
        primary: 'hsl(210 82% 21%)',
        'primary-foreground': 'hsl(0 0% 100%)',
        secondary: 'hsl(9 60% 41%)',
        'secondary-foreground': 'hsl(0 0% 100%)',
        muted: 'hsl(40 20% 94%)',
        'muted-foreground': 'hsl(215 15% 42%)',
        accent: 'hsl(42 100% 45%)',
        'accent-foreground': 'hsl(214 61% 15%)',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
};
