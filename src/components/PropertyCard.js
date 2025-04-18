import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';
import { moneyFormatter } from '../utils/revenueUtils';

const PropertyCard = ({ property, revenue, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const formatRevenue = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  return (
    <AnimatedPressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Image 
        source={{ uri: property.listingImages[0]?.url || 'https://via.placeholder.com/300' }}
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.overlay}>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{property.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={theme.colors.primary} />
            <Text style={styles.rating}>4.8</Text>
          </View>
        </View>

        <View style={styles.revenueContainer}>
          <Text style={styles.revenueValue}>
            {moneyFormatter(revenue)}
          </Text>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
        </View>
      </View>
    </AnimatedPressable>
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
  image: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.card.background,
  },
  overlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.status.success,
    marginRight: 4,
  },
  statusText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...theme.typography.h3,
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  rating: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  location: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  revenueContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.card.border,
  },
  revenueValue: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  revenueLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});

export default PropertyCard;