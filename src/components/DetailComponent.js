import React from 'react';
import { View, Text, Platform } from 'react-native';
import { TrendingUp, Activity, ArrowUp } from 'lucide-react-native';
import { theme } from '../theme';

const PropertyInfo = ({ value, label }) => {
  const score = parseInt(value);
  
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreTopRow}>
        <Text style={styles.miniLabel}>{label.toUpperCase()}</Text>
        <View style={styles.miniTrend}>
          <ArrowUp size={10} color={theme.colors.success} />
          <Text style={styles.miniTrendText}>5%</Text>
        </View>
      </View>

      <View style={styles.scoreMainRow}>
        <Text style={styles.mainScore}>{score}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${score}%` }]} />
        </View>
      </View>
    </View>
  );
};

const StatItem = ({ value, label, trend, large = false }) => (
  <View style={[styles.metricCard, large && styles.metricCardLarge]}>
    <Text style={styles.miniLabel}>{label.toUpperCase()}</Text>
    
    <View style={styles.metricBottom}>
      <Text style={[styles.metricValue, large && styles.metricValueLarge]}>
        {value}
      </Text>
      {trend && (
        <View style={styles.trendBadge}>
          <ArrowUp size={10} color={theme.colors.success} />
          <Text style={styles.trendValue}>{trend}%</Text>
        </View>
      )}
    </View>
  </View>
);

const styles = {
  scoreCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
  },
  scoreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  miniTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${theme.colors.success}08`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniTrendText: {
    fontSize: 10,
    color: theme.colors.success,
    fontWeight: '600',
  },
  scoreMainRow: {
    gap: 8,
  },
  mainScore: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  progressBar: {
    height: 2,
    backgroundColor: `${theme.colors.primary}08`,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  metricCardLarge: {
    flex: 2,
  },
  metricBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  metricValueLarge: {
    fontSize: 24,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${theme.colors.success}08`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.success,
  }
};

export { PropertyInfo, StatItem };