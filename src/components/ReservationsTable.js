import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const ReservationCard = ({ reservation, onPress }) => {
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const nights = Math.ceil((new Date(reservation.departureDate) - new Date(reservation.arrivalDate)) / (1000 * 60 * 60 * 24));

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'airbnb':
        return '#F43F5E';
      case 'vrbo':
        return '#22C55E';
      case 'booking.com':
        return '#0096FF';
      case 'direct':
        return '#EAB308';
      default:
        return theme.colors.text.secondary;
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'airbnb':
        return 'home-outline';
      case 'vrbo':
        return 'business-outline';
      case 'booking.com':
        return 'bed-outline';
      case 'direct':
        return 'person-outline';
      default:
        return 'globe-outline';
    }
  };

  const platformName = reservation.channelName.includes('airbnb') ? 'Airbnb' : reservation.channelName;
  const platformColor = getPlatformColor(reservation.channelName);

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(reservation)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.guestContainer}>
            <Text style={styles.guestName}>{reservation.guestName}</Text>
            <View style={styles.platformContainer}>
              <Icon name={getPlatformIcon(reservation.channelName)} 
                    size={16} 
                    color={platformColor} 
              />
              <Text style={[styles.platformText, { color: platformColor }]}>
                {platformName}
              </Text>
            </View>
            <View style={styles.propertyContainer}>
              <Icon name="home-outline" size={14} color={theme.colors.text.secondary} />
              <Text style={styles.propertyName} numberOfLines={1}>
                {reservation.listingName}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>${reservation.totalPrice.toLocaleString()}</Text>
        </View>

        <View style={styles.cardMiddle}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Icon name="calendar-outline" size={16} color={theme.colors.primary} />
              <View>
                <Text style={styles.detailLabel}>Check-in</Text>
                <Text style={styles.detailValue}>{formatDate(reservation.arrivalDate)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Icon name="calendar-outline" size={16} color={theme.colors.primary} />
              <View>
                <Text style={styles.detailLabel}>Check-out</Text>
                <Text style={styles.detailValue}>{formatDate(reservation.departureDate)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Icon name="moon-outline" size={16} color={theme.colors.primary} />
              <View>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{nights} nights</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Icon name="people-outline" size={16} color={theme.colors.primary} />
              <View>
                <Text style={styles.detailLabel}>Guests</Text>
                <Text style={styles.detailValue}>{reservation.numberOfGuests}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const ReservationsTable = ({ 
  reservations, 
  onRowPress
}) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ReservationCard 
            reservation={item}
            onPress={onRowPress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  listContent: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  guestContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  platformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  platformText: {
    ...theme.typography.caption,
    fontWeight: '500',
  },
  guestName: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  propertyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyName: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  amount: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  cardMiddle: {
    gap: theme.spacing.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '48%',
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  separator: {
    height: theme.spacing.md,
  },
});

export default ReservationsTable;