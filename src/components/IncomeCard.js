import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

const IncomeCard = ({ property, onPress }) => {
  const trendColor = property.income.trend >= 0 ? theme.colors.success : theme.colors.error;
  const trendIcon = property.income.trend >= 0 ? '↑' : '↓';

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <View style={[styles.statusBadge, 
              { backgroundColor: property.status === 'active' ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)' }]}>
              <View style={[styles.statusDot, { 
                backgroundColor: property.status === 'active' ? theme.colors.status.active : theme.colors.status.inactive 
              }]} />
              <Text style={[styles.statusText, { 
                color: property.status === 'active' ? theme.colors.status.active : theme.colors.status.inactive 
              }]}>
                {property.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.incomeSection}>
            <Text style={styles.label}>Monthly Revenue</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount}>
                ${property.income.monthly.toLocaleString()}
              </Text>
              <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {trendIcon} {Math.abs(property.income.trend)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Occupancy</Text>
              <Text style={styles.statValue}>{property.occupancy.rate}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Bookings</Text>
              <Text style={styles.statValue}>{property.bookings.length}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    overflow: 'hidden',
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyName: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.xl,
    marginLeft: theme.spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '600',
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  incomeSection: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  trendBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.xl,
  },
  trendText: {
    ...theme.typography.small,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.card.border,
    marginVertical: theme.spacing.md,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
});

export default IncomeCard;