/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Westworld: Delos Champagne Gold ─────────────────────
           Muted, warm gold — replaces neon amber.
           50 = darkest (dark-first convention preserved). */
        primary: {
          50: '#1e1810', 100: '#3d3020', 200: '#635030', 300: '#8B7040',
          400: '#A98C55', 500: '#C9A96E', 600: '#D4B98A', 700: '#DFC9A6',
          800: '#EAD9C2', 900: '#F5E9DE',
        },
        /* ── Westworld: Mesa Hub Slate ───────────────────────────
           Cool blue-gray — replaces neon teal. */
        accent: {
          50: '#141A1E', 100: '#283038', 200: '#3C4852', 300: '#50606C',
          400: '#6B7D8A', 500: '#8A9BA8', 600: '#A1AFB9', 700: '#B8C3CB',
          800: '#CFD7DC', 900: '#E6EBED',
        },
        /* ── Westworld: Obsidian Slate surface stack ────────────
           Dark-first: 50 = base (#1A1A1B), 900 = lightest. */
        surface: {
          50: '#1A1A1B', 100: '#222223', 200: '#2A2A2B', 300: '#333334',
          400: '#444445', 500: '#666667', 600: '#888889', 700: '#9A9A9B',
          800: '#CCCCCD', 900: '#E8E8E9',
        },
        /* ── Muted functional colours ───────────────────────── */
        success: { 50: '#0d2818', 100: '#14532d', 200: '#166534', 400: '#6EBF8B', 500: '#4A9D6E', 600: '#2D7D4F', 700: '#A3D9B8' },
        warning: { 50: '#1c1708', 100: '#3B3010', 200: '#6B4B1A', 400: '#D4A74E', 500: '#B8912F', 600: '#9A7A1E', 700: '#E8C97D' },
        error:   { 50: '#2a1215', 100: '#451515', 200: '#7f1d1d', 400: '#D47272', 500: '#B94A4A', 600: '#9A3333', 700: '#E8A3A3' },
        /* ── Named Westworld tokens ─────────────────────────── */
        aluminum: '#D1D1D1',
        obsidian: '#1A1A1B',
        ivory:    '#F5F5F5',
        delos:    '#C9A96E',
        mesa:     '#8A9BA8',
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        serif:   ['Cormorant Garamond', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18':  '4.5rem',
        '88':  '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        'none': '0',
        DEFAULT: '1px',
        'sm': '1px',
        'md': '2px',
      },
      /* ── Shadows — clean depth, no neon glow ──────────────── */
      boxShadow: {
        'subtle':      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        glass:         '0 8px 32px rgba(0,0,0,0.2)',
        'glass-lg':    '0 24px 48px rgba(0,0,0,0.25)',
        'glass-inner': 'inset 0 1px 0 rgba(209,209,209,0.03)',
        neon:          '0 0 8px rgba(201,169,110,0.06)',
        'neon-lg':     '0 0 16px rgba(201,169,110,0.05)',
        'neon-sm':     '0 0 4px rgba(201,169,110,0.08)',
        'neon-teal':   '0 0 8px rgba(138,155,168,0.06)',
        card:          '0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(209,209,209,0.06)',
        'card-hover':  '0 8px 24px rgba(0,0,0,0.18), 0 0 1px rgba(209,209,209,0.1)',
        'card-active': '0 1px 2px rgba(0,0,0,0.08)',
        glow:          '0 0 12px rgba(201,169,110,0.06)',
        'glow-accent': '0 0 12px rgba(138,155,168,0.06)',
        'glow-success':'0 0 12px rgba(74,157,110,0.06)',
        'glow-error':  '0 0 12px rgba(185,74,74,0.06)',
        inception:     '0 4px 24px rgba(0,0,0,0.15), inset 0 0 12px rgba(0,0,0,0.06)',
        replicant:     '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'elevated':    '0 4px 16px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.06)',
        'elevated-lg': '0 12px 40px rgba(0,0,0,0.2)',
        'inner-glow':  'inset 0 1px 0 rgba(209,209,209,0.04)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':   'linear-gradient(135deg, var(--tw-gradient-from) 0%, transparent 50%, var(--tw-gradient-to) 100%)',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'dot-pattern':     'radial-gradient(circle, rgba(209,209,209,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-sm': '16px 16px',
        'dot-md': '24px 24px',
        'dot-lg': '32px 32px',
      },
      /* ── Animations — controlled, clinical ───────────────── */
      animation: {
        float:            'float 8s ease-in-out infinite',
        'float-slow':     'float 12s ease-in-out infinite',
        'float-delayed':  'float 8s ease-in-out 2s infinite',
        'pulse-slow':     'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-neon':     'pulseSubtle 4s ease-in-out infinite',
        gradient:         'gradient 10s ease infinite',
        'gradient-slow':  'gradient 20s ease infinite',
        'slide-up':       'slideUp 0.5s ease-out',
        'slide-down':     'slideDown 0.5s ease-out',
        'slide-left':     'slideLeft 0.4s ease-out',
        'slide-right':    'slideRight 0.4s ease-out',
        'fade-in':        'fadeIn 0.5s ease-out',
        'fade-in-up':     'fadeInUp 0.6s ease-out',
        'scale-in':       'scaleIn 0.3s ease-out',
        'scale-in-bounce':'scaleInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer:          'shimmer 2.5s linear infinite',
        'border-pulse':   'borderBreathe 4s ease-in-out infinite',
        'glow-pulse':     'glowBreathe 3s ease-in-out infinite',
        'spin-slow':      'spin 4s linear infinite',
        'bounce-gentle':  'bounceGentle 2.5s ease-in-out infinite',
        'width-expand':   'widthExpand 0.6s ease-out',
        'grain-shift':    'contourDrift 30s ease-in-out infinite',
        'neon-flicker':   'subtleBreathe 6s ease-in-out infinite',
        'digital-rain':   'digitalRain 2s linear infinite',
        'ring-rotate':    'ringRotate 60s linear infinite',
        'contour-drift':  'contourDrift 30s ease-in-out infinite',
      },
      keyframes: {
        float:          { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-16px)' } },
        gradient:       { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        slideUp:        { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown:      { '0%': { transform: 'translateY(-16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideLeft:      { '0%': { transform: 'translateX(16px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        slideRight:     { '0%': { transform: 'translateX(-16px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        fadeIn:         { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp:       { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:        { '0%': { transform: 'scale(0.97)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        scaleInBounce:  { '0%': { transform: 'scale(0.92)', opacity: '0' }, '50%': { transform: 'scale(1.01)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer:        { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        borderBreathe:  { '0%, 100%': { borderColor: 'rgba(209,209,209,0.08)' }, '50%': { borderColor: 'rgba(209,209,209,0.2)' } },
        glowBreathe:    { '0%, 100%': { boxShadow: '0 0 4px rgba(201,169,110,0.04)' }, '50%': { boxShadow: '0 0 12px rgba(201,169,110,0.08)' } },
        pulseSubtle:    { '0%, 100%': { opacity: '0.7' }, '50%': { opacity: '1' } },
        bounceGentle:   { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        widthExpand:    { '0%': { width: '0%', opacity: '0' }, '100%': { width: '100%', opacity: '1' } },
        contourDrift:   { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(1px, -1px)' } },
        subtleBreathe: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.92' },
        },
        digitalRain: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        ringRotate: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in':  'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth':     'cubic-bezier(0.22, 1, 0.36, 1)',
        'cinematic':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'dream':      'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'westworld':  'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
};
