import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatCard = ({ title, value, trend, prefix = '', suffix = '' }) => {
  const trendColor = trend >= 0 ? '#2ecc71' : '#e74c3c';
  const trendIcon = trend >= 0 ? '↑' : '↓';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{prefix}{value}{suffix}</Text>
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trend, { color: trendColor }]}>
            {trendIcon} {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  trendContainer: {
    marginTop: 8,
  },
  trend: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StatCard;
