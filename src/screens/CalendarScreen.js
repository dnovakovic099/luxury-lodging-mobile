import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Switch,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropertyPicker from '../components/PropertyPicker';
import { useAuth } from '../context/AuthContext';
import { getReservationsWithFinancialData } from '../services/api';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { saveToCache, loadFromCache, CACHE_KEYS } from '../utils/cacheUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCurrency } from '../utils/formatters';
import ReservationsTable from '../components/ReservationsTable';
import DateRangePicker from '../components/DateRangePicker';
import { theme as defaultTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { format, startOfDay, isSameDay, parseISO } from 'date-fns';

// Cache key for calendar bookings
const CALENDAR_BOOKINGS_CACHE = 'cache_calendar_bookings';
// Debug flag for cache logging
const DEBUG_CACHE = true; // Enable debug logs to diagnose property switching issues
// Debug flag for property changes
const DEBUG_PROPERTY_CHANGE = true;

// Flag to enable time zone handling for listing location
const USE_LISTING_TIMEZONE = true;
// Default timezone offset for most US listing locations (if exact timezone not available)
const DEFAULT_LISTING_TIMEZONE_OFFSET = -5 * 60; // -5 hours for EST in minutes

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_CELL_SIZE = Math.floor(SCREEN_WIDTH / 7);

// Colors for different channels
const CHANNEL_COLORS = {
  airbnb: '#FF385C',   // Red for Airbnb
  vrbo: '#3D89DE',     // Blue for VRBO
  luxurylodging: '#B6944C', // Gold for Luxury Lodging (changed from orange to gold)
  default: '#B6944C'   // Changed default to gold (instead of dark matte gold) for consistency
};

// Status values to include in the display - matches owner portal
const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

// Color for bookings
const BOOKING_COLOR = '#FF385C';

// Color for past bookings
const PAST_BOOKING_COLOR = '#9E9E9E'; // Grey color for past reservations

const CalendarScreen = ({ navigation }) => {
  // State for view toggle
  const [showCalendarView, setShowCalendarView] = useState(true);
  const { theme = defaultTheme } = useTheme();
  
  // Calendar state
  const { listings } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  // Add a ref to track property changes and prevent race conditions
  const propertyRef = useRef(null);
  const lastFetchRef = useRef({ property: null, timestamp: 0 });
  // Replace state with animated value for loading indicator height
  const loadingHeight = useRef(new Animated.Value(0)).current;
  
  // Reservations state
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Common state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [bookingsFromCache, setBookingsFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showTodayButton, setShowTodayButton] = useState(false);
  
  // Today's date for highlighting
  const today = new Date();

  // Memoize isSameDay for better performance - moved directly into component
  const memoizedIsSameDay = useCallback((date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  }, []);

  // Use effect to animate the loading indicator when isLoading changes
  useEffect(() => {
    if (isLoading) {
      // Animate loading indicator in
      Animated.timing(loadingHeight, {
        toValue: 40,
        duration: 300,
        useNativeDriver: false
      }).start();
    } else {
      // Animate loading indicator out
      Animated.timing(loadingHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false
      }).start();
    }
  }, [isLoading]);

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
      if (listing.listingImages && listing.listingImages[0]?.url) {
        imageUrl = listing.listingImages[0].url;
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

  // Scroll to current month when months load or loading completes
  useEffect(() => {
    if (!isLoading && allMonths.length > 0 && scrollViewRef.current && currentMonthIndex >= 0) {
      // Add a small delay to ensure the scrollview has rendered
      setTimeout(() => {
        // Scroll directly to month by index
        const monthHeight = 450; 
        scrollViewRef && scrollViewRef.current && scrollViewRef.current.scrollTo({ 
          y: currentMonthIndex * monthHeight, 
          animated: false 
        });
      }, 50);
    }
  }, [isLoading, allMonths, currentMonthIndex]);

  // Always scroll to current month when the screen becomes visible or when switching back to calendar view
  useEffect(() => {
    // Function to scroll to current month
    const scrollToCurrentMonth = () => {
      if (allMonths.length > 0 && scrollViewRef.current && currentMonthIndex >= 0) {
        // Direct scroll to month based on index - simpler and faster
        const monthHeight = 450;
        scrollViewRef.current.scrollTo({
          y: currentMonthIndex * monthHeight,
          animated: false
        });
      }
    };

    // Scroll when navigation focuses screen
    const unsubscribe = navigation.addListener('focus', scrollToCurrentMonth);
    
    // Also scroll when switching from reservations to calendar view
    if (showCalendarView && !isLoading) {
      scrollToCurrentMonth();
    }

    return unsubscribe;
  }, [navigation, isLoading, allMonths, currentMonthIndex, showCalendarView]);

  useEffect(() => {
    // Generate calendar months
    generateCalendarMonths();
  }, []);

  // Effect to fetch reservations when the selected property changes
  useEffect(() => {
    if (selectedProperty && allMonths.length > 0) {
      // Update the property ref to track current value
      propertyRef.current = selectedProperty;
      
      if (DEBUG_PROPERTY_CHANGE) console.log(`[Effect] Selected property changed to: ${selectedProperty}`);
      
      // If multiple rapid property changes occur, only process the most recent one
      const now = Date.now();
      if (now - lastFetchRef.current.timestamp < 300 && 
          lastFetchRef.current.property !== selectedProperty) {
        if (DEBUG_PROPERTY_CHANGE) console.log(`[Effect] Debouncing rapid property change to ${selectedProperty}`);
        lastFetchRef.current = { property: selectedProperty, timestamp: now };
        return;
      }
      
      lastFetchRef.current = { property: selectedProperty, timestamp: now };
      
      // First try to load from cache, then fetch from API
      loadBookingsFromCache().then(hasCachedData => {
        // Guard against property changing during async operation
        if (propertyRef.current !== selectedProperty) {
          if (DEBUG_CACHE) console.log(`[Cache] Property changed after cache load from ${selectedProperty} to ${propertyRef.current}, aborting follow-up actions`);
          return;
        }
        
        if (DEBUG_CACHE) console.log(`[Cache] Calendar cache load attempt for property ${selectedProperty}: ${hasCachedData ? 'Success' : 'Failed'}`);
        
        // If we didn't get valid cache, fetch fresh data
        if (!hasCachedData) {
          if (DEBUG_PROPERTY_CHANGE) console.log(`[Effect] No cache data found for property ${selectedProperty}, fetching from API`);
          fetchReservations();
        } else {
          // Ensure we're not in loading state when we have cached data
          setIsLoading(false);
          
          // Even with cached data, fetch fresh data in the background if it's potentially stale
          const potentiallyStaleCache = true; // Always refresh in background for now
          if (potentiallyStaleCache) {
            // Slight delay before triggering background fetch to ensure UI is responsive first
            if (DEBUG_PROPERTY_CHANGE) console.log(`[Effect] Scheduling background fetch for property ${selectedProperty} in 1500ms`);
            
            // Use a timeout but keep track of the property to ensure we don't load stale data
            const propertyAtSchedule = selectedProperty;
            setTimeout(() => {
              // Check if property has changed since scheduling this update
              if (propertyRef.current !== propertyAtSchedule) {
                if (DEBUG_CACHE) console.log(`[Cache] Cancelling background fetch because property changed from ${propertyAtSchedule} to ${propertyRef.current}`);
                return;
              }
              
              if (DEBUG_CACHE) console.log(`[Cache] Performing background fetch to refresh potentially stale data for property ${propertyAtSchedule}`);
              fetchReservations();
            }, 1500); // Increased delay to ensure UI has time to render cached data
          }
        }
      });
    }
  }, [selectedProperty, allMonths]);

  // Effect to save bookings to cache when they change
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      saveBookingsToCache();
    }
  }, [bookings]);

  const generateCalendarMonths = () => {
    const months = [];
    
    // Generate 13 months total (current month plus 6 before and 6 after)
    const currentDate = new Date(today);
    
    // Start with 6 months before current month
    const startDate = new Date(currentDate);
    startDate.setMonth(currentDate.getMonth() - 6);
    
    // Create array of consecutive months
    for (let i = 0; i < 13; i++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + i);
      
      months.push({
        date: monthDate,
        index: i
      });
    }
    
    // Find index of current month (should be 6 if everything works correctly)
    const currentMonthIndex = months.findIndex(
      month => month.date.getMonth() === currentDate.getMonth() && 
               month.date.getFullYear() === currentDate.getFullYear()
    );
    
    setCurrentMonthIndex(currentMonthIndex !== -1 ? currentMonthIndex : 6);
    setAllMonths(months.map(m => m.date));
  };

  // Function to safely parse dates
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    // Handle various date formats
    let date;
    try {
      date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateString}`);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error(`Error parsing date ${dateString}:`, error);
      return null;
    }
  };

  const fetchReservations = async () => {
    if (!selectedProperty) return;
    
    // Track request start time to identify overlapping requests
    const requestStartTime = Date.now();
    const requestProperty = selectedProperty;
    
    if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Starting fetch for property ${requestProperty} at ${requestStartTime}`);
    
    // Only show full page loading if we don't have cached data
    const shouldShowLoading = !bookingsFromCache;
    if (shouldShowLoading) {
      setIsLoading(true);
    }
    
    try {
      // Calculate date range for 6 months before and after
      const today = new Date();
      
      const startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 6);
      startDate.setDate(1); // First day of month
      
      const endDate = new Date(today);
      endDate.setMonth(today.getMonth() + 6);
      endDate.setDate(31); // Last possible day of month
      
      // Format dates for API
      const fromDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // Store property ID at the start of the request for later comparison
      const propertyAtStart = requestProperty;
      
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Before API call - propertyAtStart: ${propertyAtStart}, current: ${propertyRef.current}`);
      
      // Find the selected listing to get its timezone if available
      const selectedListing = listings?.find(listing => listing.id.toString() === propertyAtStart);
      // Get timezone offset from the listing or use default
      const listingTimezoneOffset = selectedListing?.timezoneOffset || DEFAULT_LISTING_TIMEZONE_OFFSET;
      
      // Prepare params for API call
      const params = {
        listingMapIds: [propertyAtStart],
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrival', // could be 'arrival' or 'departure'
        statuses: VALID_STATUSES
      };
      
      // Fetch reservations from API
      const result = await getReservationsWithFinancialData(params);
      
      const requestEndTime = Date.now();
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Received API response for property ${propertyAtStart} after ${requestEndTime - requestStartTime}ms`);
      
      // Make sure the property hasn't changed during the fetch
      if (propertyRef.current !== propertyAtStart) {
        console.log(`[API] ABORT: Property changed during fetch from ${propertyAtStart} to ${propertyRef.current}, ignoring results`);
        return;
      }
      
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Processing API results for property ${propertyAtStart}`);
      
      // Transform API data to our booking format with strict status and date filtering
      if (result?.reservations && Array.isArray(result.reservations)) {
        const transformedBookings = result.reservations
          .filter(res => {
            // Validate that we have both arrival and departure dates
            const hasArrival = !!res.arrivalDate || !!res.checkInDate;
            const hasDeparture = !!res.departureDate || !!res.checkOutDate;
            
            // Strict status check
            const hasValidStatus = VALID_STATUSES.includes(res.status);
            
            // Additional date range check - ensure the arrival date is within our window
            let isWithinDateRange = true;
            if (hasArrival) {
              const arrivalDate = new Date(res.arrivalDate || res.checkInDate);
              isWithinDateRange = arrivalDate >= startDate && arrivalDate <= endDate;
            }
            
            // Only include reservations with valid dates, status, and within date range
            return hasArrival && hasDeparture && hasValidStatus && isWithinDateRange;
          })
          .map(res => {
            // Get dates from reservation
            const arrivalDate = res.arrivalDate || res.checkInDate;
            const departureDate = res.departureDate || res.checkOutDate;
            
            if (!arrivalDate || !departureDate) {
              return null;
            }
            
            // Parse dates and properly handle timezone
            const startDate = new Date(arrivalDate);
            const endDate = new Date(departureDate);
            
            // Create a date that uses the listing's timezone instead of local timezone
            // This ensures the displayed date reflects the date at the listing location
            let adjustedStartDate;
            
            if (USE_LISTING_TIMEZONE) {
              // Handle timezone shift properly - get the date in the listing's timezone
              // Don't add an arbitrary day - instead calculate the actual date in the property's timezone
              adjustedStartDate = new Date(startDate);
              
              // Only apply timezone adjustment if timezone varies from the one used by the API
              const localOffset = new Date().getTimezoneOffset();
              const offsetDiff = localOffset - listingTimezoneOffset;
              
              if (offsetDiff !== 0) {
                // Apply the timezone difference to get the date as it appears at the listing location
                adjustedStartDate.setMinutes(adjustedStartDate.getMinutes() + offsetDiff);
              }
            } else {
              // Old behavior - add one day (keeping for backward compatibility but should not be used)
              adjustedStartDate = new Date(startDate);
              adjustedStartDate.setDate(adjustedStartDate.getDate() + 1);
            }
            
            // Validate dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return null;
            }
            
            // Determine the channel color using channelName
            let channelType = 'default';
            
            // Use a more efficient channel detection logic
            const lowerChannelName = res.channelName?.toLowerCase() || '';
            const lowerSourceType = res.sourceType?.toLowerCase() || '';
            const lowerSourceName = res.sourceName?.toLowerCase() || '';
            const lowerChannel = res.channel?.toLowerCase() || '';
            
            // Check for Airbnb in any of the fields
            if (lowerChannelName.includes('airbnb') || 
                lowerSourceType.includes('airbnb') || 
                lowerSourceName.includes('airbnb') || 
                lowerChannel.includes('airbnb')) {
              channelType = 'airbnb';
            }
            // Check for VRBO/Expedia in any of the fields
            else if (lowerChannelName.includes('vrbo') || lowerChannelName.includes('homeaway') || lowerChannelName.includes('expedia') ||
                    lowerSourceType.includes('vrbo') || lowerSourceType.includes('homeaway') || lowerSourceType.includes('expedia') ||
                    lowerSourceName.includes('vrbo') || lowerSourceName.includes('homeaway') || lowerSourceName.includes('expedia') ||
                    lowerChannel.includes('vrbo') || lowerChannel.includes('homeaway') || lowerChannel.includes('expedia')) {
              channelType = 'vrbo';
            }
            // Check for Luxury Lodging
            else if (lowerChannelName.includes('luxury') || 
                     lowerSourceType.includes('luxury') || 
                     lowerSourceName.includes('luxury') || 
                     lowerChannel.includes('luxury')) {
              channelType = 'luxurylodging';
            }
            
            // Use the appropriate color based on channel
            const bookingColor = CHANNEL_COLORS[channelType];
            
            // Create a streamlined booking object with only the essential fields
            // to reduce memory usage and improve performance
            return {
              id: res.id || res.reservationId,
              startDate: adjustedStartDate,
              endDate: endDate,
              guestName: res.guestName || res.guestFirstName || 'Guest',
              color: bookingColor,
              status: res.status,
              channel: channelType,
              channelName: res.channelName || '',
              
              // Essential guest information
              adults: res.adults || res.numberOfGuests || 1,
              infants: res.infants || 0,
              children: res.children || 0,
              nights: res.nights || 0,
              confirmationCode: res.confirmationCode || '',
              reservationDate: res.reservationDate || res.bookingDate || '',
              phone: res.phone || '',
              
              // Financial data - preserve ALL financial fields without transforming them
              ownerPayout: res.ownerPayout,
              baseRate: res.baseRate || res.airbnbListingBasePrice,
              cleaningFee: res.cleaningFee || res.airbnbListingCleaningFee,
              serviceFee: res.serviceFee,
              hostChannelFee: res.hostChannelFee,
              channelFee: res.channelFee,
              managementFee: res.managementFee,
              pmCommission: res.pmCommission,
              airbnbExpectedPayoutAmount: res.airbnbExpectedPayoutAmount,
              processingFee: res.processingFee || res.paymentProcessingFee,
              totalPrice: res.totalPrice,
              guestTotal: res.guestTotal,
              occupancyTaxes: res.occupancyTaxes,
              tourismTax: res.tourismTax,
              cityTax: res.cityTax,
              
              // Store complete financial data object rather than just a few fields
              financialData: res.financialData || null,
            };
          })
          .filter(booking => booking !== null);
        
        if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Setting ${transformedBookings.length} bookings for property ${propertyAtStart}`);
        setBookings(transformedBookings);
        
        // Save to cache after successful fetch
        if (transformedBookings.length > 0) {
          if (DEBUG_CACHE) console.log(`[Cache] Scheduling cache save for property ${propertyAtStart}`);
          setTimeout(() => saveBookingsToCache(), 10); // Slight delay to not block the UI
        }
      } else {
        // Handle no reservations or invalid response
        if (DEBUG_PROPERTY_CHANGE) console.log(`[API] No reservations found for property ${propertyAtStart}, setting empty bookings array`);
        setBookings([]);
      }
    } catch (error) {
      console.error(`[API] Error fetching reservations for property ${requestProperty}:`, error);
      
      // If we have no cached data or fetching failed, set empty bookings
      if (!bookingsFromCache) {
        if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Error case - setting empty bookings for property ${requestProperty}`);
        setBookings([]);
      }
    } finally {
      // Always set loading to false when fetch completes
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API] Fetch completed for property ${requestProperty}, setting isLoading to false`);
      setIsLoading(false);
    }
  };

  // Function to refresh bookings data
  const refreshBookings = async () => {
    try {
      // Signal refresh is happening, but don't block UI with full loading
      setRefreshing(true);
      
      // First try to load from cache to show data immediately
      const loadedFromCache = await loadBookingsFromCache();
      
      // If we have cached data, it's already displayed thanks to the loadBookingsFromCache function
      if (loadedFromCache) {
        // Just fetch fresh data in background after a small delay to let UI update with cache
        setTimeout(() => {
          // When fetching with cached data, don't show loading indicators
          fetchReservations().finally(() => {
            setRefreshing(false);
          });
        }, 100);
      } else {
        // No cached data, fetch normally but maintain mini loading indicator
        await fetchReservations();
        setRefreshing(false);
      }
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      setRefreshing(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    if (DEBUG_PROPERTY_CHANGE) console.log(`[Property Change] Switching to property: ${propertyId}`);
    
    // Reset cached state when property changes
    setBookingsFromCache(false);
    setSelectedProperty(propertyId);
    
    // For calendar view, reset loading and fetch new data
    if (showCalendarView) {
      setIsLoading(true);
      if (DEBUG_PROPERTY_CHANGE) console.log(`[Property Change] Calendar view - calling fetchReservations for property: ${propertyId}`);
      fetchReservations();
    } else {
      // For reservation view, also refresh the reservations
      setIsLoading(true);
      if (DEBUG_PROPERTY_CHANGE) console.log(`[Property Change] Reservation view - calling fetchReservationsForTable for property: ${propertyId}`);
      fetchReservationsForTable();
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null); // Empty spots for days before the 1st
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Replace existing isSameDay function with memoized version
  const isSameDay = memoizedIsSameDay;

  // Check if a date is in the past
  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time portion for accurate comparison
    return date < today;
  };

  // Check if date falls within a booking
  const getBookingForDate = (date) => {
    if (!date || !bookings || !Array.isArray(bookings)) return null;
    
    try {
      // Find the selected listing to get its timezone if available
      const selectedListing = listings?.find(listing => listing.id.toString() === selectedProperty);
      // Get timezone offset from the listing or use default
      const listingTimezoneOffset = selectedListing?.timezoneOffset || DEFAULT_LISTING_TIMEZONE_OFFSET;
      
      // Convert the date to midnight for comparison
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // If timezone handling is enabled, adjust the target date to the listing's timezone
      if (USE_LISTING_TIMEZONE) {
        const localOffset = new Date().getTimezoneOffset();
        const offsetDiff = localOffset - listingTimezoneOffset;
        
        if (offsetDiff !== 0) {
          // No need to adjust the target date since it's already in local time
          // We'll adjust the booking dates instead when comparing
        }
      }
      
      const targetTime = targetDate.getTime();
      
      // Find all bookings that include this date, then sort them so we prioritize display
      const matchingBookings = bookings.filter(booking => {
        if (!booking || !booking.startDate || !booking.endDate) return false;
        
        // Double-check that this booking has a valid status
        if (!booking.status || !VALID_STATUSES.includes(booking.status)) {
          return false;
        }
        
        // Create dates at midnight for comparison - these are already adjusted for timezone in fetchReservations
        const bookingStart = new Date(
          booking.startDate.getFullYear(), 
          booking.startDate.getMonth(), 
          booking.startDate.getDate()
        );
        
        const bookingEnd = new Date(
          booking.endDate.getFullYear(), 
          booking.endDate.getMonth(), 
          booking.endDate.getDate()
        );
        
        const startTime = bookingStart.getTime();
        const endTime = bookingEnd.getTime();
        
        // Check if targetDate is within booking range (inclusive)
        const isInRange = targetTime >= startTime && targetTime <= endTime;
        
        return isInRange;
      });
      
      // If we have multiple bookings, prioritize them based on channel type
      if (matchingBookings.length > 1) {
        // Sort by channel - prioritize Airbnb, then VRBO, then others
        return matchingBookings.sort((a, b) => {
          if (a.channel === 'airbnb' && b.channel !== 'airbnb') return -1;
          if (a.channel !== 'airbnb' && b.channel === 'airbnb') return 1;
          if (a.channel === 'vrbo' && b.channel !== 'vrbo') return -1;
          if (a.channel !== 'vrbo' && b.channel === 'vrbo') return 1;
          return 0;
        })[0];
      }
      
      return matchingBookings.length > 0 ? matchingBookings[0] : null;
    } catch (error) {
      console.error('Error in getBookingForDate:', error);
      return null;
    }
  };

  // Determine booking segment type (start, middle, end, single)
  const getBookingSegmentType = (date, booking) => {
    if (!date || !booking || !booking.startDate || !booking.endDate) return null;
    
    try {
      // Create dates at midnight for comparison
      const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // These booking dates have already been adjusted for timezone in the fetchReservations function
      // So we only need to extract the date components without further adjustment
      const startDate = new Date(
        booking.startDate.getFullYear(),
        booking.startDate.getMonth(), 
        booking.startDate.getDate()
      );
      
      const endDate = new Date(
        booking.endDate.getFullYear(),
        booking.endDate.getMonth(),
        booking.endDate.getDate()
      );
      
      // Check if booking is just one day
      if (startDate.getTime() === endDate.getTime()) {
        return 'single';
      }
      
      // Check if this is the start, middle, or end date
      if (currentDate.getTime() === startDate.getTime()) {
        return 'start';
      } else if (currentDate.getTime() === endDate.getTime()) {
        return 'end';
      } else {
        return 'middle';
      }
    } catch (error) {
      console.error('Error in getBookingSegmentType:', error);
      return null;
    }
  };

  // Calculate booking length (nights)
  const getBookingLengthInDays = (booking) => {
    if (!booking || !booking.startDate || !booking.endDate) return 0;
    
    try {
      const startDate = new Date(
        booking.startDate.getFullYear(),
        booking.startDate.getMonth(),
        booking.startDate.getDate()
      );
      
      const endDate = new Date(
        booking.endDate.getFullYear(),
        booking.endDate.getMonth(),
        booking.endDate.getDate()
      );
      
      // Calculate days between (inclusive of end date)
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return diffDays;
    } catch (error) {
      console.error('Error calculating booking length:', error);
      return 0;
    }
  };

  // Format currency for display
  const formatMoney = (amount) => {
    if (!amount || isNaN(amount)) return '$0';
    
    try {
      // Using the formatCurrency utility
      return formatCurrency(amount);
    } catch (error) {
      // Fallback to basic formatting
      return '$' + parseInt(amount).toLocaleString();
    }
  };

  // Calculate total revenue for a specific month
  const calculateMonthlyRevenue = (monthDate) => {
    if (!bookings || !Array.isArray(bookings)) return 0;
    
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    // Filter bookings that start in this month
    const monthBookings = bookings.filter(booking => {
      if (!booking || !booking.startDate) return false;
      
      return booking.startDate.getFullYear() === year && 
             booking.startDate.getMonth() === month;
    });
    
    // Sum the owner payouts
    const total = monthBookings.reduce((sum, booking) => {
      const payout = parseFloat(booking.ownerPayout || 0);
      return sum + (isNaN(payout) ? 0 : payout);
    }, 0);
    
    return total;
  };

  // Optimize renderDay for better performance
  const renderDay = React.useMemo(() => (date, month) => {
    if (!date) return <View style={styles.emptyDay} />;
    
    const dayNum = date.getDate();
    const booking = getBookingForDate(date);
    const segmentType = booking ? getBookingSegmentType(date, booking) : null;
    
    // Check if this date is today
    const isToday = isSameDay(date, today);
    
    // Check if this is a past date
    const isPast = isPastDate(date);
    
    // Only show guest name and initial on the first day of booking
    const isFirstDay = segmentType === 'start' || segmentType === 'single';
    
    // Prepare guest name and initial
    let guestInitial = 'G';
    let guestName = 'Guest';
    
    // Calculate booking length for short stay check
    const bookingLength = booking ? getBookingLengthInDays(booking) : 0;
    const isShortStay = bookingLength <= 3; // 3 days or less is a short stay
    
    // Get owner payout amount if available
    const ownerPayout = booking && booking.ownerPayout ? formatMoney(booking.ownerPayout) : null;
    
    if (booking && booking.guestName) {
      const trimmedName = booking.guestName.trim();
      if (trimmedName.length > 0) {
        // Extract first name by splitting on space and taking the first part
        const firstName = trimmedName.split(' ')[0];
        guestInitial = firstName.charAt(0).toUpperCase();
        guestName = firstName; // Use only the first name
      }
    }
    
    // Check if this is a Luxury Lodging booking
    const isLuxuryLodging = booking && 
      (booking.channelName?.toLowerCase().includes('luxury') || 
       booking.channel === 'luxurylodging');
    
    // Determine booking color (grey for past reservations unless it's Luxury Lodging)
    const bookingColor = booking ? 
      (isPast && !isLuxuryLodging ? PAST_BOOKING_COLOR : booking.color) : null;
    
    // Create cell content
    const cellContent = (
      <>
        <Text style={[
          styles.dayNumber, 
          isToday && styles.todayNumber
        ]}>
          {dayNum}
        </Text>
        
        {isToday && <View style={styles.todayIndicator} />}
        
        {booking && segmentType && (
          <View 
            style={[
              styles.bookingIndicator, 
              styles[`booking${segmentType.charAt(0).toUpperCase() + segmentType.slice(1)}`],
              { backgroundColor: bookingColor }
            ]}
          >
            {isFirstDay && (
              <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>{guestInitial}</Text>
              </View>
            )}
          </View>
        )}
      </>
    );
    
    return (
      <View style={styles.dayCellContainer}>
        <TouchableOpacity 
          style={[
            styles.dayCell,
            isToday && styles.todayCell
          ]}
          onPress={() => booking && handleBookingClick(booking)}
          disabled={!booking}
        >
          {cellContent}
        </TouchableOpacity>
        
        {/* Display amount for all reservations using the short-stay style */}
        {booking && isFirstDay && ownerPayout && (
          <View style={styles.amountOnlyOverlay}>
            <Text style={styles.amountOnlyText}>{ownerPayout}</Text>
          </View>
        )}
      </View>
    );
  }, [bookings, selectedProperty, today]);

  const renderMonthCalendar = (monthDate) => {
    const days = getDaysInMonth(monthDate);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    
    // Calculate the total revenue for this month
    const monthlyTotal = calculateMonthlyRevenue(monthDate);

    return (
      <View style={styles.monthContainer}>
        <View style={styles.monthHeaderRow}>
          <Text style={styles.monthTitle}>{monthName} {year}</Text>
          <Text style={styles.monthTotal}>{formatMoney(monthlyTotal)}</Text>
        </View>
        
        <View style={styles.calendarHeader}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={styles.dayHeader}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {days.map((date, index) => (
            <React.Fragment key={index}>
              {renderDay(date, monthDate.getMonth())}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Find the selected property data
  const selectedPropertyData = formattedListings.find(p => p.id === selectedProperty) || formattedListings[0];

  // Optimize bookings processing by reducing unnecessary operations
  const loadBookingsFromCache = async () => {
    try {
      // Store the property at the start of the operation
      const propertyAtStart = selectedProperty;
      
      // Create a cache key that includes the property id
      const cacheKey = `${CALENDAR_BOOKINGS_CACHE}_${propertyAtStart}`;
      
      if (DEBUG_CACHE) console.log(`[Cache] Attempting to load cache for property ${propertyAtStart}, key: ${cacheKey}`);
      
      // Get the data in a single operation
      const cachedBookings = await loadFromCache(cacheKey);
      
      // Check if the property changed during cache load
      if (propertyRef.current !== propertyAtStart) {
        if (DEBUG_CACHE) console.log(`[Cache] ABORT: Property changed during cache load from ${propertyAtStart} to ${propertyRef.current}`);
        return false;
      }
      
      if (!cachedBookings || !Array.isArray(cachedBookings) || cachedBookings.length === 0) {
        if (DEBUG_CACHE) console.log(`[Cache] No valid cache found for property ${propertyAtStart}`);
        return false;
      }
      
      if (DEBUG_CACHE) console.log(`[Cache] Found ${cachedBookings.length} cached bookings for property ${propertyAtStart}`);
      
      // Find the selected listing to get its timezone if available
      const selectedListing = listings?.find(listing => listing.id.toString() === propertyAtStart);
      // Get timezone offset from the listing or use default
      const listingTimezoneOffset = selectedListing?.timezoneOffset || DEFAULT_LISTING_TIMEZONE_OFFSET;
      
      // Convert all date strings to Date objects in a single pass
      const fixedBookings = cachedBookings.map(booking => {
        // Create date objects from strings
        const startDate = booking.startDate ? new Date(booking.startDate) : null;
        const endDate = booking.endDate ? new Date(booking.endDate) : null;
        
        // If timezone handling is enabled, apply the listing timezone offset
        if (USE_LISTING_TIMEZONE && startDate) {
          // Only apply timezone adjustment if timezone varies from the one used by the API
          const localOffset = new Date().getTimezoneOffset();
          const offsetDiff = localOffset - listingTimezoneOffset;
          
          if (offsetDiff !== 0) {
            // Apply the timezone difference to get the date as it appears at the listing location
            startDate.setMinutes(startDate.getMinutes() + offsetDiff);
          }
        }
        
        return {
          ...booking,
          startDate,
          endDate
        };
      });
      
      // Validate that we have proper date objects
      const hasValidBookings = fixedBookings.some(booking => 
        booking.startDate instanceof Date && 
        booking.endDate instanceof Date &&
        !isNaN(booking.startDate.getTime()) &&
        !isNaN(booking.endDate.getTime())
      );
      
      if (!hasValidBookings) {
        if (DEBUG_CACHE) console.log(`[Cache] Invalid date objects in cached bookings for property ${propertyAtStart}`);
        return false;
      }
      
      // Check again if property changed during processing
      if (propertyRef.current !== propertyAtStart) {
        if (DEBUG_CACHE) console.log(`[Cache] ABORT: Property changed during cache processing from ${propertyAtStart} to ${propertyRef.current}`);
        return false;
      }
      
      // Critical: First set not loading, then update bookings state
      // This ensures the UI updates with cached data before any potential re-renders
      if (DEBUG_CACHE) console.log(`[Cache] Setting valid cache data for property ${propertyAtStart}, count: ${fixedBookings.length}`);
      setIsLoading(false);
      setBookingsFromCache(true);
      
      // Update state with cached bookings immediately
      setBookings(fixedBookings);
      
      return true;
    } catch (error) {
      console.error('Error loading bookings from cache:', error);
      return false;
    }
  };
  
  // Optimize saving bookings to cache
  const saveBookingsToCache = async () => {
    try {
      if (!selectedProperty || !bookings || !Array.isArray(bookings) || bookings.length === 0) {
        return;
      }
      
      // Capture the property at the start of the operation
      const propertyAtStart = selectedProperty;
      
      // Create a cache key that includes the property id
      const cacheKey = `${CALENDAR_BOOKINGS_CACHE}_${propertyAtStart}`;
      
      if (DEBUG_CACHE) console.log(`[Cache] Saving ${bookings.length} bookings to cache for property ${propertyAtStart}`);
      
      // Save to cache with the proper key
      await saveToCache(cacheKey, bookings);
      
      // Check if property changed during the save operation
      if (propertyRef.current !== propertyAtStart) {
        if (DEBUG_CACHE) console.log(`[Cache] Property changed during cache save from ${propertyAtStart} to ${propertyRef.current} - cache might be stale`);
      } else {
        if (DEBUG_CACHE) console.log(`[Cache] Successfully saved bookings to cache for property ${propertyAtStart}`);
      }
    } catch (error) {
      console.error('Error saving bookings to cache:', error);
    }
  };

  // Handle booking click to show reservation details
  const handleBookingClick = (booking) => {
    if (!booking) return;
    
    // Process financial data properly - similar to ReservationsScreen approach
    const extractFinancialData = () => {
      // Check for nested financial data
      const financialData = booking.financialData || {};
      
      // Process various fee fields
      return {
        // Base rate
        baseRate: parseFloat(booking.baseRate || financialData.baseRate || 0),
        
        // Cleaning fee
        cleaningFee: parseFloat(booking.cleaningFee || financialData.cleaningFeeValue || 0),
        
        // Processing fee
        processingFee: parseFloat(
          financialData.PaymentProcessing || 
          financialData.paymentProcessing || 
          booking.paymentProcessingFee || 
          booking.processingFee || 
          0
        ),
        
        // Channel fee
        channelFee: parseFloat(
          booking.channelFee || 
          booking.hostChannelFee ||
          booking.VRBOChannelFee ||
          financialData.channelFee || 
          financialData.hostChannelFee ||
          financialData.VRBOChannelFee ||
          0
        ),
        
        // Management fee
        managementFee: parseFloat(
          booking.pmCommission || 
          booking.managementFee || 
          financialData.pmCommission || 
          financialData.managementFee || 
          financialData.managementFeeAirbnb || 
          0
        ),
        
        // Owner payout
        ownerPayout: parseFloat(booking.ownerPayout || booking.airbnbExpectedPayoutAmount || 0),
        
        // Total price
        totalPrice: parseFloat(booking.guestTotal || booking.totalPrice || 0)
      };
    };
    
    const financials = extractFinancialData();
    
    // Create a reservation object mapping the API response to our modal fields
    const reservation = {
      id: booking.id,
      // Guest information
      guestName: booking.guestName || booking.guestFirstName + ' ' + booking.guestLastName || 'Guest',
      guestFirstName: booking.guestFirstName,
      guestLastName: booking.guestLastName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.phone,
      guestPicture: booking.guestPicture,
      
      // Property information
      propertyLocation: selectedPropertyData?.location || selectedPropertyData?.city || 
                       (selectedPropertyData?.name?.split('-')?.[0]?.trim()) || 'Property',
      propertyName: booking.listingName || selectedPropertyData?.name || 'Property',
      propertyDescription: selectedPropertyData?.description || '',
      
      // Reservation dates
      arrivalDate: booking.startDate || new Date(booking.arrivalDate),
      departureDate: booking.endDate || new Date(booking.departureDate),
      bookingDate: new Date(booking.reservationDate || Date.now()),
      
      // Guest counts
      adultCount: booking.adults || booking.numberOfGuests || 1,
      infantCount: booking.infants || 0,
      childrenCount: booking.children || 0,
      
      // Booking details
      confirmationCode: booking.confirmationCode || booking.channelReservationId || 'N/A',
      cancellationPolicy: booking.airbnbCancellationPolicy || booking.cancellationPolicy || 'Standard',
      phoneNumber: booking.phone || null,
      nights: booking.nights || calculateBookingLength(booking),
      
      // Financial data - use extracted financial values
      baseRate: financials.baseRate,
      cleaningFee: financials.cleaningFee,
      processingFee: financials.processingFee,
      channelFee: financials.channelFee,
      managementFee: financials.managementFee,
      hostPayout: financials.ownerPayout,
      
      // Additional financial fields for guest paid section
      nightlyRate: financials.baseRate / (booking.nights || 1),
      serviceFee: financials.channelFee,
      occupancyTaxes: parseFloat(booking.occupancyTaxes || booking.tourismTax || booking.cityTax || 0),
      guestTotal: financials.totalPrice,
      
      // Original fields to preserve compatibility
      ownerPayout: booking.ownerPayout,
      airbnbExpectedPayoutAmount: booking.airbnbExpectedPayoutAmount,
      channelName: booking.channelName || '',
      channel: booking.channel || '',
      status: booking.status || '',
      paymentStatus: booking.paymentStatus || '',
      
      // Raw financial data
      financialData: booking.financialData || null,
    };
    
    // Set the selected reservation and show the modal
    setSelectedReservation(reservation);
    setModalVisible(true);
  };

  // Create a function to calculate booking length in days
  const calculateBookingLength = (booking) => {
    if (!booking || !booking.startDate || !booking.endDate) return 1;
    
    const startDate = new Date(
      booking.startDate.getFullYear(),
      booking.startDate.getMonth(),
      booking.startDate.getDate()
    );
    
    const endDate = new Date(
      booking.endDate.getFullYear(),
      booking.endDate.getMonth(),
      booking.endDate.getDate()
    );
    
    // Calculate difference in days
    const differenceInTime = endDate.getTime() - startDate.getTime();
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    
    // Return at least 1 day (for same-day bookings)
    return Math.max(1, differenceInDays + 1);
  };

  // Function to jump to a specific month
  const jumpToMonth = (index) => {
    if (index >= 0 && index < allMonths.length && scrollViewRef.current) {
      // Calculate position based on month height
      const monthHeight = 450;
      scrollViewRef.current.scrollTo({
        y: index * monthHeight,
        animated: true
      });
      setMonthPickerVisible(false);
    }
  };

  // Function to scroll back to today's month
  const scrollToToday = () => {
    if (currentMonthIndex >= 0 && scrollViewRef.current) {
      const monthHeight = 450;
      scrollViewRef.current.scrollTo({
        y: currentMonthIndex * monthHeight,
        animated: true
      });
      setShowTodayButton(false);
    }
  };

  // Function to check if user has scrolled away from current month
  const handleScroll = (event) => {
    if (!allMonths.length || currentMonthIndex < 0) return;
    
    const scrollY = event.nativeEvent.contentOffset.y;
    const monthHeight = 450;
    const currentScrollMonth = Math.round(scrollY / monthHeight);
    
    // Show "Today" button if not viewing current month
    const isViewingCurrentMonth = Math.abs(currentScrollMonth - currentMonthIndex) <= 0;
    setShowTodayButton(!isViewingCurrentMonth);
  };

  // Function to fetch reservations for table view
  const fetchReservationsForTable = async () => {
    if (!selectedProperty) return;
    
    // Track request start time to identify overlapping requests
    const requestStartTime = Date.now();
    const requestProperty = selectedProperty;
    
    if (DEBUG_PROPERTY_CHANGE) console.log(`[API-Table] Starting fetch for reservations table, property ${requestProperty} at ${requestStartTime}`);
    
    // Only show full loading on initial load - use more subtle loading for refreshes
    const isInitialLoad = !filteredReservations || filteredReservations.length === 0;
    
    // Set loading but keep existing data visible
    setIsLoading(true);
    setRefreshing(true);
    
    try {
      // Calculate date range for 6 months before and after
      const today = new Date();
      
      const startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 6);
      startDate.setDate(1);
      
      const endDate = new Date(today);
      endDate.setMonth(today.getMonth() + 6);
      endDate.setDate(31);
      
      // Format dates for API
      const fromDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // Store property ID at the start of the request for later comparison
      const propertyAtStart = requestProperty;
      
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API-Table] Before API call - propertyAtStart: ${propertyAtStart}, current: ${propertyRef.current}`);
      
      // Prepare params for API call
      const params = {
        listingMapIds: [propertyAtStart],
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrival',
        statuses: VALID_STATUSES
      };
      
      // Fetch reservations from API
      const result = await getReservationsWithFinancialData(params);
      
      const requestEndTime = Date.now();
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API-Table] Received API response for property ${propertyAtStart} after ${requestEndTime - requestStartTime}ms`);
      
      // Make sure the property hasn't changed during the fetch
      if (propertyRef.current !== propertyAtStart) {
        console.log(`[API-Table] ABORT: Property changed during fetch from ${propertyAtStart} to ${propertyRef.current}, ignoring results`);
        return;
      }
      
      if (DEBUG_PROPERTY_CHANGE) console.log(`[API-Table] Processing API results for property ${propertyAtStart}`);
      
      if (result?.reservations && Array.isArray(result.reservations)) {
        // Filter reservations using the same logic as calendar view
        const filteredReservations = result.reservations.filter(res => {
          // Validate that we have both arrival and departure dates
          const hasArrival = !!res.arrivalDate || !!res.checkInDate;
          const hasDeparture = !!res.departureDate || !!res.checkOutDate;
          
          // Strict status check
          const hasValidStatus = VALID_STATUSES.includes(res.status);
          
          // Only include reservations with valid dates and status
          return hasArrival && hasDeparture && hasValidStatus;
        });
        
        if (DEBUG_PROPERTY_CHANGE) console.log(`[API-Table] Setting ${filteredReservations.length} reservations for property ${propertyAtStart}`);
        
        // Use setTimeout to create a smoother visual transition
        setTimeout(() => {
          if (propertyRef.current === propertyAtStart) {
            setReservations(filteredReservations);
            // Apply initial sort when loading data
            setFilteredReservations(sortReservations(filteredReservations, sortBy));
            setIsLoading(false);
            setRefreshing(false);
          }
        }, isInitialLoad ? 300 : 150); // Longer delay for initial load, shorter for refreshes
      } else {
        if (DEBUG_PROPERTY_CHANGE) console.log(`[API-Table] No valid reservations found for property ${propertyAtStart}, setting empty arrays`);
        
        // Use setTimeout for smoother transition
        setTimeout(() => {
          if (propertyRef.current === propertyAtStart) {
            setReservations([]);
            setFilteredReservations([]);
            setIsLoading(false);
            setRefreshing(false);
          }
        }, isInitialLoad ? 300 : 150);
      }
    } catch (error) {
      console.error(`[API-Table] Error fetching reservations for property ${requestProperty}:`, error);
      
      // Use setTimeout for smoother transition
      setTimeout(() => {
        if (propertyRef.current === requestProperty) {
          setReservations([]);
          setFilteredReservations([]);
          setIsLoading(false);
          setRefreshing(false);
        }
      }, 300);
    }
  };

  // Effect to load reservations when switching to table view
  useEffect(() => {
    if (!showCalendarView && selectedProperty) {
      if (DEBUG_PROPERTY_CHANGE) console.log(`[Effect-Table] Loading reservations for table view, property: ${selectedProperty}`);
      
      // Store property at the time of scheduling fetch
      const propertyAtSchedule = selectedProperty;
      
      // Small timeout to ensure we don't have rapid changes
      setTimeout(() => {
        // Check if property changed since scheduling
        if (propertyRef.current !== propertyAtSchedule) {
          if (DEBUG_PROPERTY_CHANGE) console.log(`[Effect-Table] Cancelling fetch because property changed from ${propertyAtSchedule} to ${propertyRef.current}`);
          return;
        }
        
        fetchReservationsForTable();
      }, 50);
    }
  }, [showCalendarView, selectedProperty]);

  // Update the useEffect to also trigger on sortBy changes but with race condition protection
  useEffect(() => {
    if (!showCalendarView && reservations.length) {
      if (DEBUG_PROPERTY_CHANGE) console.log(`[Filter-Table] Applying filters for property ${selectedProperty}, filter criteria changed`);
      
      // Capture current property 
      const propertyAtFilter = selectedProperty;
      
      // Use timeout to prevent rapid filter operations
      setTimeout(() => {
        // Only proceed if property hasn't changed
        if (propertyRef.current !== propertyAtFilter) {
          if (DEBUG_PROPERTY_CHANGE) console.log(`[Filter-Table] Aborting filter application because property changed from ${propertyAtFilter} to ${propertyRef.current}`);
          return;
        }
        
        const filtered = filterReservationsByDate(startDate, endDate);
        setFilteredReservations(filtered);
      }, 10);
    }
  }, [startDate, endDate, reservations, showCalendarView, sortBy]);

  // Add a function to calculate scroll position that centers on today's date
  const calculateCenteredScrollPosition = () => {
    if (allMonths.length === 0 || currentMonthIndex < 0) return 0;
    
    // Constants for calculation
    const monthHeight = 450;
    const screenHeight = Dimensions.get('window').height - 200; // Approximate visible area
    
    // Base position for the current month
    let basePosition = currentMonthIndex * monthHeight;
    
    // Calculate day offset within the month (to scroll proportionally)
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Calculate how far into the month we are (0-1 value)
    const monthProgress = (currentDay - 1) / daysInMonth;
    
    // Add offset based on day position in month
    // This will scroll further down if the date is later in the month
    const dayOffset = monthHeight * monthProgress;
    
    // Calculate final position that centers today's date
    // Subtract half of screen height to center
    let scrollPosition = basePosition + dayOffset - (screenHeight / 2);
    
    // Don't allow negative scroll position
    return Math.max(0, scrollPosition);
  };

  // Update handleViewChange function to use direct month scrolling instead of centered positioning
  const handleViewChange = (showCalendar) => {
    // If switching to calendar and we're currently in reservations view
    if (showCalendar && !showCalendarView) {
      // Set loading state before view change to show transition
      if (propertyRef.current) {
        setCalendarLoading(true);
      }
      
      // Update state first
      setShowCalendarView(true);
      
      // Wait for render cycle to complete
      setTimeout(() => {
        if (propertyRef.current) {
          // Scroll directly to the current month by index
          if (allMonths.length > 0 && scrollViewRef.current && currentMonthIndex >= 0) {
            const monthHeight = 450;
            scrollViewRef.current.scrollTo({
              y: currentMonthIndex * monthHeight,
              animated: false
            });
          }
          
          // Clear loading state after a short delay
          setTimeout(() => {
            setCalendarLoading(false);
          }, 300);
        }
      }, 50); // Reduced timeout to 50ms
    } else if (!showCalendar && showCalendarView) {
      // For switching to reservations, refresh the reservations data with current property
      setShowCalendarView(showCalendar);
      
      // Capture current property for the scheduled operation
      const propertyAtSwitch = selectedProperty;
      
      // Show loading state right away - will be visible in the reservations view
      setIsLoading(true);
      
      // Ensure we refetch reservations with the current property selection
      setTimeout(() => {
        // Check if property changed during the view transition
        if (propertyRef.current !== propertyAtSwitch) {
          if (DEBUG_PROPERTY_CHANGE) console.log(`[View Change] Property changed during view transition from ${propertyAtSwitch} to ${propertyRef.current}`);
          // Property changed, the useEffect will trigger a fetch with the new property
          return;
        }
        
        if (DEBUG_PROPERTY_CHANGE) console.log(`[View Change] Fetching reservations after view change to table for property ${propertyAtSwitch}`);
        fetchReservationsForTable();
      }, 50);
    } else {
      // For any other case, just update the view state
      setShowCalendarView(showCalendar);
    }
  };

  // Update the filterReservationsByDate function to track current property
  const filterReservationsByDate = (start, end) => {
    if (!reservations.length) return [];
    
    // Capture property at time of filtering
    const propertyAtFilter = selectedProperty;
    
    if (DEBUG_PROPERTY_CHANGE) console.log(`[Filter] Filtering reservations by date for property ${propertyAtFilter}`);
    
    // First filter by date
    let filtered = reservations.filter(reservation => {
      if (!reservation.arrivalDate && !reservation.checkInDate) return false;
      
      // Get the arrival date value
      const arrivalDateValue = reservation.arrivalDate || reservation.checkInDate;
      
      // Convert arrival date to string format for consistent comparison
      let arrivalDateStr;
      
      if (arrivalDateValue instanceof Date) {
        // For Date objects, use UTC date parts to create the string
        arrivalDateStr = format(arrivalDateValue, 'yyyy-MM-dd');
      } else if (typeof arrivalDateValue === 'string') {
        // For strings like "2025-04-27", preserve the date exactly as is without timezone conversion
        // Test if it's a YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(arrivalDateValue)) {
          // If already in YYYY-MM-DD format, use directly
          arrivalDateStr = arrivalDateValue;
        } else {
          // Try to extract the correct date parts using parseISO
          try {
            const parsedDate = parseISO(arrivalDateValue);
            // Use UTC components to avoid timezone shifts
            const year = parsedDate.getUTCFullYear();
            const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getUTCDate()).padStart(2, '0');
            arrivalDateStr = `${year}-${month}-${day}`;
          } catch (e) {
            return false;
          }
        }
      } else {
        return false;
      }
      
      if (start && end) {
        // Convert start and end dates to strings for comparison
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        
        // Compare strings directly to avoid timezone issues
        return arrivalDateStr >= startStr && arrivalDateStr <= endStr;
      } else if (start) {
        // Convert start date to string for comparison
        const startStr = format(start, 'yyyy-MM-dd');
        
        // Compare strings directly to avoid timezone issues
        return arrivalDateStr >= startStr;
      }
      
      return true;
    });
    
    // Check if property changed during filtering
    if (propertyRef.current !== propertyAtFilter) {
      if (DEBUG_PROPERTY_CHANGE) console.log(`[Filter] ABORT: Property changed during filtering from ${propertyAtFilter} to ${propertyRef.current}`);
      return [];
    }
    
    // Then sort the filtered results
    return sortReservations(filtered, sortBy);
  };

  // Render the reservations table view
  const renderReservationsView = () => {
    // Create a minimal skeleton loader for reservations
    const renderReservationSkeleton = () => (
      <View style={styles.skeletonContainer}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={styles.skeletonRow}>
            <View style={styles.skeletonCircle} />
            <View style={styles.skeletonContent}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '60%' }]} />
            </View>
            <View style={styles.skeletonPrice} />
          </View>
        ))}
      </View>
    );
    
    // Determine if we should show the skeleton (when loading + no existing data)
    const showSkeleton = isLoading && (!filteredReservations || filteredReservations.length === 0);
    
    // Determine if we should show the data (either loaded or loading with existing data)
    const showData = !isLoading || (isLoading && filteredReservations && filteredReservations.length > 0);

    return (
      <View style={styles.container}>
        {/* Always show the filters, but disable them during loading */}
        <View style={styles.filtersRow}>
          <TouchableOpacity 
            style={[styles.dateFilterButton, isLoading && styles.disabledButton]}
            onPress={() => !isLoading && setShowDatePicker(!showDatePicker)}
            disabled={isLoading}
          >
            <Icon name="calendar-outline" size={18} color="#666" />
            <Text style={styles.dateFilterText}>
              {startDate ? format(startDate, 'MMM d, yyyy') : 'All dates'}
              {endDate ? ` - ${format(endDate, 'MMM d, yyyy')}` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.sortButton, isLoading && styles.disabledButton]}
            onPress={() => !isLoading && handleSort()}
            disabled={isLoading}
          >
            <Icon name={sortBy === 'date' ? 'calendar' : 'cash-outline'} size={18} color="#666" />
            <Text style={styles.sortText}>
              Sort by {sortBy === 'date' ? 'Date' : 'Amount'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Date picker overlay */}
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClose={() => setShowDatePicker(false)}
            />
          </View>
        )}
        
        {/* Skeleton loader when we have no data */}
        {showSkeleton && renderReservationSkeleton()}
        
        {/* Show data table when available */}
        {showData && (
          <ReservationsTable
            reservations={filteredReservations}
            sortBy={sortBy}
            onRefresh={() => fetchReservationsForTable()}
            refreshing={refreshing} // Don't use isLoading here as we have our custom indicator
            onRowPress={handleBookingClick}
          />
        )}
      </View>
    );
  };

  // Add a function to sort reservations
  const sortReservations = (reservationsToSort, sortType) => {
    if (!reservationsToSort || !reservationsToSort.length) return [];
    
    return [...reservationsToSort].sort((a, b) => {
      if (sortType === 'date') {
        // Get date strings for consistent comparison
        let dateStrA, dateStrB;
        
        try {
          // Get arrival date or check-in date value for A
          const dateValueA = a.arrivalDate || a.checkInDate;
          if (dateValueA instanceof Date) {
            dateStrA = format(dateValueA, 'yyyy-MM-dd');
          } else if (typeof dateValueA === 'string') {
            dateStrA = format(new Date(dateValueA), 'yyyy-MM-dd');
          } else {
            dateStrA = '0000-00-00'; // Default for invalid date
          }
          
          // Get arrival date or check-in date value for B
          const dateValueB = b.arrivalDate || b.checkInDate;
          if (dateValueB instanceof Date) {
            dateStrB = format(dateValueB, 'yyyy-MM-dd');
          } else if (typeof dateValueB === 'string') {
            dateStrB = format(new Date(dateValueB), 'yyyy-MM-dd');
          } else {
            dateStrB = '0000-00-00'; // Default for invalid date
          }
        } catch (error) {
          return 0;
        }
        
        // Sort in descending order (newest first)
        return dateStrB.localeCompare(dateStrA);
      } else {
        // Sort by amount (highest first)
        // Get the owner payout amount with more robust parsing
        const getPayoutAmount = (reservation) => {
          // Try multiple possible fields for owner payout
          let amount = reservation.ownerPayout;
          
          // If the value is a string with a dollar sign, remove it
          if (typeof amount === 'string' && amount.includes('$')) {
            amount = amount.replace(/[$,]/g, '');
          }
          
          // Parse to float and handle NaN
          const parsedAmount = parseFloat(amount);
          return isNaN(parsedAmount) ? 0 : parsedAmount;
        };
        
        const amountA = getPayoutAmount(a);
        const amountB = getPayoutAmount(b);
        
        return amountB - amountA;
      }
    });
  };

  // Update the handleSort function to force a re-render after sorting
  const handleSort = () => {
    const newSortBy = sortBy === 'date' ? 'amount' : 'date';
    
    // First update the sort type
    setSortBy(newSortBy);
    
    // Then immediately sort the current filtered reservations with the new sort type
    const newlySorted = sortReservations([...filteredReservations], newSortBy);
    
    // Update state with sorted reservations to trigger re-render
    setFilteredReservations(newlySorted);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Ultra-sleek integrated header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.headerLeft}>
            <PropertyPicker 
              selectedProperty={selectedProperty}
              onValueChange={handlePropertyChange}
              properties={formattedListings}
              loading={isLoading && !bookingsFromCache}
              showSelectedImage={true}
              style={styles.propertyPicker}
            />
            
            {/* Month picker button - always visible */}
            <TouchableOpacity 
              style={styles.monthButton}
              onPress={() => setMonthPickerVisible(!monthPickerVisible)}
            >
              <Icon name="calendar-outline" size={20} color="#666" />
              <Text style={styles.monthButtonText}>
                {allMonths[currentMonthIndex] ? 
                  allMonths[currentMonthIndex].toLocaleString('default', { month: 'short', year: '2-digit' }) : 
                  'Month'}
              </Text>
              <Icon name="chevron-down-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Segmented control style tabs */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[
              styles.segmentButton, 
              showCalendarView ? styles.activeSegment : null
            ]}
            onPress={() => handleViewChange(true)}
          >
            <Text style={[
              styles.segmentText, 
              showCalendarView ? styles.activeSegmentText : null
            ]}>Calendar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.segmentButton, 
              !showCalendarView ? styles.activeSegment : null
            ]}
            onPress={() => handleViewChange(false)}
          >
            <Text style={[
              styles.segmentText, 
              !showCalendarView ? styles.activeSegmentText : null
            ]}>Reservations</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Month Picker Dropdown */}
      {monthPickerVisible && (
        <View style={styles.monthPickerContainer}>
          <ScrollView style={styles.monthPickerScroll}>
            {allMonths.map((month, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.monthPickerItem,
                  index === currentMonthIndex && styles.monthPickerItemSelected
                ]}
                onPress={() => {
                  jumpToMonth(index);
                  setMonthPickerVisible(false);
                }}
              >
                <Text style={[
                  styles.monthPickerText,
                  index === currentMonthIndex && styles.monthPickerTextSelected
                ]}>
                  {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Show either Calendar or Reservations view */}
      {(isLoading && !bookingsFromCache && showCalendarView) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={styles.loadingText}>
            Loading calendar...
          </Text>
        </View>
      ) : (
        showCalendarView ? (
          <View style={{flex: 1, position: 'relative'}}>
            <ScrollView 
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {allMonths.map((monthDate, index) => (
                <React.Fragment key={index}>
                  {renderMonthCalendar(monthDate)}
                </React.Fragment>
              ))}
            </ScrollView>
            
            {/* Today button overlay */}
            {showTodayButton && (
              <TouchableOpacity 
                style={styles.todayButton}
                onPress={scrollToToday}
              >
                <Icon name="today-outline" size={20} color="#fff" />
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
            
            {/* Overlay loading indicator for calendar */}
            {calendarLoading && (
              <View style={styles.calendarLoadingOverlay}>
                <ActivityIndicator size="small" color="#FF385C" />
              </View>
            )}
          </View>
        ) : (
          renderReservationsView()
        )
      )}
      
      {/* Reservation detail modal */}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  propertyPicker: {
    flex: 0.68,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    flex: 0.3,
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#444',
    marginHorizontal: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F6F6F6',
  },
  segmentedControl: {
    flexDirection: 'row',
    height: 32,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 2,
    alignSelf: 'center',
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  activeSegment: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#222',
  },
  activeSegmentText: {
    color: '#FF385C',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  monthContainer: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  monthTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50', // Changed from gold to green
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  dayHeader: {
    width: DAY_CELL_SIZE,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#757575',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  dayCellContainer: {
    width: DAY_CELL_SIZE,
    height: 70,
    position: 'relative',
  },
  dayCell: {
    width: DAY_CELL_SIZE,
    height: 70,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    padding: 4,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  todayCell: {
    borderWidth: 1,
    borderColor: '#FF385C',
  },
  emptyDay: {
    width: DAY_CELL_SIZE,
    height: 70,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    color: '#000000',
  },
  todayNumber: {
    fontWeight: '700',
    color: '#FF385C',
  },
  todayIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF385C',
  },
  bookingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    position: 'absolute',
    bottom: 5,
    borderWidth: 0,
    zIndex: 10,
    overflow: 'visible',
  },
  bookingStart: {
    left: 3,
    right: -1,
    paddingLeft: 3,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    overflow: 'visible',
    paddingVertical: 5,
  },
  bookingMiddle: {
    left: -1,
    right: -1,
    borderRadius: 0,
    paddingVertical: 5,
  },
  bookingEnd: {
    left: -1,
    right: 3,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 5,
  },
  bookingSingle: {
    left: 3,
    right: 3,
    paddingLeft: 3,
    borderRadius: 14,
    overflow: 'visible',
    paddingVertical: 5,
  },
  initialsCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginRight: 3,
    zIndex: 11,
  },
  initialsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 28,
    left: 32,
    zIndex: 20,
    height: 22,
    paddingVertical: 2,
    paddingHorizontal: 4,
    maxWidth: DAY_CELL_SIZE * 2.5,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  nameOverlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  amountOnlyOverlay: {
    position: 'absolute',
    bottom: 5,
    left: 32,
    zIndex: 20,
    height: 28,
    paddingVertical: 2,
    paddingHorizontal: 4,
    width: DAY_CELL_SIZE * 2.5,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  amountOnlyText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  payoutOverlay: {
    position: 'absolute',
    bottom: 5,
    left: 'auto',
    right: 8,
    zIndex: 21,
    height: 22,
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  payoutText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  datePickerContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 160,
  },
  dateFilterText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 100,
  },
  sortText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  monthPickerContainer: {
    position: 'absolute',
    top: 100, // Adjusted for sleeker header
    left: 16,
    width: 220,
    maxHeight: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 0,
  },
  monthPickerScroll: {
    maxHeight: 300,
  },
  monthPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  monthPickerItemSelected: {
    backgroundColor: 'rgba(255, 56, 92, 0.1)',
  },
  monthPickerText: {
    fontSize: 14,
    color: '#333',
  },
  monthPickerTextSelected: {
    fontWeight: '600',
    color: '#FF385C',
  },
  fullScreenView: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  skeletonContainer: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
    marginRight: 12,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
    borderRadius: 4,
  },
  skeletonPrice: {
    width: 70,
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  miniLoadingContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  calendarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pullDownLoadingContainer: {
    width: '100%',
    backgroundColor: '#FF385C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  pullDownLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  pullDownLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF385C',
    borderRadius: 18,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 6,
  },
});

export default CalendarScreen; 