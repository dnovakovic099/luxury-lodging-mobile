// src/theme/index.js
export const theme = {
  colors: {
    primary: '#B6944C', // New gold color
    secondary: '#8B7355', // Darker shade of primary
    background: '#000000',
    surface: '#121212',
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.7)',
      accent: '#B6944C',
    },
    status: {
      success: '#00D97E',
      error: '#FF6B6B',
      warning: '#B6944C',
      info: '#6E8DEF',
      active: '#B6944C',
      inactive: 'rgba(255,255,255,0.3)',
    },
    card: {
      background: '#1E1E1E',
      border: 'rgba(182,148,76,0.1)', // Using primary color with opacity
      highlight: 'rgba(182,148,76,0.05)',
    },
    chart: {
      line: '#B6944C',
      grid: 'rgba(255,255,255,0.05)',
      labels: 'rgba(255,255,255,0.5)',
    },
    success: 'darkgreen'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
  },
  typography: {
    h1: {
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    body: {
      fontSize: 16,
      letterSpacing: 0.5,
    },
    caption: {
      fontSize: 14,
      letterSpacing: 0.4,
    },
    small: {
      fontSize: 12,
      letterSpacing: 0.3,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    }
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};