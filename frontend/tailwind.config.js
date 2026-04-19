/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07071a',
        surface: '#0f0f2d',
        card: '#141432',
        border: 'rgba(139,92,246,0.15)',
        primary: {
          DEFAULT: '#7c3aed',
          light: '#8b5cf6',
          glow: 'rgba(124,58,237,0.3)',
        },
        accent: {
          DEFAULT: '#0ea5e9',
          glow: 'rgba(14,165,233,0.3)',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        muted: '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.25), transparent)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow: { from: { boxShadow: '0 0 5px rgba(124,58,237,0.3)' }, to: { boxShadow: '0 0 20px rgba(124,58,237,0.6)' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124,58,237,0.4)',
        'glow-cyan': '0 0 20px rgba(14,165,233,0.4)',
        'card': '0 4px 32px rgba(0,0,0,0.4)',
      }
    },
  },
  plugins: [],
}
