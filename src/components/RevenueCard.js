import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const RevenueCard = ({ title, current, potential, market, marketColor = '#4B5563' }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Icon name="cash-outline" size={16} color={theme.colors.text.secondary} />
    </View>
    <View style={styles.valueRow}>
      <View style={styles.valueItem}>
        <Text style={styles.value}>${current}</Text>
        <Text style={styles.label}>Current</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.valueItem}>
        <Text style={[styles.value, styles.potentialValue]}>${potential}</Text>
        <Text style={styles.label}>Potential</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.valueItem}>
        <Text style={[styles.value, { color: marketColor }]}>${market}</Text>
        <Text style={styles.label}>Market</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
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
    color: theme.colors.text.secondary,
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
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  potentialValue: {
    color: '#15803D',
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.card.border,
    marginHorizontal: 8,
  },
});

export default RevenueCard;