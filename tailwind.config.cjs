/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/db_agent/**/*.{js,ts,jsx,tsx}',
    './src/lib/db_agent/**/*.{js,ts,jsx,tsx}',
    './src/app/db_agent/**/*.{js,ts,jsx,tsx,css}',
    './app/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace'],
      },
      colors: {
        // LiquidQube Dark Theme Colors
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#ffde59', // Primary accent (LiquidQube yellow)
          600: '#f0d04c', // Hover state
          700: '#d69e2e',
          800: '#b7791f',
          900: '#975a16',
        },
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#3dd8ca', // Secondary accent (LiquidQube teal)
          600: '#14b8a6',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        dark: {
          50: '#6b7280',
          100: '#4b5563',
          200: '#374151',
          300: '#333333', // Border color
          400: '#222222', // Tertiary background
          500: '#1a1a1a', // Secondary background
          600: '#171717',
          700: '#141414',
          800: '#111111',
          900: '#0f0f0f', // Primary background
        },
        accent: {
          danger: '#ff6b6b',
          warning: '#f59e0b',
          success: '#10b981',
          info: '#64ffda',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b0b0b0',
          tertiary: '#888888',
          muted: '#666666',
        },
        chart: {
          primary: '#ffde59',
          secondary: '#3dd8ca',
          tertiary: '#64ffda',
          quaternary: '#ff9e80',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          hover: '#666666',
        },
        sql: {
          keyword: '#f40420',
          function: '#64ffda',
          string: '#ffecb3',
          number: '#ff9e80',
          operator: '#b2ff59',
          comment: '#78909c',
        }
      },
      backgroundColor: {
        'primary': 'var(--bg-primary)',
        'secondary': 'var(--bg-secondary)',
        'tertiary': 'var(--bg-tertiary)',
      },
      textColor: {
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'accent': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
      },
      borderColor: {
        'default': 'var(--border-color)',
        'accent': 'var(--accent-primary)',
      },
      boxShadow: {
        'card': '0 2px 5px 0 rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px var(--accent-glow)',
        'glow-secondary': '0 0 20px rgba(61, 216, 202, 0.3)',
        'dark-sm': 'var(--shadow-sm)',
        'dark-md': 'var(--shadow-md)',
        'dark-lg': 'var(--shadow-lg)',
        'dark-xl': 'var(--shadow-xl)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-accent': 'pulseAccent 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'listening-pulse': 'listeningPulse 1.5s ease-in-out infinite',
        'processing-pulse': 'processingPulse 1.5s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseAccent: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        listeningPulse: {
          '0%': { opacity: '0.6' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.6' },
        },
        processingPulse: {
          '0%': { boxShadow: '0 0 10px rgba(61, 216, 202, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(61, 216, 202, 0.7)' },
          '100%': { boxShadow: '0 0 10px rgba(61, 216, 202, 0.4)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px var(--accent-primary)' },
          '100%': { boxShadow: '0 0 20px var(--accent-glow)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        'gradient-accent': 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      fontSize: {
        'xxs': '0.625rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backdropBlur: {
        'xs': '2px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      blur: {
        'xs': '2px',
      },
      brightness: {
        '25': '.25',
        '175': '1.75',
      },
    },
  },
  plugins: [
    // Custom plugin for dark theme utilities
    function({ addUtilities, addComponents, theme }) {
      const darkThemeUtilities = {
        '.glass': {
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 222, 89, 0.1)',
        },
        '.hover-lift': {
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-xl)',
          },
        },
        '.nav-active': {
          backgroundColor: 'transparent',
          color: 'var(--accent-primary)',
          borderLeft: '3px solid var(--accent-primary)',
        },
        '.btn-primary': {
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
          border: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#f0d04c',
            transform: 'translateY(-1px)',
            boxShadow: 'var(--shadow-md)',
          },
        },
        '.btn-secondary': {
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'var(--accent-primary)',
          },
        },
        '.card': {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          boxShadow: 'var(--shadow-md)',
        },
        '.card-hover': {
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 0 20px var(--accent-glow)',
          },
        },
        '.metric-card': {
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 0 20px var(--accent-glow)',
          },
        },
        '.chart-container': {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        },
        '.input-dark': {
          backgroundColor: 'var(--input-bg)',
          borderColor: 'var(--input-border)',
          color: 'var(--text-primary)',
          '&:focus': {
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 0 0 1px var(--accent-primary)',
          },
        },
        '.table-dark': {
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          '& th': {
            backgroundColor: 'var(--table-header-bg)',
            color: 'var(--accent-primary)',
            borderBottom: '1px solid var(--accent-primary)',
            fontWeight: '500',
          },
          '& td': {
            borderBottom: '1px solid var(--table-border)',
          },
          '& tbody tr:nth-child(even)': {
            backgroundColor: 'var(--table-row-alt)',
          },
          '& tbody tr:hover': {
            backgroundColor: 'rgba(255, 222, 89, 0.05)',
          },
        },
        '.scrollbar-dark': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--accent-primary) var(--bg-primary)',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--bg-primary)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--accent-primary)',
            borderRadius: '4px',
            border: '2px solid var(--bg-primary)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#f0d04c',
          },
        },
        '.text-glow': {
          textShadow: '0 0 10px var(--accent-glow)',
        },
        '.border-glow': {
          boxShadow: '0 0 0 1px var(--accent-primary), 0 0 10px var(--accent-glow)',
        },
        '.pulse-glow': {
          animation: 'pulse-glow 2s ease-in-out infinite alternate',
          '@keyframes pulse-glow': {
            '0%': { boxShadow: '0 0 5px var(--accent-primary)' },
            '100%': { boxShadow: '0 0 20px var(--accent-glow)' },
          },
        },
      };
      
      addUtilities(darkThemeUtilities);

      // Add component styles
      const darkThemeComponents = {
        '.sql-syntax-keyword': {
          color: 'var(--sql-keyword)',
          fontWeight: 'bold',
        },
        '.sql-syntax-function': {
          color: 'var(--sql-function)',
        },
        '.sql-syntax-string': {
          color: 'var(--sql-string)',
        },
        '.sql-syntax-number': {
          color: 'var(--sql-number)',
        },
        '.sql-syntax-operator': {
          color: 'var(--sql-operator)',
        },
        '.sql-syntax-comment': {
          color: 'var(--sql-comment)',
        },
      };

      addComponents(darkThemeComponents);
    },
  ],
}