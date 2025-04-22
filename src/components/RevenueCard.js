import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme as defaultTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';

const RevenueCard = ({ title, current, potential, market, marketColor = '#4B5563' }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.borderColor
    }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.secondary }]}>{title}</Text>
        <Icon name="cash-outline" size={16} color={theme.text.secondary} />
      </View>
      <View style={styles.valueRow}>
        <View style={styles.valueItem}>
          <Text style={[styles.value, { color: theme.text.primary }]}>${current}</Text>
          <Text style={[styles.label, { color: theme.text.secondary }]}>Current</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
        <View style={styles.valueItem}>
          <Text style={[styles.value, styles.potentialValue]}>${potential}</Text>
          <Text style={[styles.label, { color: theme.text.secondary }]}>Potential</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
        <View style={styles.valueItem}>
          <Text style={[styles.value, { color: marketColor }]}>${market}</Text>
          <Text style={[styles.label, { color: theme.text.secondary }]}>Market</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueItem: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  potentialValue: {
    color: '#15803D',
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: 8,
  },
});

export default RevenueCard;