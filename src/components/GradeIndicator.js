import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import AnimatedGradeBar from './AnimatedGradeBar';

const GradeIndicator = ({ grade, label, icon: Icon, details, stats, aiRecommendation }) => {
  const getGradeColor = (value) => {
    if (value >= 80) return '#22C55E';
    if (value >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const gradeColor = getGradeColor(grade);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelContainer}>
          <Icon size={16} color={theme.colors.text.secondary} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}15` }]}>
          <Text style={[styles.gradeValue, { color: gradeColor }]}>{grade}%</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {stats && (
          <Text style={styles.stats}>{stats}</Text>
        )}

        <View style={styles.barWrapper}>
          <AnimatedGradeBar grade={grade} color={gradeColor} />
        </View>

        {details && (
          <Text style={styles.details}>{details}</Text>
        )}
        
        {aiRecommendation && (
          <Text style={styles.aiRecommendation}>{aiRecommendation}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  gradeValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    marginLeft: 24,
    gap: 8,
  },
  stats: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  barWrapper: {
    marginRight: 36, // Space for the percentage
  },
  details: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  aiRecommendation: {
    fontSize: 12,
    color: theme.colors.primary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default GradeIndicator;