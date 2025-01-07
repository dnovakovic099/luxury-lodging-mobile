import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Platform,
  Animated,
  Dimensions 
} from 'react-native';

const COLORS = {
  gold: '#B8860B',
  goldLight: 'rgba(184,134,11,0.15)',
  cardBg: '#1C1C1E',
  surface: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  border: 'rgba(44,44,46,0.5)',
};

const getRandomAccentColor = (listing) => {
  const colors = [
    { bg: 'rgba(182,158,243,0.1)', text: '#B69EF3', gradient: 'rgba(182,158,243,0.05)' },
    { bg: 'rgba(158,243,182,0.1)', text: '#9EF3B6', gradient: 'rgba(158,243,182,0.05)' },
    { bg: 'rgba(243,182,158,0.1)', text: '#F3B69E', gradient: 'rgba(243,182,158,0.05)' },
    { bg: 'rgba(158,200,243,0.1)', text: '#9EC8F3', gradient: 'rgba(158,200,243,0.05)' },
    { bg: 'rgba(243,158,229,0.1)', text: '#F39EE5', gradient: 'rgba(243,158,229,0.05)' }
  ];
  const index = listing.length % colors.length;
  return colors[index];
};

const ActionBadge = ({ count }) => (
  <View style={styles.actionBadge}>
    <Text style={styles.actionBadgeText}>{count}</Text>
  </View>
);

const ActionCard = ({ date, listingName, action }) => {
  const accentColor = getRandomAccentColor(listingName);
  
  return (
    <View style={[styles.actionCard, { backgroundColor: accentColor.gradient }]}>
      <View style={styles.actionContent}>
        <View style={styles.actionHeader}>
          <View style={[styles.listingBadge, { backgroundColor: accentColor.bg }]}>
            <Text style={[styles.listingName, { color: accentColor.text }]}>
              {listingName}
            </Text>
          </View>
          <Text style={styles.timeText}>{date}</Text>
        </View>
        <View style={styles.actionTextContainer}>
          <View style={[styles.actionIndicator, { backgroundColor: accentColor.text }]} />
          <Text style={styles.actionText}>{action}</Text>
        </View>
      </View>
    </View>
  );
};

const ListingActions = ({ actions }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32; // Account for container margins

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleIndexChange = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Property Updates</Text>
          <ActionBadge count={actions.length} />
        </View>
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
          activeOpacity={0.7}
        >
          <Text style={styles.expandText}>
            {isExpanded ? 'Less' : 'More'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {!isExpanded ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleIndexChange}
            scrollEventThrottle={16}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {actions.map((action, index) => (
              <View key={index} style={{ width: cardWidth }}>
                <ActionCard
                  date={formatDate(action.date)}
                  listingName={action.listingName}
                  action={action.action}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {actions.map((action, index) => (
              <ActionCard
                key={index}
                date={formatDate(action.date)}
                listingName={action.listingName}
                action={action.action}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 0.3,
  },
  actionBadge: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  actionBadgeText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  expandText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
  },
  horizontalScrollContent: {
    paddingVertical: 1, // Prevent shadow clipping
  },
  actionCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionContent: {
    padding: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listingName: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionTextContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIndicator: {
    width: 2,
    height: '100%',
    borderRadius: 1,
  },
  actionText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: 350,
  }
});

export default ListingActions;