import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const FilterChip = ({ label, active, onPress, icon }) => (
  <TouchableOpacity 
    style={[styles.chip, active && styles.activeChip]}
    onPress={onPress}
  >
    {icon && <Icon name={icon} size={16} color={active ? theme.colors.background : theme.colors.text.secondary} style={styles.chipIcon} />}
    <Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text>
  </TouchableOpacity>
);

const ListingsFilter = ({ activeFilters, onFilterChange }) => {
  const filters = {
    propertyType: ['All', 'Houses', 'Apartments', 'Villas'],
    sortBy: ['Revenue ↑', 'Revenue ↓', 'Rating', 'Occupancy'],
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.propertyType.map((filter) => (
          <FilterChip
            key={filter}
            label={filter}
            active={activeFilters.propertyType === filter}
            onPress={() => onFilterChange('propertyType', filter)}
            icon={filter === 'All' ? 'grid-outline' : 'home-outline'}
          />
        ))}
      </ScrollView>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.sortBy.map((filter) => (
          <FilterChip
            key={filter}
            label={filter}
            active={activeFilters.sortBy === filter}
            onPress={() => onFilterChange('sortBy', filter)}
            icon="arrow-down-outline"
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.circular,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
  },
  activeChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipIcon: {
    marginRight: theme.spacing.xs,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  activeChipText: {
    color: theme.colors.background,
    fontWeight: '600',
  },
});

export default ListingsFilter;
