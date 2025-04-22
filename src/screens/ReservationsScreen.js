import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Dimensions,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import ReservationsTable from '../components/ReservationsTable';
import CustomDropdown from '../components/CustomDropdown';
import DateRangePicker from '../components/DateRangePicker';
import { theme as defaultTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getReservationsWithFinancialData } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Status values to include in the display - matches owner portal
const VALID_STATUSES = ['new', 'modified', 'ownerStay', 'confirmed'];

// Define gold colors for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  gradient: '#D4AF37'
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const SummaryCard = ({ title, value, isCount, color, theme, icon }) => {
  return (
    <View style={[styles.summaryCard, { 
      backgroundColor: theme.surface, 
      borderColor: theme.borderColor || '#E0E0E0'
    }]}>
      <View style={styles.summaryIconContainer}>
        <Ionicons name={icon} size={16} color={GOLD.primary} />
      </View>
      <Text style={[styles.summaryValue, { color: GOLD.primary }]}>
        {isCount ? value : formatCurrency(value)}
      </Text>
      <Text style={[styles.summaryTitle, { color: theme.text.secondary }]}>{title}</Text>
    </View>
  );
};

const ReservationsScreen = ({ navigation }) => {
  const { listings, refreshData, isLoading: authLoading } = useAuth();
  const { theme = defaultTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Animated values for the collapsible header
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Filter and sort states
  const [selectedListing, setSelectedListing] = useState(null);
  const [startDate, setStartDate] = useState(new Date()); // Default to today
  const [endDate, setEndDate] = useState(null); // Default to null (all future reservations)
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // Default sort by check-in date
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Calculate header height and opacity based on scroll position
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [110, 60],
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
  
  // Format listings for property picker
  const formattedListings = React.useMemo(() => {
    if (!listings || !listings.length) return [];
    
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
    if (formattedListings.length > 0 && !selectedListing) {
      setSelectedListing(formattedListings[0].id);
    }
  }, [formattedListings, selectedListing]);
  
  // Handle listing selection
  const handleListingSelect = (selected) => {
    setSelectedListing(selected);
  };
  
  // Handle date selection
  const handleStartDateSelect = (date) => {
    setStartDate(date);
  };
  
  const handleEndDateSelect = (date) => {
    setEndDate(date);
  };
  
  // Reset filters
  const resetFilters = () => {
    if (formattedListings.length > 0) {
      setSelectedListing(formattedListings[0].id);
    } else {
      setSelectedListing(null);
    }
    setStartDate(new Date());
    setEndDate(null);
  };
  
  // Handle sort selection
  const handleSortSelect = (method) => {
    setSortBy(method);
    setShowSortOptions(false);
  };
  
  // Load reservations with filters
  const loadFilteredReservations = async () => {
    if (!listings || !listings.length) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Format dates for API
      const formatDateForApi = (date) => {
        if (!date) return null;
        
        // Create a new date object with timezone offset applied
        // to ensure we get the correct date in UTC
        const correctedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return correctedDate.toISOString().split('T')[0];
      };
      
      // Prepare array of relevant listing IDs
      let relevantListingIds = [];
      
      // Filter by selected listing
      if (selectedListing !== 'all' && listings) {
        relevantListingIds = [selectedListing];
      } else {
        // If "All Properties" is selected, include all listing IDs
        relevantListingIds = listings.map(listing => listing.id.toString());
      }
      
      // Common parameters for all API calls
      const baseParams = {
        fromDate: formatDateForApi(startDate),
        toDate: formatDateForApi(endDate),
        dateType: 'arrivalDate',
        statuses: VALID_STATUSES
      };
      
      let allReservations = [];
      
      // Fetch reservations for each listing separately
      for (const listingId of relevantListingIds) {
        const params = {
          ...baseParams,
          listingMapIds: [listingId]
        };
        
        const result = await getReservationsWithFinancialData(params);
        
        if (result?.reservations && Array.isArray(result.reservations)) {
          allReservations = [...allReservations, ...result.reservations];
        }
      }
      
      // Further filter by valid statuses if needed
      const transformedReservations = allReservations.filter(res => 
        VALID_STATUSES.includes(res.status)
      ).map(res => {
        // Find the property details
        const property = formattedListings.find(
          p => p.id === res.listingMapId?.toString() || p.id === res.propertyId?.toString()
        );
        
        // Get dates from reservation
        const arrivalDate = new Date(res.arrivalDate || res.checkInDate);
        const departureDate = new Date(res.departureDate || res.checkOutDate);
        const bookingDate = res.reservationDate ? new Date(res.reservationDate) : new Date();
        
        // Calculate nights
        const nights = Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24)) || res.nights || 1;
        
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
        
        // Extract financial data - be thorough to catch all variations
        const extractFinancialData = () => {
          // Check for nested financial data
          const financialData = res.financialData || {};
          
          // Process various fee fields
          return {
            // Base rate
            baseRate: parseFloat(res.baseRate || financialData.baseRate || 0),
            
            // Cleaning fee
            cleaningFee: parseFloat(res.cleaningFee || financialData.cleaningFeeValue || 0),
            
            // Processing fee
            processingFee: parseFloat(
              financialData.PaymentProcessing || 
              financialData.paymentProcessing || 
              res.paymentProcessingFee || 
              res.processingFee || 
              0
            ),
            
            // Channel fee
            channelFee: parseFloat(
              res.channelFee || 
              financialData.channelFee || 
              0
            ),
            
            // Management fee
            managementFee: parseFloat(
              res.pmCommission || 
              res.managementFee || 
              financialData.pmCommission || 
              financialData.managementFee || 
              financialData.managementFeeAirbnb || 
              0
            ),
            
            // Owner payout
            ownerPayout: parseFloat(res.ownerPayout || res.airbnbExpectedPayoutAmount || 0),
            
            // Total price
            totalPrice: parseFloat(res.totalPrice || financialData.totalPaid || 0)
          };
        };
        
        const financials = extractFinancialData();
        
        // Include all the data needed for the reservation detail modal
        return {
          ...res,
          // Property info
          propertyName: property?.name || res.listingName || 'Property',
          propertyImage: property?.image,
          
          // Guest info formatted
          guestName: res.guestName || res.guestFirstName || 'Guest',
          guestFirstName: res.guestFirstName || res.guestName?.split(' ')[0] || 'Guest',
          guestLastName: res.guestLastName || '',
          
          // Formatted dates
          arrivalDate,
          departureDate,
          bookingDate,
          
          // Channel info
          channel: channelType,
          
          // Financial data - explicitly include extracted values
          baseRate: financials.baseRate,
          cleaningFee: financials.cleaningFee,
          processingFee: financials.processingFee,
          channelFee: financials.channelFee,
          managementFee: financials.managementFee,
          ownerPayout: financials.ownerPayout,
          totalPrice: financials.totalPrice,
          
          // Required for modal display
          adultCount: res.adults || res.numberOfGuests || 1,
          childrenCount: res.children || 0,
          infantCount: res.infants || 0,
          
          // Store nights
          nights
        };
      });
      
      // Sort reservations based on selected sort option
      const sortedReservations = sortReservations(transformedReservations);
      
      setFilteredReservations(sortedReservations);
    } catch (error) {
      console.error('Error loading reservations:', error);
      setFilteredReservations([]);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };
  
  // Sort reservations based on current sort option
  const sortReservations = (reservations) => {
    if (!reservations || !reservations.length) return [];
    
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
        const dateA = new Date(a.arrivalDate || a.checkInDate);
        const dateB = new Date(b.arrivalDate || b.checkInDate);
        return dateA - dateB;
      });
    }
    
    return sorted;
  };
  
  // Apply filters when they change
  useEffect(() => {
    // Add a small timeout to prevent rapid concurrent requests
    const timeoutId = setTimeout(() => {
      loadFilteredReservations();
    }, 100);
    
    // Cleanup the timeout if the effect runs again before it fires
    return () => clearTimeout(timeoutId);
  }, [selectedListing, startDate, endDate, listings]);

  const totalBookings = filteredReservations.length;
  
  // Calculate financial totals from the filtered reservations
  const calculateFinancialTotals = () => {
    // Initialize with zero values
    const totals = {
      baseRate: 0,
      cleaningFee: 0,
      ownerPayout: 0
    };
    
    if (!filteredReservations || !filteredReservations.length) return totals;
    
    // Reduce the reservations to get totals
    return filteredReservations.reduce((sums, res) => {
      // Base rate calculation (include all components like discounts)
      const baseRate = parseFloat(res.baseRate || res.baseRateAmount || 0);
      const weeklyDiscount = parseFloat(res.weeklyDiscount || res.weeklyDiscountAmount || 0);
      const couponDiscount = parseFloat(res.couponDiscount || 0);
      const monthlyDiscount = parseFloat(res.monthlyDiscount || 0);
      const cancellationPayout = parseFloat(res.cancellationPayout || 0);
      const otherFees = parseFloat(res.otherFees || 0);
      
      sums.baseRate += baseRate + weeklyDiscount + couponDiscount + 
                      monthlyDiscount + cancellationPayout + otherFees;
      
      // Cleaning fee
      sums.cleaningFee += parseFloat(res.cleaningFee || res.cleaningFeeValue || 0);
      
      // Owner payout
      sums.ownerPayout += parseFloat(res.ownerPayout || 0);
      
      return sums;
    }, totals);
  };
  
  // Get financial totals
  const financialTotals = calculateFinancialTotals();

  // Get totals from the current filtered reservations
  const totals = {
    bookings: filteredReservations.length,
    totalRevenue: financialTotals.ownerPayout || 0,
    upcomingRevenue: financialTotals.baseRate || 0,
    baseRate: financialTotals.baseRate,
    cleaningFee: financialTotals.cleaningFee,
    ownerPayout: financialTotals.ownerPayout
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFilteredReservations();
    setRefreshing(false);
  };

  const handleRowPress = (reservation) => {
    // Log the complete reservation data
    console.log('COMPLETE RESERVATION DATA:', JSON.stringify(reservation, null, 2));
    
    // Log all fee-related fields for debugging
    console.log('RAW FEE FIELDS:', {
      // Direct properties
      channelFee: reservation.channelFee,
      hostChannelFee: reservation.hostChannelFee,
      VRBOChannelFee: reservation.VRBOChannelFee,
      serviceFee: reservation.serviceFee,
      
      // Nested in financialData
      financialData_channelFee: reservation.financialData?.channelFee,
      financialData_hostChannelFee: reservation.financialData?.hostChannelFee,
      
      // Other potentially related fields
      processingFee: reservation.processingFee,
      paymentProcessingFee: reservation.paymentProcessingFee,
      managementFee: reservation.managementFee,
      pmCommission: reservation.pmCommission,
      
      // Extracted values from original code
      extracted_channelFee: parseFloat(
        reservation.channelFee || 
        reservation.financialData?.channelFee ||
        0
      )
    });
    
    // Log the original reservation data to debug fee fields
    console.log('Raw reservation data for fees:', {
      processingFee: reservation.financialData?.PaymentProcessing,
      paymentProcessingFee: reservation.paymentProcessingFee,
      processingFeeField: reservation.processingFee,
      hostChannelFee: reservation.hostChannelFee,
      channelFee: reservation.channelFee,
      managementFee: reservation.managementFee,
      pmCommission: reservation.pmCommission,
      financialData: reservation.financialData
    });
    
    // Add more detailed debug info for hostChannelFee
    console.log('CHANNEL FEE DETAILED DEBUG:', {
      hostChannelFee: {
        value: reservation.hostChannelFee,
        type: typeof reservation.hostChannelFee,
        parsedValue: parseFloat(reservation.hostChannelFee || 0)
      },
      channelFee: {
        value: reservation.channelFee,
        type: typeof reservation.channelFee,
        parsedValue: parseFloat(reservation.channelFee || 0)
      },
      financialDataHostChannelFee: {
        value: reservation.financialData?.hostChannelFee,
        type: typeof reservation.financialData?.hostChannelFee,
        parsedValue: parseFloat(reservation.financialData?.hostChannelFee || 0)
      }
    });
    
    // Enhance the reservation data for the modal with better financial data formatting
    const enhancedReservation = {
      ...reservation,
      // Add required fields for ReservationDetailModal to display properly
      id: reservation.id || reservation.reservationId,
      guestName: reservation.guestName || 'Guest',
      propertyName: reservation.propertyName || reservation.listingName || 'Property',
      arrivalDate: reservation.arrivalDate || new Date(reservation.checkIn || reservation.checkInDate),
      departureDate: reservation.departureDate || new Date(reservation.checkOut || reservation.checkOutDate),
      bookingDate: reservation.bookingDate || new Date(reservation.reservationDate || Date.now()),
      
      // Guest counts
      adultCount: reservation.adults || reservation.adultCount || reservation.numberOfGuests || 1,
      infantCount: reservation.infants || reservation.infantCount || 0,
      childrenCount: reservation.children || reservation.childrenCount || 0,
      
      // Booking details
      confirmationCode: reservation.confirmationCode || reservation.channelReservationId || 'N/A',
      cancellationPolicy: reservation.airbnbCancellationPolicy || reservation.cancellationPolicy || 'Standard',
      nights: reservation.nights || 1,
      
      // Financial data for Guest Paid section
      nightlyRate: reservation.baseRate ? reservation.baseRate / (reservation.nights || 1) : 0,
      cleaningFee: reservation.cleaningFee || 0,
      serviceFee: reservation.serviceFee || reservation.hostChannelFee || 0,
      occupancyTaxes: reservation.occupancyTaxes || reservation.tourismFee || reservation.cityTax || 0,
      guestTotal: reservation.guestTotal || reservation.totalPrice || 0,
      
      // Financial data for Host Payout section - expanded field checking
      baseRate: parseFloat(reservation.baseRate) || 0,
      
      // Process fee - check multiple possible fields
      processingFee: parseFloat(
        reservation.financialData?.PaymentProcessing || 
        reservation.financialData?.paymentProcessing || 
        reservation.paymentProcessingFee || 
        reservation.processingFee || 
        0
      ),
      
      // Channel fee - check multiple possible fields
      channelFee: parseFloat(
        reservation.channelFee || 
        reservation.financialData?.channelFee ||
        0
      ),
      
      // Management fee - check multiple possible fields
      managementFee: parseFloat(
        reservation.pmCommission || 
        reservation.managementFee || 
        reservation.financialData?.pmCommission || 
        reservation.financialData?.managementFee || 
        reservation.financialData?.managementFeeAirbnb || 
        0
      ),
      
      // Final payout
      hostPayout: parseFloat(reservation.ownerPayout) || parseFloat(reservation.airbnbExpectedPayoutAmount) || 0,
      
      // Channel information
      channelName: reservation.channelName || '',
      channel: reservation.channel || '',
      status: reservation.status || '',
      paymentStatus: reservation.paymentStatus || '',
      
      // Keep the raw financial data
      financialData: reservation.financialData || {}
    };
    
    // Log the enhanced financial data to verify what values are being used
    console.log('Enhanced financial data:', {
      processingFee: enhancedReservation.processingFee,
      channelFee: enhancedReservation.channelFee,
      managementFee: enhancedReservation.managementFee
    });
    
    setSelectedReservation(enhancedReservation);
    setModalVisible(true);
  };

  if ((isLoading || authLoading) && !refreshing) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: theme?.background || '#FFFFFF'}]}>
        <ActivityIndicator size="large" color={GOLD.primary} />
        <Text style={[styles.loadingText, {color: theme?.text?.secondary || '#666666'}]}>Loading reservations...</Text>
      </View>
    );
  }

  // Render property filters with images
  const renderPropertyFilters = () => {
    if (!formattedListings || formattedListings.length === 0) return null;
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.propertyFilterContainer}
      >
        {/* All Properties option */}
        <TouchableOpacity
          style={[
            styles.propertyFilterItem,
            selectedListing === 'all' && styles.selectedPropertyItem
          ]}
          onPress={() => handleListingSelect('all')}
        >
          <View style={[styles.propertyImageContainer, { backgroundColor: GOLD.light }]}>
            <Icon name="home" size={20} color={GOLD.primary} />
          </View>
          <Text style={[
            styles.propertyFilterText,
            selectedListing === 'all' && { color: GOLD.primary, fontWeight: '600' }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        {/* Individual property options */}
        {formattedListings.map((listing, index) => {
          const isSelected = selectedListing === listing.id;
          
          return (
            <TouchableOpacity
              key={`property-${index}`}
              style={[
                styles.propertyFilterItem,
                isSelected && styles.selectedPropertyItem
              ]}
              onPress={() => handleListingSelect(listing.id)}
            >
              <View style={[
                styles.propertyImageContainer, 
                isSelected && { borderColor: GOLD.primary }
              ]}>
                {listing.image ? (
                  <Image 
                    source={{ uri: listing.image }} 
                    style={styles.propertyImage} 
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.propertyImagePlaceholder, { backgroundColor: GOLD.light }]}>
                    <Text style={{ color: GOLD.primary }}>{listing.name.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.propertyFilterText,
                isSelected && { color: GOLD.primary, fontWeight: '600' }
              ]} numberOfLines={1}>
                {listing.name.length > 10 ? `${listing.name.substring(0, 10)}...` : listing.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

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
          borderBottomWidth: 0,
          paddingTop: insets.top
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
          <Text style={[styles.title, { color: theme?.text?.primary || '#000000' }]}>Reservations</Text>
        </Animated.View>
        
        <View style={styles.headerButtons}>
          {/* Sort Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: GOLD.light, marginRight: 8 }]}
            onPress={() => handleSortSelect(sortBy === 'date' ? 'revenue' : 'date')}
          >
            <Icon name="swap-vertical" size={16} color={GOLD.primary} />
            <Text style={[styles.headerButtonText, { color: GOLD.primary }]}>
              {sortBy === 'date' ? 'Date' : 'Revenue'}
            </Text>
          </TouchableOpacity>
          
          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: GOLD.light }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Icon name="filter" size={16} color={GOLD.primary} />
            <Text style={[styles.headerButtonText, { color: GOLD.primary }]}>
              Filter
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <View style={styles.contentContainer}>
        {/* Property filters */}
        <View style={styles.quickFiltersContainer}>
          {renderPropertyFilters()}
        </View>
        
        {/* Main content */}
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD.primary}
              colors={[GOLD.primary]}
            />
          }
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {showFilters && (
            <View style={[styles.filtersContainer, { backgroundColor: theme?.surface || '#F5F5F5' }]}>
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: theme?.text?.secondary || '#666666' }]}>Date Range</Text>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={handleStartDateSelect}
                  onEndDateChange={handleEndDateSelect}
                  theme={theme || defaultTheme}
                />
              </View>
              
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={[styles.resetButton, { borderColor: theme?.borderColor || '#E0E0E0' }]}
                  onPress={resetFilters}
                >
                  <Text style={[styles.resetButtonText, { color: theme?.text?.secondary || '#666666' }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: GOLD.primary }]}
                  onPress={loadFilteredReservations}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Financial summary */}
          <View style={styles.summaryContainer}>
            <SummaryCard 
              title="Total Revenue" 
              value={totals.totalRevenue} 
              theme={theme || defaultTheme} 
              icon="cash-outline"
            />
            <SummaryCard 
              title="Upcoming Revenue" 
              value={totals.upcomingRevenue} 
              theme={theme || defaultTheme} 
              icon="trending-up"
            />
            <SummaryCard 
              title="Total Bookings" 
              value={filteredReservations.length} 
              isCount={true} 
              theme={theme || defaultTheme}
              icon="calendar-outline"
            />
          </View>
        
          {isLoading ? (
            <View style={[styles.loadingContentContainer, { backgroundColor: theme?.surface || '#F5F5F5' }]}>
              <ActivityIndicator size="large" color={GOLD.primary} />
              <Text style={[styles.loadingText, { color: theme?.text?.secondary || '#666666' }]}>
                Loading reservations...
              </Text>
            </View>
          ) : filteredReservations.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme?.surface || '#F5F5F5' }]}>
              <Icon name="calendar-outline" size={48} color={theme?.text?.secondary || '#666666'} />
              <Text style={[styles.emptyText, { color: theme?.text?.secondary || '#666666' }]}>
                No reservations found for the selected filters.
              </Text>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: GOLD.primary, marginTop: 20 }]}
                onPress={resetFilters}
              >
                <Text style={[styles.resetButtonText, { color: GOLD.primary }]}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ReservationsTable
              reservations={filteredReservations}
              onRowPress={handleRowPress}
              theme={theme || defaultTheme}
              sortBy={sortBy}
            />
          )}
        </ScrollView>
      </View>
      
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  titleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingVertical: 6,
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
  contentContainer: {
    flex: 1,
    marginTop: 110, // Match height of collapsed header
  },
  quickFiltersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  propertyFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    paddingBottom: 10,
  },
  propertyFilterItem: {
    alignItems: 'center',
    marginRight: 16,
    opacity: 0.8,
  },
  selectedPropertyItem: {
    opacity: 1,
  },
  propertyImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  propertyFilterText: {
    fontSize: 12,
    color: '#666666',
    maxWidth: 60,
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  filtersContainer: {
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterRow: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  applyButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GOLD.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContentContainer: {
    padding: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyState: {
    padding: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
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
});

export default ReservationsScreen;
