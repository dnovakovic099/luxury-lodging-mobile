import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { formatCurrency } from '../utils/formatters';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Define GOLD constant locally
const GOLD = {
  primary: '#B6944C',
  secondary: 'rgba(182, 148, 76, 0.7)',
  light: 'rgba(182, 148, 76, 0.15)',
};

const RevenueSummary = ({ data, style }) => { 
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
    <View style={[styles.container, style]}>
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet-outline" size={16} color={GOLD.primary} />
        </View>
        <Text style={styles.label}>TOTAL</Text>
        <Text style={styles.value}>{formatValue(totalRevenue)}</Text>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={16} color={GOLD.primary} />
        </View>
        <Text style={styles.label}>FUTURE</Text>
        <Text style={styles.value}>{formatValue(futureRevenue)}</Text>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <Ionicons name="people-outline" size={16} color={GOLD.primary} />
        </View>
        <Text style={styles.label}>SHARING</Text>
        <Text style={styles.value}>{formatValue(sharingRevenue)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 0,
    backgroundColor: '#0E0E0E', // Even darker for contrast
    borderRadius: 0,
    paddingVertical: 16, // Increased vertical padding
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
    height: 64, // Slightly increased height
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    paddingVertical: 2, // Added padding to items
  },
  iconContainer: {
    marginBottom: 6, // Increased spacing after icon
    marginTop: 1, // Small top margin
  },
  label: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: GOLD.primary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginTop: 2, // Increased spacing between label and value
    marginBottom: 1, // Small bottom margin
  },
  separator: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

export default RevenueSummary;