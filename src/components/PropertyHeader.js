import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const PropertyHeader = ({ property }) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: property.image }} style={styles.image} />
      
      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text style={styles.title}>{property.name}</Text>
          <View style={styles.locationContainer}>
            <Icon name="location-outline" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.location}>{property.location}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="star" size={18} color={theme.colors.primary} />
            <Text style={styles.statValue}>{property.averageReviewRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Icon name="calendar" size={18} color={theme.colors.primary} />
            <Text style={styles.statValue}>96%</Text>
            <Text style={styles.statLabel}>Occupancy</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Icon name="trending-up" size={18} color={theme.colors.primary} />
            <Text style={styles.statValue}>${(3500000 / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>Monthly</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  image: {
    width: width,
    height: 250,
    backgroundColor: theme.colors.card.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  mainInfo: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginVertical: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.card.border,
  },
});

export default PropertyHeader;
