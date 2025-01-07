import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { theme } from '../theme';

const BookingList = ({ bookings }) => {
  const renderBooking = ({ item, index }) => (
    <View style={styles.bookingContainer}>
      <View style={styles.timeline}>
        <View style={styles.timelineDot} />
        {index !== bookings.length - 1 && <View style={styles.timelineLine} />}
      </View>
      
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.guestName}>{item.guestName}</Text>
            <Text style={styles.bookingDates}>
              {new Date(item.checkIn).toLocaleDateString()} - {new Date(item.checkOut).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amount}>${item.amount}</Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Length of Stay</Text>
            <Text style={styles.detailValue}>
              {calculateNights(item.checkIn, item.checkOut)} nights
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Average/Night</Text>
            <Text style={styles.detailValue}>
              ${Math.round(item.amount / calculateNights(item.checkIn, item.checkOut))}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Bookings</Text>
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  bookingContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.lg,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.card.border,
    marginTop: theme.spacing.sm,
  },
  bookingCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.small,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  guestName: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  bookingDates: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...theme.typography.small,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  amount: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.card.border,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
});

export default BookingList;