import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme as defaultTheme } from '../theme';
import AnimatedGradeBar from './AnimatedGradeBar';
import { useTheme } from '../context/ThemeContext';

const GradeIndicator = ({ grade, label, icon: Icon, details, stats, aiRecommendation }) => {
  const { theme } = useTheme();
  
  const getGradeColor = (value) => {
    if (value >= 80) return '#22C55E';
    if (value >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const gradeColor = getGradeColor(grade);

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.surface,
      borderColor: theme.borderColor
    }]}>
      <View style={styles.headerRow}>
        <View style={styles.labelContainer}>
          <Icon size={16} color={theme.text.secondary} />
          <Text style={[styles.label, { color: theme.text.primary }]}>{label}</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}15` }]}>
          <Text style={[styles.gradeValue, { color: gradeColor }]}>{grade}%</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {stats && (
          <Text style={[styles.stats, { color: theme.text.secondary }]}>{stats}</Text>
        )}

        <View style={styles.barWrapper}>
          <AnimatedGradeBar grade={grade} color={gradeColor} />
        </View>

        {details && (
          <Text style={[styles.details, { color: theme.text.secondary }]}>{details}</Text>
        )}
        
        {aiRecommendation && (
          <Text style={[styles.aiRecommendation, { color: theme.primary }]}>{aiRecommendation}</Text>
        )}
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
  },
  barWrapper: {
    marginRight: 36, // Space for the percentage
  },
  details: {
    fontSize: 12,
    lineHeight: 16,
  },
  aiRecommendation: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default GradeIndicator;


