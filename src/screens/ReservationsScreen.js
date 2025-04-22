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
import { format, startOfDay, isSameDay } from 'date-fns';
import { saveToCache, loadFromCache, CACHE_KEYS } from '../utils/cacheUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Cache key for reservations
const RESERVATIONS_CACHE = 'cache_reservations_data';
// Debug flag for cache logging
const DEBUG_CACHE = false;

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
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add state for tracking when data is loaded from cache
  const [reservationsFromCache, setReservationsFromCache] = useState(false);
  
  // Add states to store all reservations and track filter/sort operations
  const [allReservations, setAllReservations] = useState([]);
  
  // Function to load reservations from cache
  const loadReservationsFromCache = async () => {
    try {
      // Create a cache key that includes the selected filters
      const cacheKey = `${RESERVATIONS_CACHE}_${selectedListing || 'all'}`;
      
      // Get the data in a single operation instead of checking keys first
      const cachedReservations = await loadFromCache(cacheKey);
      
      if (!cachedReservations || !Array.isArray(cachedReservations) || cachedReservations.length === 0) {
        return false;
      }
      
      // Need to fix dates which are stored as strings in cache
      const fixedReservations = cachedReservations.map(reservation => ({
        ...reservation,
        arrivalDate: reservation.arrivalDate ? new Date(reservation.arrivalDate) : null,
        departureDate: reservation.departureDate ? new Date(reservation.departureDate) : null,
        checkInDate: reservation.checkInDate ? new Date(reservation.checkInDate) : null,
        checkOutDate: reservation.checkOutDate ? new Date(reservation.checkOutDate) : null,
        bookingDate: reservation.bookingDate ? new Date(reservation.bookingDate) : null,
        reservationDate: reservation.reservationDate ? new Date(reservation.reservationDate) : null
      }));
      
      // Critical: First clear loading state to ensure UI updates immediately
      setIsLoading(false);
      
      // Update both state variables with cached reservations
      setFilteredReservations(fixedReservations);
      setAllReservations(fixedReservations); // Also set allReservations
      setReservationsFromCache(true);
      
      console.log(`Loaded ${fixedReservations.length} reservations from cache, allReservations is now set`);
      
      return true;
    } catch (error) {
      console.error('Error loading reservations from cache:', error);
      return false;
    }
  };
  
  // Function to save reservations to cache
  const saveReservationsToCache = async () => {
    if (!allReservations || !Array.isArray(allReservations) || allReservations.length === 0) {
      console.log('No reservations to cache');
      return;
    }
    
    try {
      // Create a cache key for all reservations
      const cacheKey = `${RESERVATIONS_CACHE}_all`;
      
      console.log(`Saving ${allReservations.length} reservations to cache`);
      await saveToCache(cacheKey, allReservations);
    } catch (error) {
      console.error('Error saving reservations to cache:', error);
    }
  };
  
  // Calculate header height and opacity based on scroll position
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [90, 50],
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
    if (!selectedListing) {
      setSelectedListing('all'); // Default to "All" properties instead of first listing
    }
  }, [formattedListings, selectedListing]);
  
  // Handle listing selection
  const handleListingSelect = (selected) => {
    console.log(`Listing selected: ${selected}`);
    
    // Set the selected listing state
    setSelectedListing(selected);
    
    // If we don't have any reservations yet, we need to load them first
    const hasReservations = (
      (allReservations && allReservations.length > 0) || 
      (filteredReservations && filteredReservations.length > 0)
    );
    
    if (!hasReservations) {
      console.log('No reservations cached yet, need to fetch from API first');
      setReservationsFromCache(false);
      setIsLoading(true);
      loadReservations().then(() => {
        // Once loaded, filter the results based on selected listing
        filterReservationsByProperty(selected);
      });
      return;
    }

    // We have reservations, just filter them
    filterReservationsByProperty(selected);
  };
  
  // Helper function to filter reservations by property
  const filterReservationsByProperty = (selected) => {
    // Get the reservations to filter - use filteredReservations as fallback
    const reservationsToFilter = (allReservations && allReservations.length > 0) 
      ? allReservations 
      : filteredReservations;
    
    // Safety check - if no reservations are available at all
    if (!reservationsToFilter || reservationsToFilter.length === 0) {
      console.log('No reservations to filter');
      setFilteredReservations([]);
      return;
    }
    
    console.log(`Filtering ${reservationsToFilter.length} reservations for property: ${selected}`);
    
    // If "all" is selected, just apply current sort and date filter
    if (selected === 'all') {
      const filtered = applySortAndDateFilter([...reservationsToFilter]);
      setFilteredReservations(filtered);
      return;
    }
    
    // Filter reservations for this property
    const filtered = reservationsToFilter.filter(item => {
      // Match against all possible property id fields
      const potentialIds = [
        item.listingMapId?.toString(),
        item.propertyId?.toString(), 
        item.listingId?.toString(),
        item.siteId?.toString()
      ].filter(Boolean);
      
      return potentialIds.some(id => id === selected);
    });
    
    console.log(`Found ${filtered.length} reservations for property ${selected}`);
    
    // Apply current sort and date filter to the filtered results
    const sortedAndFiltered = applySortAndDateFilter(filtered);
    setFilteredReservations(sortedAndFiltered);
  };
  
  // Function to apply date filtering
  const applyDateFilter = (date) => {
    console.log(`Applying date filter: ${date ? format(date, 'yyyy-MM-dd') : 'none'}`);
    
    // Get the reservations to filter - use filteredReservations as fallback
    const reservationsToFilter = (allReservations && allReservations.length > 0) 
      ? allReservations 
      : filteredReservations;
    
    // Check if we have reservations to filter
    if (!reservationsToFilter || reservationsToFilter.length === 0) {
      console.log('No reservations to filter');
      setShowDatePicker(false);
      return;
    }
    
    // Clone array to avoid mutation
    let filtered = [...reservationsToFilter];
    
    // Apply property filter if needed
    if (selectedListing !== 'all') {
      console.log(`Filtering by property: ${selectedListing}`);
      filtered = filtered.filter(item => {
        const potentialIds = [
          item.listingMapId?.toString(),
          item.propertyId?.toString(), 
          item.listingId?.toString(),
          item.siteId?.toString()
        ].filter(Boolean);
        
        return potentialIds.some(id => id === selectedListing);
      });
      console.log(`After property filter: ${filtered.length} reservations`);
    }
    
    // Apply date filter if provided
    if (date) {
      console.log('Filtering by check-in date');
      try {
        // Normalize to midnight for date comparison
        const filterDate = startOfDay(date);
        
        filtered = filtered.filter(item => {
          // Get check-in date (could be called arrivalDate or checkInDate)
          const checkInDateStr = item.arrivalDate || item.checkInDate;
          if (!checkInDateStr) return true; // Skip if no date available
          
          const checkInDate = startOfDay(new Date(checkInDateStr));
          return isSameDay(checkInDate, filterDate);
        });
        console.log(`After date filter: ${filtered.length} reservations`);
      } catch (error) {
        console.error('Error filtering by date:', error);
      }
    }
    
    // Sort filtered reservations
    if (sortBy === 'revenue') {
      filtered.sort((a, b) => {
        const aRevenue = Number(a.ownerPayout || 0);
        const bRevenue = Number(b.ownerPayout || 0);
        return bRevenue - aRevenue; // Highest first
      });
    } else {
      filtered.sort((a, b) => {
        const dateA = new Date(a.arrivalDate || a.checkInDate);
        const dateB = new Date(b.arrivalDate || b.checkInDate);
        return dateA - dateB; // Earliest first
      });
    }
    
    // Update state with filtered reservations
    setFilteredReservations(filtered);
    
    // Close the date picker
    setShowDatePicker(false);
  };
  
  // Function to apply both sort and date filters
  const applySortAndDateFilter = (reservations) => {
    // Safety check for empty arrays
    if (!reservations || !Array.isArray(reservations) || reservations.length === 0) {
      console.log('No reservations to sort or filter');
      return [];
    }
    
    console.log(`Applying filters to ${reservations.length} reservations`);
    
    let result = [...reservations];
    
    // Apply property filter first
    if (selectedListing !== 'all') {
      result = result.filter(item => {
        const potentialIds = [
          item.listingMapId?.toString(),
          item.propertyId?.toString(), 
          item.listingId?.toString(),
          item.siteId?.toString()
        ].filter(Boolean);
        
        return potentialIds.some(id => id === selectedListing);
      });
      console.log(`After property filter: ${result.length} reservations`);
    }
    
    // Apply date filter
    if (startDate) {
      const filterDate = new Date(startDate.toDateString());
      console.log('Filtering by check-in date >=', format(filterDate, 'yyyy-MM-dd'));
      
      result = result.filter(res => {
        try {
          const checkInDate = new Date(new Date(res.arrivalDate || res.checkInDate).toDateString());
          return checkInDate >= filterDate;
        } catch (e) {
          console.log('Error filtering date for reservation:', res.id);
          return false;
        }
      });
      console.log(`After date filter: ${result.length} reservations`);
    }
    
    // Apply sort
    if (sortBy === 'revenue') {
      result.sort((a, b) => {
        const aRevenue = Number(a.ownerPayout || 0);
        const bRevenue = Number(b.ownerPayout || 0);
        return bRevenue - aRevenue; // Highest first
      });
    } else {
      result.sort((a, b) => {
        const dateA = new Date(a.arrivalDate || a.checkInDate);
        const dateB = new Date(b.arrivalDate || b.checkInDate);
        return dateA - dateB; // Earliest first
      });
    }
    
    return result;
  };
  
  // Replace loadFilteredReservations with a simpler function that loads all reservations
  const loadReservations = async () => {
    if (!listings || !listings.length) {
      setIsLoading(false);
      return;
    }
    
    // Only show full page loading if we don't have cached data
    const shouldShowLoading = !reservationsFromCache;
    if (shouldShowLoading) {
      setIsLoading(true);
    }
    
    try {
      // Format dates for API - using a very old date to get all reservations
      const formatDateForApi = (date) => {
        if (!date) return null;
        
        // Create a new date object with timezone offset applied
        // to ensure we get the correct date in UTC
        const correctedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return correctedDate.toISOString().split('T')[0];
      };
      
      // Always fetch ALL listing IDs when loading, 
      // even if a specific property is selected (so we have complete data)
      const relevantListingIds = listings.map(listing => listing.id.toString());
      
      // Common parameters for all API calls - use a date far in the past to get all reservations
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1); // One year ago
      
      const baseParams = {
        fromDate: formatDateForApi(pastDate),
        toDate: null, // No end date to get all future reservations
        dateType: 'arrivalDate',
        statuses: VALID_STATUSES
      };
      
      let allFetchedReservations = [];
      
      // Always fetch reservations for each listing separately
      // This is more reliable than trying to fetch all at once
      for (const listingId of relevantListingIds) {
        const params = {
          ...baseParams,
          listingMapIds: [listingId]
        };
        
        const result = await getReservationsWithFinancialData(params);
        
        if (result?.reservations && Array.isArray(result.reservations)) {
          allFetchedReservations = [...allFetchedReservations, ...result.reservations];
        }
      }
      
      // Transform the reservations (same as before)
      const transformedReservations = allFetchedReservations.filter(res => 
        VALID_STATUSES.includes(res.status)
      ).map(res => {
        // Track potential property IDs for matching
        const potentialIds = [
          res.listingMapId?.toString(),
          res.propertyId?.toString(),
          res.listingId?.toString(),
          res.siteId?.toString()
        ].filter(Boolean); // Remove null/undefined
        
        // Find the property details with improved matching
        const property = formattedListings.find(p => {
          const pId = p.id?.toString();
          return potentialIds.some(id => id === pId);
        });
        
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
      
      // Store ALL reservations in memory
      console.log(`Setting allReservations with ${transformedReservations.length} items`);
      
      // Explicitly clone the array and all objects to avoid reference issues
      const reservationsToStore = JSON.parse(JSON.stringify(transformedReservations));
      setAllReservations(reservationsToStore);
      
      // Always show all reservations with current sort and date filter
      // We'll filter by property afterwards if needed
      const filtered = applySortAndDateFilter(reservationsToStore);
      setFilteredReservations(filtered);
      
    } catch (error) {
      console.error('Error loading reservations:', error);
      
      // If we have no cached data or fetching failed, set empty reservations
      if (!reservationsFromCache) {
        setAllReservations([]);
        setFilteredReservations([]);
      }
    } finally {
      // Always clear loading states when done
      setIsLoading(false);
      setLoading(false);
    }
  };
  
  // Update the useEffect to avoid fetching on listing selection changes
  useEffect(() => {
    // Only load initial data if we have no reservations yet
    if (allReservations.length === 0 && listings && listings.length > 0) {
      console.log('Initial load - fetching all reservations');
      
      // First try to load from cache with specific key for "all"
      loadReservationsFromCache().then(hasCachedData => {
        if (!hasCachedData) {
          // No cached data, fetch fresh
          console.log('No cache data found, loading from API');
          setIsLoading(true);
          loadReservations();
        } else {
          console.log('Successfully loaded data from cache');
          // Make sure to apply any property filter if needed
          if (selectedListing !== 'all') {
            filterReservationsByProperty(selectedListing);
          }
        }
      });
    }
  }, [listings]); // Only depend on listings, not selectedListing
  
  // New effect to filter whenever allReservations or selectedListing changes
  useEffect(() => {
    // Only run if we have reservations and a selectedListing
    if (allReservations.length > 0 && selectedListing) {
      console.log('Applying filter after reservations or selected property changed');
      filterReservationsByProperty(selectedListing);
    }
  }, [allReservations, selectedListing]);
  
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
    try {
      setRefreshing(true);
      
      // First try to load from cache to show data immediately
      const loadedFromCache = await loadReservationsFromCache();
      
      // If we have cached data, it's already displayed
      if (loadedFromCache) {
        // Make sure we're not showing the loading indicator for cached data
        setIsLoading(false);
        
        // Schedule a background fetch after a short delay to let UI update with cache
        setTimeout(() => {
          loadReservations().finally(() => {
            // Once data is loaded, apply property filter if needed
            if (selectedListing !== 'all') {
              filterReservationsByProperty(selectedListing);
            }
            setRefreshing(false);
          });
        }, 100);
      } else {
        // No cached data, load normally but still avoid full screen blocker
        // by keeping refreshing true (which prevents the loading screen)
        await loadReservations();
        // Apply property filter if needed
        if (selectedListing !== 'all') {
          filterReservationsByProperty(selectedListing);
        }
        setRefreshing(false);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
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

  // Function to handle start date selection
  const handleStartDateSelect = (date) => {
    console.log(`Start date selected: ${date ? format(date, 'yyyy-MM-dd') : 'none'}`);
    setStartDate(date);
    // Apply filter for this specific date
    applyDateFilter(date);
  };

  // Function to handle end date selection
  const handleEndDateSelect = (date) => {
    console.log(`End date selected: ${date ? format(date, 'yyyy-MM-dd') : 'none'}`);
    setEndDate(date);
    // Currently we're filtering by just the start date
    // To support date ranges, we'd modify applyDateFilter to use both dates
  };

  // Function to reset all filters
  const resetFilters = () => {
    console.log('Resetting all filters');
    setStartDate(null);
    setEndDate(null);
    
    // Show all reservations for the current listing
    if (allReservations && allReservations.length > 0) {
      console.log('Resetting to cached reservations');
      
      // Apply property filter if needed
      if (selectedListing !== 'all') {
        const filtered = allReservations.filter(item => {
          const potentialIds = [
            item.listingMapId?.toString(),
            item.propertyId?.toString(), 
            item.listingId?.toString(),
            item.siteId?.toString()
          ].filter(Boolean);
          
          return potentialIds.some(id => id === selectedListing);
        });
        
        // Sort the filtered reservations
        if (sortBy === 'revenue') {
          filtered.sort((a, b) => Number(b.ownerPayout || 0) - Number(a.ownerPayout || 0));
        } else {
          filtered.sort((a, b) => new Date(a.arrivalDate || a.checkInDate) - new Date(b.arrivalDate || b.checkInDate));
        }
        
        setFilteredReservations(filtered);
      } else {
        // Just apply sorting to all reservations
        const sorted = [...allReservations];
        if (sortBy === 'revenue') {
          sorted.sort((a, b) => Number(b.ownerPayout || 0) - Number(a.ownerPayout || 0));
        } else {
          sorted.sort((a, b) => new Date(a.arrivalDate || a.checkInDate) - new Date(b.arrivalDate || b.checkInDate));
        }
        
        setFilteredReservations(sorted);
      }
    } else {
      // If no cached data, try to load from API
      loadReservations();
    }
    
    // Close date picker
    setShowDatePicker(false);
  };

  // Handle sort selection
  const handleSortSelect = (method) => {
    console.log(`Sorting by ${method}`);
    setSortBy(method);
    
    if (allReservations.length === 0) {
      console.log('No reservations to sort');
      return;
    }
    
    // First apply property and date filters
    let filtered = [...allReservations];
    
    // Apply property filter if applicable
    if (selectedListing !== 'all') {
      filtered = filtered.filter(item => {
        const potentialIds = [
          item.listingMapId?.toString(),
          item.propertyId?.toString(), 
          item.listingId?.toString(),
          item.siteId?.toString()
        ].filter(Boolean);
        
        return potentialIds.some(id => id === selectedListing);
      });
    }
    
    // Apply date filter if applicable
    if (startDate) {
      const filterDate = new Date(startDate.toDateString());
      filtered = filtered.filter(res => {
        try {
          const checkInDate = new Date(new Date(res.arrivalDate || res.checkInDate).toDateString());
          return checkInDate >= filterDate;
        } catch (e) {
          console.log('Error filtering date for reservation:', res.id);
          return false;
        }
      });
    }
    
    // Now apply the sort
    if (method === 'revenue') {
      filtered.sort((a, b) => {
        const aRevenue = Number(a.ownerPayout || 0);
        const bRevenue = Number(b.ownerPayout || 0);
        return bRevenue - aRevenue; // Highest first
      });
    } else {
      filtered.sort((a, b) => {
        const dateA = new Date(a.arrivalDate || a.checkInDate);
        const dateB = new Date(b.arrivalDate || b.checkInDate);
        return dateA - dateB; // Earliest first
      });
    }
    
    setFilteredReservations(filtered);
  };

  // Effect to save reservations to cache whenever they change
  useEffect(() => {
    if (allReservations && allReservations.length > 0) {
      console.log(`Reservations changed, saving ${allReservations.length} to cache`);
      saveReservationsToCache();
    }
  }, [allReservations]); // Only depend on allReservations changes

  if ((isLoading || authLoading) && !refreshing && !reservationsFromCache) {
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
      <View style={styles.filterRow}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.propertyFilterContainer}
        >
          {/* All Properties option */}
          <TouchableOpacity
            style={[
              styles.propertyFilterItem,
              selectedListing === 'all' && styles.selectedPropertyItem,
              { marginLeft: 4 } // Add a bit of margin at the start
            ]}
            onPress={() => handleListingSelect('all')}
          >
            <View style={[
              styles.propertyImageContainer, 
              { backgroundColor: selectedListing === 'all' ? GOLD.primary : GOLD.light },
              selectedListing === 'all' && { borderColor: GOLD.primary, borderWidth: 2 }
            ]}>
              <Icon 
                name="home" 
                size={18} 
                color={selectedListing === 'all' ? '#FFFFFF' : GOLD.primary} 
              />
            </View>
            <Text style={[
              styles.propertyFilterText,
              selectedListing === 'all' && { color: GOLD.primary, fontWeight: '600' }
            ]}>
              All Properties
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
                  isSelected && { borderColor: GOLD.primary, borderWidth: 2 }
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
                ]} numberOfLines={2} ellipsizeMode="tail">
                  {listing.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Add refresh button */}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={22} color={GOLD.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  // Render date picker with proper display of selected date
  const renderDatePicker = () => {
    if (!showDatePicker) return null;
    
    return (
      <View style={styles.datePickerContainer}>
        <View style={styles.datePickerHeader}>
          <Text style={styles.datePickerTitle}>Filter by Check-in Date</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
            <Icon name="close" size={22} color="#666" />
          </TouchableOpacity>
        </View>
        
        {/* Debug view to verify date state */}
        <View style={{padding: 8, backgroundColor: '#f5f5f5', marginBottom: 10, borderRadius: 4}}>
          <Text style={{fontSize: 12, color: '#666'}}>
            Current filter state: {startDate ? format(startDate, 'yyyy-MM-dd') : 'None'} 
          </Text>
        </View>
        
        <View style={styles.dateInputRow}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>Check-in Date</Text>
            <DateRangePicker 
              selectedDate={startDate}
              onDateChange={handleStartDateSelect}
              style={styles.datePicker}
            />
          </View>
        </View>
        
        {startDate && (
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateLabel}>Current filter:</Text>
            <Text style={styles.selectedDateValue}>
              {startDate ? format(startDate, 'MMM d, yyyy') : 'All dates'}
            </Text>
            <TouchableOpacity 
              style={styles.clearDateButton} 
              onPress={() => handleStartDateSelect(null)}
            >
              <Icon name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.datePickerHelper}>Only reservations with check-in dates on or after this date will be shown</Text>
        <View style={styles.datePickerActions}>
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={() => {
              handleStartDateSelect(null);
              setEndDate(null);
              setShowDatePicker(false);
            }}
          >
            <Text style={styles.resetButtonText}>Clear Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.applyButton, { backgroundColor: GOLD.primary }]} 
            onPress={() => {
              console.log("Apply button pressed with date:", startDate ? format(startDate, 'yyyy-MM-dd') : 'none');
              
              // Re-apply filter if date is set
              if (startDate) {
                applyDateFilter(startDate);
              }
              
              setShowDatePicker(false);
            }}
          >
            <Text style={styles.applyButtonText}>Apply Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render filter options
  const renderFilterOptions = () => {
    if (!showFilters) return null;
    
    return (
      <View style={styles.filtersContainer}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter Reservations</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Icon name="close" size={22} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.filterLabel}>Sort By</Text>
        <View style={styles.sortOptionsRow}>
          <TouchableOpacity 
            style={[
              styles.sortOption, 
              sortBy === 'date' && styles.selectedSortOption
            ]}
            onPress={() => handleSortSelect('date')}
          >
            <Text style={styles.sortOptionText}>Check-in Date</Text>
            {sortBy === 'date' && <Icon name="checkmark" size={18} color={GOLD.primary} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.sortOption, 
              sortBy === 'revenue' && styles.selectedSortOption
            ]}
            onPress={() => handleSortSelect('revenue')}
          >
            <Text style={styles.sortOptionText}>Revenue</Text>
            {sortBy === 'revenue' && <Icon name="checkmark" size={18} color={GOLD.primary} />}
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterActions}>
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.applyButton, { backgroundColor: GOLD.primary }]} 
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#FFFFFF' }]}>
      <StatusBar barStyle={theme?.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.header,
        { 
          height: headerHeight,
          opacity: headerOpacity,
          backgroundColor: theme?.background || '#FFFFFF',
          borderBottomWidth: 0,
          paddingTop: 0 // Remove extra padding at top
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
          {/* Sort Toggle Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: GOLD.light, marginRight: 8 }]}
            onPress={() => {
              // Force toggle - if date, switch to revenue, otherwise switch to date
              const newSortBy = sortBy === 'date' ? 'revenue' : 'date';
              console.log('SORT BUTTON PRESSED - toggling from', sortBy, 'to', newSortBy);
              handleSortSelect(newSortBy);
            }}
            disabled={loading} // Disable while sorting is in progress
          >
            <Icon name="swap-vertical" size={16} color={GOLD.primary} />
            <Text style={[styles.headerButtonText, { color: GOLD.primary }]}>
              {sortBy === 'date' ? 'Date' : 'Revenue'}
            </Text>
          </TouchableOpacity>
          
          {/* Filter Button */}
          {/* <TouchableOpacity
            style={[
              styles.headerButton, 
              { backgroundColor: GOLD.light },
              startDate && styles.activeFilterButton
            ]}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Icon name="calendar-outline" size={16} color={GOLD.primary} />
            <Text style={[styles.headerButtonText, { color: GOLD.primary }]}>
              {startDate ? 'Filtered' : 'Filter'}
            </Text>
          </TouchableOpacity> */}
        </View>
      </Animated.View>
      
      <View style={styles.contentContainer}>
        {/* Summary stats - commented out to maximize space */}
        {/* 
        <View style={styles.summaryContainer}>
          {financialTotals && (
            <>
              <SummaryCard title="Total Revenue" value={financialTotals.totalRevenue} theme={theme} icon="cash-outline" />
              <SummaryCard title="Reservations" value={filteredReservations.length} isCount={true} theme={theme} icon="calendar-outline" />
              <SummaryCard title="Avg. Per Stay" value={financialTotals.averageRevenue} theme={theme} icon="trending-up-outline" />
            </>
          )}
        </View>
        */}
        
        {/* Filter controls */}
        {renderPropertyFilters()}
        
        {/* Date Picker */}
        {renderDatePicker()}
        
        {/* Filter Options */}
        {renderFilterOptions()}
        
        {/* Reservations Table - Force remount with key */}
        <View style={styles.tableContainer}>
          {(isLoading && !reservationsFromCache) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={GOLD.primary} />
              <Text style={styles.loadingText}>Loading reservations...</Text>
            </View>
          ) : filteredReservations.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="calendar-outline" size={48} color={GOLD.primary} />
              <Text style={styles.emptyStateText}>No reservations match your filters</Text>
            </View>
          ) : (
            <>
              <ReservationsTable 
                key={`reservations-table-${sortBy}-${startDate ? format(startDate, 'yyyyMMdd') : 'all'}`}
                reservations={filteredReservations} 
                sortBy={sortBy}
                onRefresh={onRefresh}
                refreshing={refreshing}
                displayCurrency="USD"
                navigation={navigation}
                onRowPress={handleRowPress}
              />
              {console.log(`Rendering table with ${filteredReservations.length} reservations, sorted by ${sortBy}, date filter: ${startDate ? format(startDate, 'yyyy-MM-dd') : 'none'}`)}
              {console.log(`First reservation: ${filteredReservations[0]?.propertyName || 'N/A'}, ownerPayout: ${filteredReservations[0]?.ownerPayout || 'N/A'}, arrival: ${filteredReservations[0]?.arrivalDate ? format(new Date(filteredReservations[0].arrivalDate), 'yyyy-MM-dd') : 'N/A'}`)}
            </>
          )}
        </View>
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
    fontSize: 26,
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
    marginTop: 90,
  },
  quickFiltersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  propertyFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingBottom: 8,
  },
  propertyFilterItem: {
    alignItems: 'center',
    marginRight: 12,
    opacity: 0.8,
    minWidth: 65,
    maxWidth: 80,
    height: 66,
  },
  selectedPropertyItem: {
    opacity: 1,
  },
  propertyImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginBottom: 4,
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
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    height: 28,
    flexWrap: 'wrap',
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 90,
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
  tableContainer: {
    flex: 1,
    position: 'relative',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  miniLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    margin: 8,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  miniLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#777',
  },
  datePickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    margin: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  datePicker: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 8,
    flex: 1,
  },
  selectedSortOption: {
    borderColor: GOLD.primary,
    backgroundColor: GOLD.light,
  },
  sortOptionText: {
    fontSize: 14,
  },
  datePickerHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  selectedDateValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearDateButton: {
    padding: 4,
    marginLeft: 8,
  },
  activeFilterButton: {
    backgroundColor: GOLD.light,
  },
});

export default ReservationsScreen;
