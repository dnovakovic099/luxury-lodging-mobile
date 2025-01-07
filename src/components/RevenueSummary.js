import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 3) / 2;

const SummaryCard = ({ title, value, change, icon, delay = 0, accent = false }) => {
  const animationValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(animationValue, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, []);

  const cardScale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const cardTranslateY = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <Animated.View style={[
      styles.card,
      accent && styles.accentCard,
      {
        transform: [
          { scale: cardScale },
          { translateY: cardTranslateY },
        ],
        opacity: animationValue,
      }
    ]}>
      <View style={styles.cardContent}>
        {/* Top section with icon */}
        <View style={[styles.cardIconContainer, accent && styles.accentIcon]}>
          <Ionicons 
            name={icon} 
            size={18} 
            color={accent ? theme.colors.background : theme.colors.primary} 
          />
        </View>

        {/* Middle section with title and value */}
        <View style={styles.cardMiddle}>
          <Text style={[styles.cardTitle, accent && styles.accentTitle]}>
            {title}
          </Text>
          <Text style={[styles.cardValue, accent && styles.accentText]}>
            {value}
          </Text>
        </View>

        {/* Bottom section with change badge */}
        {change !== undefined && (
          <View style={styles.cardBottom}>
            <View style={[
              styles.changeBadge,
              { 
                backgroundColor: change >= 0 
                  ? 'rgba(0,217,126,0.1)' 
                  : 'rgba(255,107,107,0.1)',
                borderColor: change >= 0 
                  ? 'rgba(0,217,126,0.2)' 
                  : 'rgba(255,107,107,0.2)',
              }
            ]}>
              <Text style={[
                styles.changeText,
                { color: change >= 0 ? theme.colors.status.success : theme.colors.status.error }
              ]}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={[styles.cardGlow, accent && styles.accentGlow]} />
    </Animated.View>
  );
};

const RevenueSummary = ({ data, loading }) => {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <SummaryCard
          title="2024 Revenue"
          value={`$${Math.round(data.grossRevenue).toLocaleString()}`}
          change={data.revenueChange}
          icon="trending-up-outline"
          delay={0}
        />
        <SummaryCard
          title="Average Rating"
          value={data.averageRating.toFixed(1)}
          icon="star-outline"
          delay={100}
        />
        <SummaryCard
          title="Total Expenses"
          value={`$${data.totalExpenses.toLocaleString()}`}
          change={data.expensesChange}
          icon="wallet-outline"
          delay={200}
        />
        <SummaryCard
          title="Revenue Sharing"
          value={`$${data.revenueSharing.amount.toLocaleString()}`}
          change={data.revenueSharing.change}
          icon="gift-outline"
          delay={300}
          accent={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: 160, // Increased height to accommodate all content
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.medium,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.md,
    position: 'relative',
    zIndex: 2,
    justifyContent: 'space-between', // Ensures even spacing between elements
  },
  accentCard: {
    backgroundColor: 'rgba(182, 148, 76, 0.12)',
    borderColor: 'rgba(182, 148, 76, 0.2)',
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    opacity: 0.05,
    zIndex: 1,
  },
  accentGlow: {
    backgroundColor: theme.colors.primary,
    opacity: 0.15,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentIcon: {
    backgroundColor: theme.colors.primary,
  },
  cardMiddle: {
    marginVertical: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  accentTitle: {
    color: 'rgba(182, 148, 76, 0.7)',
  },
  cardValue: {
    ...theme.typography.h2,
    fontSize: 20,
    color: theme.colors.text.primary,
  },
  accentText: {
    color: theme.colors.primary,
  },
  cardBottom: {
    alignItems: 'flex-start',
  },
  changeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  changeText: {
    ...theme.typography.small,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default RevenueSummary;