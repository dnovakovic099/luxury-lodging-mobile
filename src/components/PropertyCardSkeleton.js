import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { theme } from '../theme';

const PropertyCardSkeleton = () => {
  return (
    <View style={styles.container}>
      <Skeleton width="100%" height={150} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Skeleton width="60%" height={20} style={styles.titleSkeleton} />
          <Skeleton width={60} height={24} style={styles.ratingSkeleton} />
        </View>
        <Skeleton width="40%" height={16} style={styles.locationSkeleton} />
        <View style={styles.statsRow}>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.stat}>
              <Skeleton width={60} height={16} style={styles.statSkeleton} />
              <Skeleton width={40} height={12} style={styles.labelSkeleton} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  titleSkeleton: {
    marginRight: theme.spacing.md,
  },
  locationSkeleton: {
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.card.border,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statSkeleton: {
    marginBottom: theme.spacing.xs,
  },
});

export default PropertyCardSkeleton;
