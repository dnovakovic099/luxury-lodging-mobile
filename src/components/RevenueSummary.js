import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { formatCurrency } from '../utils/formatters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

// Define GOLD constant locally
const GOLD = {
  primary: '#B6944C',
  secondary: 'rgba(182, 148, 76, 0.7)',
  light: 'rgba(182, 148, 76, 0.15)',
};

const RevenueSummary = ({ data, style }) => { 
  const { theme, isDarkMode } = useTheme();
  
  // Safely destructure values with fallbacks
  const { 
    totalRevenue = 0,
    futureRevenue = 0, 
    sharingRevenue = 0
  } = data || {};

  // Ensure values are properly formatted
  const formatValue = (value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue);
  };

  return (
    <View style={[
      styles.container, 
      {
        backgroundColor: theme.surface,
        borderBottomColor: theme.borderColor
      },
      style
    ]}>
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet-outline" size={16} color={theme.primary} />
        </View>
        <Text style={[styles.label, { color: theme.text.secondary }]}>TOTAL</Text>
        <Text style={[styles.value, { color: theme.primary }]}>{formatValue(totalRevenue)}</Text>
      </View>
      
      <View style={[styles.separator, { backgroundColor: theme.borderColor }]} />
      
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} />
        </View>
        <Text style={[styles.label, { color: theme.text.secondary }]}>FUTURE</Text>
        <Text style={[styles.value, { color: theme.primary }]}>{formatValue(futureRevenue)}</Text>
      </View>
      
      <View style={[styles.separator, { backgroundColor: theme.borderColor }]} />
      
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <Ionicons name="people-outline" size={16} color={theme.primary} />
        </View>
        <Text style={[styles.label, { color: theme.text.secondary }]}>SHARING</Text>
        <Text style={[styles.value, { color: theme.primary }]}>{formatValue(sharingRevenue)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 0,
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
    height: 64,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconContainer: {
    marginBottom: 6,
    marginTop: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginTop: 2,
    marginBottom: 1,
  },
  separator: {
    width: 1,
    height: '70%',
  },
});

export default RevenueSummary;