import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropertyPicker from '../components/PropertyPicker';
import { useAuth } from '../context/AuthContext';
import { getReservationsWithFinancialData } from '../services/api';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { LinearGradient } from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { theme as defaultTheme } from '../theme';
import { format, differenceInDays } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Define gold colors for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  gradient: '#D4AF37',
  border: 'rgba(182, 148, 76, 0.4)'
};

// Colors for different channels
const CHANNEL_COLORS = {
  airbnb: '#FF385C',   // Red for Airbnb
  vrbo: '#3D89DE',     // Blue for VRBO
  default: GOLD.primary   // Gold for everything else
};

// Status values to include in the display - matches owner portal
const VALID_STATUSES = ['new', 'modified', 'ownerStay', 'confirmed'];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const ResosScreen = ({ navigation }) => {
  const { listings, refreshData, isLoading: authLoading } = useAuth();
  const { theme = defaultTheme } = useTheme();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // Default sort by check-in date
  const [showSortOptions, setShowSortOptions] = useState(false);
  
  // Animated values for effects
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Format listings for property picker
  const formattedListings = React.useMemo(() => {
    if (!listings || !Array.isArray(listings)) {
      // Return mock data if no listings
      return [{ 
        id: '1', 
        name: '#1 Largest Tampa Private Compound', 
        image: null 
      }];
    }
    
    return listings.map(listing => {
      // Find the first available image from various possible sources
      let imageUrl = null;
      if (listing.photos && listing.photos[0]?.url) {
        imageUrl = listing.photos[0].url;
      } else if (listing.listingImages && listing.listingImages[0]?.url) {
        imageUrl = listing.listingImages[0].url;
      } else if (listing.thumbnail) {
        imageUrl = listing.thumbnail;
      }

      return {
        id: listing.id.toString(),
        name: listing.name || `Property ${listing.id}`,
        image: imageUrl
      };
    });
  }, [listings]);

  // Set initial property when listings load
  useEffect(() => {
    if (formattedListings.length > 0 && !selectedProperty) {
      setSelectedProperty(formattedListings[0].id);
    }
  }, [formattedListings, selectedProperty]);

  // Effect to fetch reservations when the selected property changes
  useEffect(() => {
    if (selectedProperty) {
      fetchReservations();
    }
  }, [selectedProperty]);

  // Sort reservations when sortBy changes
  useEffect(() => {
    sortReservations();
  }, [sortBy, reservations]);

  const fetchReservations = async () => {
    if (!selectedProperty) return;
    
    setIsLoading(true);
    try {
      // Calculate date range for next 6 months
      const today = new Date();
      
      const startDate = new Date(today);
      startDate.setDate(1); // First day of month
      
      const endDate = new Date(today);
      endDate.setMonth(today.getMonth() + 6);
      endDate.setDate(31); // Last possible day of month
      
      // Format dates for API
      const fromDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // Prepare params for API call
      const params = {
        listingMapIds: selectedProperty === 'all' ? 
          formattedListings.map(l => l.id).filter(id => id !== 'all') : 
          [selectedProperty],
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrival', // could be 'arrival' or 'departure'
        statuses: VALID_STATUSES
      };
      
      // Fetch reservations from API
      const result = await getReservationsWithFinancialData(params);
      
      if (result?.reservations && Array.isArray(result.reservations)) {
        // Transform reservations to include all needed data
        const transformedReservations = result.reservations
          .filter(res => {
            // Validate that we have both arrival and departure dates
            const hasArrival = !!res.arrivalDate || !!res.checkInDate;
            const hasDeparture = !!res.departureDate || !!res.checkOutDate;
            
            // Ensure valid status
            const hasValidStatus = VALID_STATUSES.includes(res.status);
            
            return hasArrival && hasDeparture && hasValidStatus;
          })
          .map(res => {
            // Determine the channel type
            let channelType = 'default';
            if (res.channelName) {
              const channelNameLower = String(res.channelName).toLowerCase();
              
              if (channelNameLower.includes('airbnb')) {
                channelType = 'airbnb';
              } else if (channelNameLower.includes('vrbo') || 
                         channelNameLower.includes('homeaway') ||
                         channelNameLower.includes('expedia')) {
                channelType = 'vrbo';
              }
            } else if (res.channel) {
              const channelLower = String(res.channel).toLowerCase();
              if (channelLower.includes('airbnb')) {
                channelType = 'airbnb';
              } else if (channelLower.includes('vrbo') || 
                         channelLower.includes('homeaway') ||
                         channelLower.includes('expedia')) {
                channelType = 'vrbo';
              }
            }
            
            // Find property details
            const property = formattedListings.find(
              p => p.id === (res.listingMapId?.toString() || res.propertyId?.toString())
            );
            
            // Get dates from reservation
            const arrivalDate = new Date(res.arrivalDate || res.checkInDate);
            const departureDate = new Date(res.departureDate || res.checkOutDate);
            
            // Calculate nights
            const nights = differenceInDays(departureDate, arrivalDate);
            
            return {
              id: res.id || res.reservationId,
              guestName: res.guestName || res.guestFirstName || 'Guest',
              guestFirstName: res.guestFirstName || res.guestName?.split(' ')[0] || 'Guest',
              guestLastName: res.guestLastName || '',
              guestEmail: res.guestEmail || '',
              guestPhone: res.phone || '',
              guestPicture: res.guestPicture || '',
              
              // Property information
              listingName: res.listingName || property?.name || 'Property',
              propertyName: property?.name || res.listingName || 'Property',
              propertyId: res.listingMapId || res.propertyId,
              propertyImage: property?.image || null,
              
              // Dates
              arrivalDate: arrivalDate,
              departureDate: departureDate,
              bookingDate: res.reservationDate ? new Date(res.reservationDate) : new Date(),
              
              // Guest counts
              adultCount: res.adults || res.numberOfGuests || 1,
              childrenCount: res.children || 0,
              infantCount: res.infants || 0,
              
              // Booking details
              confirmationCode: res.confirmationCode || '',
              channelReservationId: res.channelReservationId || '',
              status: res.status || 'confirmed',
              
              // Channel information
              channel: channelType,
              channelName: res.channelName || '',
              
              // Financial data
              ownerPayout: res.ownerPayout || 0,
              baseRate: res.baseRate || 0,
              cleaningFee: res.cleaningFee || 0,
              totalPrice: res.totalPrice || 0,
              
              // Additional info
              nights: nights || res.nights || 1
            };
          });
        
        setReservations(transformedReservations);
      } else {
        setReservations([]);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const sortReservations = () => {
    if (!reservations || !reservations.length) {
      setFilteredReservations([]);
      return;
    }
    
    let sorted = [...reservations];
    
    if (sortBy === 'revenue') {
      // Sort by revenue (highest first)
      sorted = sorted.sort((a, b) => {
        const aRevenue = parseFloat(a.ownerPayout || 0);
        const bRevenue = parseFloat(b.ownerPayout || 0);
        return bRevenue - aRevenue;
      });
    } else {
      // Default: sort by check-in date (earliest first)
      sorted = sorted.sort((a, b) => {
        return new Date(a.arrivalDate) - new Date(b.arrivalDate);
      });
    }
    
    setFilteredReservations(sorted);
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const handleSortSelect = (method) => {
    setSortBy(method);
    setShowSortOptions(false);
  };

  const handleRowPress = (reservation) => {
    setSelectedReservation(reservation);
    setModalVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
  };

  // Calculate header height and opacity based on scroll position
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [150, 60],
    extrapolate: 'clamp',
  });
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  
  const titleScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });
  
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  // Summary info for header
  const totalUpcoming = filteredReservations.length;
  const totalRevenue = filteredReservations.reduce(
    (sum, res) => sum + parseFloat(res.ownerPayout || 0), 
    0
  );

  // Find the selected property data
  const selectedPropertyData = formattedListings.find(p => p.id === selectedProperty);

  // Render a reservation card with animated entrance
  const renderReservationCard = ({ item, index }) => {
    // Determine the channel color
    const channelColor = CHANNEL_COLORS[item.channel] || GOLD.primary;
    
    // Format dates
    const checkInDate = format(new Date(item.arrivalDate), 'MMM d, yyyy');
    const checkOutDate = format(new Date(item.departureDate), 'MMM d, yyyy');
    
    // Get the status label and color
    let statusLabel = 'Confirmed';
    let statusColor = '#4CAF50'; // Green by default
    
    if (item.status === 'modified') {
      statusLabel = 'Modified';
      statusColor = '#FF9800'; // Orange
    } else if (item.status === 'ownerStay') {
      statusLabel = 'Owner Stay';
      statusColor = '#2196F3'; // Blue
    }
    
    // Initial letter for avatar
    const guestInitial = item.guestName.charAt(0).toUpperCase();
    
    return (
      <Animated.View 
        style={[
          styles.reservationCard,
          { borderColor: GOLD.border }
        ]}
      >
        <TouchableOpacity 
          style={styles.cardTouchable}
          onPress={() => handleRowPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.propertySection}>
              {item.propertyImage ? (
                <Image source={{ uri: item.propertyImage }} style={styles.propertyThumbnail} />
              ) : (
                <View style={[styles.propertyThumbnailPlaceholder, { backgroundColor: GOLD.light }]}>
                  <Text style={{ color: GOLD.primary, fontWeight: 'bold' }}>
                    {item.propertyName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.propertyTextContainer}>
                <Text style={styles.propertyName} numberOfLines={1}>
                  {item.propertyName}
                </Text>
                <Text style={styles.reservationDates}>
                  {checkInDate} - {checkOutDate}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.cardContent}>
            <View style={styles.guestSection}>
              <View style={styles.guestAvatarContainer}>
                <View style={[styles.guestAvatar, { backgroundColor: channelColor }]}>
                  <Text style={styles.guestInitial}>{guestInitial}</Text>
                </View>
              </View>
              
              <View style={styles.guestInfo}>
                <Text style={styles.guestName}>{item.guestName}</Text>
                <View style={styles.guestMetaContainer}>
                  <View style={[styles.channelBadge, { backgroundColor: `${channelColor}20` }]}>
                    <Text style={[styles.channelText, { color: channelColor }]}>
                      {item.channel === 'airbnb' ? 'Airbnb' : item.channel === 'vrbo' ? 'VRBO' : 'Direct'}
                    </Text>
                  </View>
                  <Text style={styles.nightsText}>{item.nights} night{item.nights !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              
              <View style={styles.payoutContainer}>
                <Text style={styles.payoutLabel}>Payout</Text>
                <Text style={styles.payoutValue}>{formatCurrency(item.ownerPayout)}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if ((isLoading || authLoading) && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme?.background || '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={GOLD.primary} />
        <Text style={[styles.loadingText, { color: theme?.text?.secondary || '#666666' }]}>
          Loading reservations...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#FFFFFF' }]}>
      <StatusBar barStyle={theme?.isDarkMode ? 'light-content' : 'dark-content'} translucent={true} backgroundColor="transparent" />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.header,
        { 
          height: headerHeight,
          opacity: headerOpacity,
          backgroundColor: theme?.background || '#FFFFFF',
          borderBottomColor: theme?.borderColor || '#E0E0E0',
        }
      ]}>
        <Animated.View style={[
          styles.titleContainer,
          { 
            transform: [
              { scale: titleScale },
              { translateY: titleTranslateY }
            ] 
          }
        ]}>
          <Text style={[styles.title, { color: theme?.text?.primary || '#000000' }]}>Resos</Text>
          
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryText}>
              {totalUpcoming} upcoming · {formatCurrency(totalRevenue)}
            </Text>
          </View>
        </Animated.View>
        
        <View style={styles.headerButtons}>
          {/* Sort Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: GOLD.light, marginRight: 8 }]}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <Icon name="swap-vertical" size={16} color={GOLD.primary} />
            <Text style={[styles.headerButtonText, { color: GOLD.primary }]}>
              {sortBy === 'date' ? 'Date' : 'Revenue'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* Sort Options Popup */}
      {showSortOptions && (
        <View style={[styles.sortOptionsContainer, { top: 100, backgroundColor: theme?.surface || '#F5F5F5' }]}>
          <TouchableOpacity
            style={[styles.sortOption, sortBy === 'date' && styles.selectedSortOption]}
            onPress={() => handleSortSelect('date')}
          >
            <Icon 
              name="calendar-outline" 
              size={16} 
              color={sortBy === 'date' ? GOLD.primary : theme?.text?.secondary || '#666666'} 
            />
            <Text style={[
              styles.sortOptionText, 
              { color: sortBy === 'date' ? GOLD.primary : theme?.text?.secondary || '#666666' }
            ]}>
              Check-in Date
            </Text>
            {sortBy === 'date' && <Icon name="checkmark" size={16} color={GOLD.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortOption, sortBy === 'revenue' && styles.selectedSortOption]}
            onPress={() => handleSortSelect('revenue')}
          >
            <Icon 
              name="cash-outline" 
              size={16} 
              color={sortBy === 'revenue' ? GOLD.primary : theme?.text?.secondary || '#666666'} 
            />
            <Text style={[
              styles.sortOptionText, 
              { color: sortBy === 'revenue' ? GOLD.primary : theme?.text?.secondary || '#666666' }
            ]}>
              Revenue
            </Text>
            {sortBy === 'revenue' && <Icon name="checkmark" size={16} color={GOLD.primary} />}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Property Picker */}
      <View style={styles.propertyPickerContainer}>
        <PropertyPicker 
          selectedProperty={selectedProperty}
          onValueChange={handlePropertyChange}
          properties={[
            { id: 'all', name: 'All Properties', image: null },
            ...formattedListings
          ]}
          loading={false}
          showSelectedImage={true}
        />
      </View>
      
      {/* Reservations List */}
      <FlatList
        data={filteredReservations}
        renderItem={renderReservationCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD.primary}
            colors={[GOLD.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-outline" size={48} color={GOLD.primary} />
            <Text style={styles.emptyText}>No reservations found</Text>
          </View>
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
      
      {/* Reservation Detail Modal */}
      <ReservationDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        reservation={selectedReservation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  titleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryTextContainer: {
    marginTop: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sortOptionsContainer: {
    position: 'absolute',
    right: 16,
    width: 180,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 999,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  selectedSortOption: {
    backgroundColor: 'rgba(182, 148, 76, 0.05)',
  },
  sortOptionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  propertyPickerContainer: {
    marginTop: 160,
    paddingHorizontal: 16,
    marginBottom: 16,
    zIndex: 50,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  separator: {
    height: 12,
  },
  reservationCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertySection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  propertyThumbnailPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyTextContainer: {
    flex: 1,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  reservationDates: {
    fontSize: 12,
    color: '#666666',
  },
  statusContainer: {
    marginLeft: 8,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
  },
  cardContent: {
    padding: 16,
  },
  guestSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestAvatarContainer: {
    marginRight: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  guestMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nightsText: {
    fontSize: 12,
    color: '#666666',
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
});

export default ResosScreen; 