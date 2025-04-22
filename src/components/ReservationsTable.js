import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  ActivityIndicator, 
  TouchableOpacity,
  Animated,
  Image,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';
import moment from 'moment';
import { format, differenceInDays } from 'date-fns';
import { parseISO } from 'date-fns';
import { LinearGradient } from 'react-native-linear-gradient';

// Define gold colors for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  gradient: '#D4AF37',
  border: 'rgba(182, 148, 76, 0.4)'
};

const { width } = Dimensions.get('window');

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return '$0.00';
  }
  
  // Ensure value is a number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '$0.00';
  }
  
  // Always show 2 decimal places regardless of amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

// Helper to safely parse potentially string numbers
const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper to find properties nested anywhere in an object
const findNestedProperty = (obj, key) => {
  if (!obj || typeof obj !== 'object') return undefined;
  
  // Check current level
  if (obj[key] !== undefined) return obj[key];
  
  // Check one level down in all object properties
  for (const prop in obj) {
    if (typeof obj[prop] === 'object' && obj[prop] !== null) {
      if (obj[prop][key] !== undefined) return obj[prop][key];
      
      // Check specifically in a financials/financial property
      if (prop === 'financials' || prop === 'financial') {
        if (obj[prop][key] !== undefined) return obj[prop][key];
      }
    }
  }
  
  return undefined;
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  return moment(dateString).format('MMM D, YYYY');
};

const calculateNights = (arrivalDate, departureDate) => {
  if (!arrivalDate || !departureDate) return '0';
  
  const arrival = moment(arrivalDate);
  const departure = moment(departureDate);
  
  return departure.diff(arrival, 'days');
};

const ReservationCard = ({ item, onPress, index }) => {
  // Animated values for entrance animation
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;
  const scale = React.useRef(new Animated.Value(0.95)).current;
  
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Check if item exists
  if (!item) {
    console.error('Reservation item is undefined or null');
    return null;
  }
  
  // Safely access properties with defaults
  const propertyName = item?.listingName || item?.property?.name || findNestedProperty(item, 'listingName') || findNestedProperty(item, 'propertyName') || 'Unknown Property';
  const guestName = item?.guest?.name || findNestedProperty(item, 'guestName') || 'Unknown Guest';
  
  // Handle channel display with custom formatting
  const rawChannelName = item?.channelName || item?.channel || findNestedProperty(item, 'channelName') || findNestedProperty(item, 'channel') || '';
  let channelText = 'Direct';
  let channelColor = GOLD.primary; // Gold by default
  
  const channelLower = rawChannelName.toLowerCase();
  if (channelLower.includes('airbnb')) {
    channelText = 'Airbnb';
    channelColor = '#FF5A5F'; // Airbnb red
  } else if (channelLower.includes('vrbo') || channelLower.includes('homeaway')) {
    channelText = 'Vrbo';
    channelColor = '#3D91FF'; // Vrbo blue
  }
  
  // Extract financial data with no defaults
  const ownerPayout = parseNumber(item?.ownerPayout || findNestedProperty(item, 'ownerPayout') || 0);
  
  // Safely format dates with better error handling
  let checkInDate = null;
  let checkOutDate = null;
  let nights = 0;
  
  try {
    // Try multiple possible date field names
    const arrivalDateString = item?.checkIn || item?.arrivalDate || item?.arrival || findNestedProperty(item, 'checkIn') || findNestedProperty(item, 'arrivalDate');
    const departureDateString = item?.checkOut || item?.departureDate || item?.departure || findNestedProperty(item, 'checkOut') || findNestedProperty(item, 'departureDate');
    
    if (arrivalDateString) {
      checkInDate = new Date(arrivalDateString);
    }
    
    if (departureDateString) {
      checkOutDate = new Date(departureDateString);
    }
    
    if (checkInDate && checkOutDate) {
      nights = differenceInDays(checkOutDate, checkInDate);
    }
  } catch (error) {
    console.error("Error formatting dates:", error);
  }
  
  // Default nights if calculation failed but we have a nights value
  if (nights === 0 && item?.nights) {
    nights = parseNumber(item.nights);
  }
  
  // Get status and corresponding style
  const status = item?.status || 'confirmed';
  let statusText = 'Confirmed';
  let statusColor = '#4CAF50'; // Green by default
  
  if (status === 'modified') {
    statusText = 'Modified';
    statusColor = '#FF9800'; // Orange
  } else if (status === 'ownerStay') {
    statusText = 'Owner Stay';
    statusColor = '#2196F3'; // Blue
  } else if (status === 'cancelled' || status === 'canceled') {
    statusText = 'Cancelled';
    statusColor = '#F44336'; // Red
  }
  
  // Format the dates in a nice way
  const formatCardDate = (date) => {
    if (!date) return '';
    return format(date, 'MMM d, yyyy');
  };
  
  // Get the first letter of the guest's name for the avatar
  const getGuestInitial = () => {
    if (!guestName) return 'G';
    return guestName.charAt(0).toUpperCase();
  };
  
  return (
    <Animated.View style={[
      styles.card,
      {
        opacity,
        transform: [{ translateY }, { scale }],
        borderColor: GOLD.border // Thin gold border
      }
    ]}>
      <TouchableOpacity 
        style={styles.cardTouchable}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.guestAvatarContainer}>
            {item.guestPicture ? (
              <Image source={{ uri: item.guestPicture }} style={styles.guestAvatar} />
            ) : (
              <View style={styles.initialAvatar}>
                <Text style={styles.initialText}>{getGuestInitial()}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.guestName} numberOfLines={1}>{guestName}</Text>
            <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
          </View>
          
          <View style={[styles.channelBadge, { backgroundColor: `${channelColor}20` }]}>
            <Text style={[styles.channelText, { color: channelColor }]}>{channelText}</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.cardContent}>
          <View style={styles.dateContainer}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>CHECK-IN</Text>
              <Text style={styles.dateValue}>{formatCardDate(checkInDate)}</Text>
            </View>
            
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>CHECK-OUT</Text>
              <Text style={styles.dateValue}>{formatCardDate(checkOutDate)}</Text>
            </View>
            
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>NIGHTS</Text>
              <Text style={styles.dateValue}>{nights}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
          
          <View style={styles.payoutContainer}>
            <Text style={styles.payoutLabel}>Payout</Text>
            <Text style={styles.payoutValue}>{formatCurrency(ownerPayout)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ReservationsTable = ({ 
  reservations = [], 
  loading = false,
  onRowPress = () => {},
  onRefresh = () => {},
  sortBy = 'date' // 'date' or 'revenue'
}) => {
  // Sort the reservations based on the sortBy parameter
  const sortedReservations = React.useMemo(() => {
    if (!reservations || !reservations.length) return [];

    console.log('reservations', reservations[0], sortBy);
    
    if (sortBy === 'revenue') {
      return [...reservations].sort((a, b) => {
        const aRevenue = parseNumber(a?.ownerPayout || findNestedProperty(a, 'ownerPayout') || 0);
        const bRevenue = parseNumber(b?.ownerPayout || findNestedProperty(b, 'ownerPayout') || 0);
        return bRevenue - aRevenue; // Descending order
      });
    } else {
      // Default: sort by check-in date
      return [...reservations].sort((a, b) => {
        const aDate = new Date(a?.checkIn || a?.arrivalDate || a?.arrival || findNestedProperty(a, 'checkIn') || findNestedProperty(a, 'arrivalDate') || 0);
        const bDate = new Date(b?.checkIn || b?.arrivalDate || b?.arrival || findNestedProperty(b, 'checkIn') || findNestedProperty(b, 'arrivalDate') || 0);
        return aDate - bDate; // Ascending order (earliest first)
      });
    }
  }, [reservations, sortBy]);

  // Handle empty state
  if (!reservations || reservations.length === 0) {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD.primary} />
          <Text style={styles.emptyText}>Loading reservations...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="calendar-outline" size={48} color={GOLD.primary} />
        <Text style={styles.emptyText}>No reservations to display</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedReservations}
        keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
        renderItem={({ item, index }) => (
          <ReservationCard 
            item={item} 
            onPress={onRowPress}
            index={index}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshing={loading}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: GOLD.border,
    overflow: 'hidden',
  },
  cardTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
  },
  guestAvatarContainer: {
    marginRight: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  initialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 18,
    fontWeight: '600',
    color: GOLD.primary,
  },
  headerContent: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#000000',
  },
  propertyName: {
    fontSize: 14,
    color: '#666666',
  },
  channelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
  },
  cardContent: {
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  payoutContainer: {
    alignItems: 'flex-end',
  },
  payoutLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  payoutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: GOLD.primary,
  },
  separator: {
    height: 8,
  },
  listContent: {
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ReservationsTable; 