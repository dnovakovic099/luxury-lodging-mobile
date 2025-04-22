import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';
import { format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return '$0';
  }
  
  // Ensure value is a number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '$0';
  }
  
  // Format with 0 decimal places for compact display
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch (e) {
    return 'Invalid date';
  }
};

const ReservationCard = ({ item }) => {
  const { theme, isDarkMode } = useTheme();
  
  // Safely access properties with defaults
  const propertyName = item?.listingName || item?.property?.name || item?.listing?.name || 'Unknown Property';
  const guestName = item?.guest?.name || item?.guestName || 'Unknown Guest';
  
  // Handle channel display with custom formatting
  const rawChannelName = item?.channelName || item?.channel || 'Direct';
  let channelType = 'default';
  let channelText = 'Luxury Lodging';
  let channelColor = theme.primary; // Default to theme primary
  let channelBgColor = 'rgba(0, 0, 0, 0.2)'; // Default background
  
  const channelLower = (rawChannelName || '').toLowerCase();
  if (channelLower.includes('airbnb')) {
    channelType = 'airbnb';
    channelText = 'Airbnb';
    channelColor = theme.channelTags.airbnb.text;
    channelBgColor = theme.channelTags.airbnb.background;
  } else if (channelLower.includes('vrbo') || channelLower.includes('homeaway')) {
    channelType = 'vrbo';
    channelText = 'Vrbo';
    channelColor = theme.channelTags.vrbo.text;
    channelBgColor = theme.channelTags.vrbo.background;
  }
  
  // Extract financial data
  const financialsObj = item?.financials || item?.financial || item;
  const ownerPayout = parseFloat(financialsObj?.ownerPayout || 
                     item?.ownerPayout || 
                     item?.hostPayout || 
                     item?.airbnbExpectedPayoutAmount || 
                     financialsObj?.hostPayout ||
                     financialsObj?.airbnbExpectedPayoutAmount ||
                     item?.financialData?.ownerPayout ||
                     item?.financialData?.hostPayout ||
                     0);
  
  // Format dates
  const checkInDate = item?.checkIn || item?.arrivalDate || null;
  const checkOutDate = item?.checkOut || item?.departureDate || null;
  
  const formattedCheckIn = formatDate(checkInDate);
  const formattedCheckOut = formatDate(checkOutDate);
  
  // Generate a unique color for the property (for visual distinction)
  const getPropertyColor = (name) => {
    // Simple hash function to generate a consistent color for each property name
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 65%)`;
  };
  
  const propertyColor = getPropertyColor(propertyName);
  
  return (
    <View style={[styles.card, { 
      backgroundColor: isDarkMode ? 'rgba(25, 25, 25, 0.9)' : '#FFFFFF',
      borderColor: isDarkMode ? 'rgba(60, 60, 60, 0.2)' : 'rgba(0, 0, 0, 0.1)'
    }]}>
      {/* Property name and channel tag */}
      <View style={styles.cardHeader}>
        <View style={styles.propertyContainer}>
          <View style={[styles.propertyIndicator, { backgroundColor: propertyColor }]} />
          <Text style={[styles.propertyName, { color: theme.text.primary }]} numberOfLines={1}>
            {propertyName}
          </Text>
        </View>
        <View style={[styles.channelTag, { backgroundColor: channelBgColor }]}>
          <Text style={[styles.channelText, { color: channelColor }]}>{channelText}</Text>
        </View>
      </View>
      
      {/* Guest name */}
      <Text style={[styles.guestName, { color: theme.text.secondary }]} numberOfLines={1}>
        <Icon name="person-outline" size={12} color={isDarkMode ? '#999' : '#666'} /> {guestName}
      </Text>
      
      {/* Stay details and payout */}
      <View style={styles.stayDetails}>
        <View style={styles.dateSection}>
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: isDarkMode ? '#777777' : '#555555' }]}>CHECK-IN</Text>
            <Text style={[styles.dateValue, { color: isDarkMode ? '#DDDDDD' : '#333333' }]}>{formattedCheckIn}</Text>
          </View>
          
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: isDarkMode ? '#777777' : '#555555' }]}>CHECK-OUT</Text>
            <Text style={[styles.dateValue, { color: isDarkMode ? '#DDDDDD' : '#333333' }]}>{formattedCheckOut}</Text>
          </View>
        </View>
        
        <View style={styles.payoutSection}>
          <Text style={[styles.payoutLabel, { color: isDarkMode ? '#777777' : '#555555' }]}>PAYOUT</Text>
          <Text style={styles.payoutValue}>{formatCurrency(ownerPayout)}</Text>
        </View>
      </View>
    </View>
  );
};

const UpcomingReservations = ({ reservations = [], loading = false }) => {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  // We don't need as much filtering since the data should already be filtered
  // in the AuthContext, but we'll still do a basic validation
  const displayReservations = React.useMemo(() => {
    if (!reservations || !Array.isArray(reservations) || reservations.length === 0) {
      return [];
    }
        
    // Basic validation - just ensure the reservations have the data we need
    const validReservations = reservations.filter(res => {
      if (!res) return false;
      // Check if data is valid - ensure it has a valid ID (it will be the ID from the channel, not our internal ID)
      const hasValidId = res.id || res.reservationId || res.airbnbListingId || res.confirmationCode;
      
      if (!hasValidId) {
        // Remove debugging console log
        return null;
      }
      return true;
    });
    
    return validReservations;
  }, [reservations]);
  
  const handleSeeAll = () => {
    navigation.navigate('Reservations');
  };
  
  if (loading) {
    return (
      <View style={styles.containerOuter}>
        <View style={[styles.container, { backgroundColor: '#FFFFFF', borderColor: '#E5E0D5', borderWidth: 1 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Upcoming Reservations</Text>
            <TouchableOpacity onPress={handleSeeAll}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>Loading reservations...</Text>
          </View>
        </View>
      </View>
    );
  }
  
  if (displayReservations.length === 0) {
    return (
      <View style={styles.containerOuter}>
        <View style={[styles.container, { backgroundColor: '#FFFFFF', borderColor: '#E5E0D5', borderWidth: 1 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Upcoming Reservations</Text>
            <TouchableOpacity onPress={handleSeeAll}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <Icon name="calendar-outline" size={28} color={theme.primary} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>No upcoming reservations</Text>
            <Text style={[styles.emptySubtext, { color: isDarkMode ? '#777777' : '#999999' }]}>Your future bookings will appear here</Text>
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.containerOuter}>
      <View style={[styles.container, { backgroundColor: '#FFFFFF', borderColor: '#E5E0D5', borderWidth: 1 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text.primary }]}>Upcoming Reservations</Text>
          <TouchableOpacity onPress={handleSeeAll}>
            <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {displayReservations.map((item, index) => {
          return (
            <React.Fragment key={item?.id?.toString() || `reservation-${index}`}>
              {index > 0 && <View style={styles.separator} />}
              <ReservationCard item={item} />
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerOuter: {
    paddingHorizontal: 16,
    width: '100%',
  },
  container: {
    marginBottom: 16,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, 
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 14,
    color: '#B69D74',
    fontWeight: '500',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#AAAAAA',
    marginTop: 8,
    fontSize: 14,
  },
  emptySubtext: {
    color: '#777777',
    marginTop: 4,
    fontSize: 12,
  },
  separator: {
    height: 10,
  },
  card: {
    backgroundColor: 'rgba(25, 25, 25, 0.9)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 60, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  propertyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  channelTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  channelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  guestName: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 10,
  },
  stayDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSection: {
    flex: 3,
    flexDirection: 'row',
  },
  dateItem: {
    flex: 1,
    marginRight: 8,
  },
  dateLabel: {
    fontSize: 9,
    color: '#777777',
    marginBottom: 2,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 11,
    color: '#DDDDDD',
    fontWeight: '500',
  },
  payoutSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  payoutLabel: {
    fontSize: 9,
    color: '#777777',
    marginBottom: 2,
    fontWeight: '500',
  },
  payoutValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

export default UpcomingReservations; 