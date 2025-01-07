import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from './Skeleton';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STAT_CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 3) / 2;

const StatsCardSkeleton = () => (
  <View style={styles.container}>
    <Skeleton width={32} height={32} style={styles.iconSkeleton} />
    <Skeleton width={60} height={24} style={styles.valueSkeleton} />
    <Skeleton width={80} height={16} style={styles.labelSkeleton} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: STAT_CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  iconSkeleton: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  valueSkeleton: {
    marginBottom: theme.spacing.xs,
  },
});

export default StatsCardSkeleton;
