import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define our theme colors
const darkTheme = {
  background: '#000000',
  surface: '#1A1A1A',
  card: '#0F0F0F',
  text: {
    primary: '#FFFFFF',
    secondary: '#BBBBBB',
  },
  primary: '#B69D74', // Gold color
  accent: '#3D89DE',
  error: '#CF6679',
  borderColor: 'rgba(182, 148, 76, 0.5)',
  tabBar: {
    background: '#000000',
    active: 'rgba(182, 148, 76, 0.8)',
    inactive: 'rgba(255, 255, 255, 0.5)',
  },
  channelTags: {
    airbnb: {
      text: '#FF5A5F',
      background: 'rgba(255, 90, 95, 0.2)',
    },
    vrbo: {
      text: '#3D91FF',
      background: 'rgba(61, 145, 255, 0.2)',
    }
  }
};

const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: {
    primary: '#121212',
    secondary: '#555555',
  },
  primary: '#B69D74', // Keep gold color for branding consistency
  accent: '#3D89DE',
  error: '#B00020',
  borderColor: 'rgba(182, 148, 76, 0.5)',
  tabBar: {
    background: '#FFFFFF',
    active: '#B69D74',
    inactive: 'rgba(0, 0, 0, 0.5)',
  },
  channelTags: {
    airbnb: {
      text: '#E4383E',
      background: 'rgba(255, 90, 95, 0.15)',
    },
    vrbo: {
      text: '#1C74E4',
      background: 'rgba(61, 145, 255, 0.15)',
    }
  }
};

// Create the context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        setIsDarkMode(savedTheme === 'light' ? false : true);
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Toggle theme function
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('themeMode', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Current theme based on mode
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 