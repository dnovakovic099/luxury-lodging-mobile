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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropertyPicker from '../components/PropertyPicker';
import { useAuth } from '../context/AuthContext';
import { getReservationsWithFinancialData } from '../services/api';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { saveToCache, loadFromCache, CACHE_KEYS } from '../utils/cacheUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache key for calendar bookings
const CALENDAR_BOOKINGS_CACHE = 'cache_calendar_bookings';
// Debug flag for cache logging
const DEBUG_CACHE = false; // Disable debug logs

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_CELL_SIZE = Math.floor(SCREEN_WIDTH / 7);

// Colors for different channels
const CHANNEL_COLORS = {
  airbnb: '#FF385C',   // Red for Airbnb
  vrbo: '#3D89DE',     // Blue for VRBO
  default: '#D4A017'   // Darker matte gold for everything else
};

// Status values to include in the display - matches owner portal
const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

// Color for bookings
const BOOKING_COLOR = '#FF385C';

// Memoize date calculations to improve performance
const useMemoizedDateFunctions = () => {
  // Memoize isSameDay for better performance
  const memoizedIsSameDay = React.useCallback((date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  }, []);

  return { memoizedIsSameDay };
};

const CalendarScreen = ({ navigation }) => {
  const { listings } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  
  // Add state for the modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  
  // Add state for caching
  const [bookingsFromCache, setBookingsFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { memoizedIsSameDay } = useMemoizedDateFunctions();

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
    if (!isLoading && allMonths.length > 0 && scrollViewRef.current && currentMonthIndex > 0) {
      // Add a small delay to ensure the scrollview has rendered
      setTimeout(() => {
        // Calculate position based on month height (approx 450px per month)
        const monthHeight = 450; 
        scrollViewRef && scrollViewRef.current && scrollViewRef.current.scrollTo({ 
          y: currentMonthIndex * monthHeight, 
          animated: false 
        });
      }, 100);
    }
  }, [isLoading, allMonths, currentMonthIndex]);

  useEffect(() => {
    // Generate calendar months
    generateCalendarMonths();
  }, []);

  // Effect to fetch reservations when the selected property changes
  useEffect(() => {
    if (selectedProperty && allMonths.length > 0) {
      // First try to load from cache, then fetch from API
      loadBookingsFromCache().then(hasCachedData => {
        if (DEBUG_CACHE) console.log(`Calendar: Cache load attempt result: ${hasCachedData ? 'Success' : 'Failed'}`);
        
        // If we didn't get valid cache, fetch fresh data
        if (!hasCachedData) {
          fetchReservations();
        } else {
          // Ensure we're not in loading state when we have cached data
          setIsLoading(false);
          
          // Even with cached data, fetch fresh data in the background if it's potentially stale
          const potentiallyStaleCache = true; // Always refresh in background for now
          if (potentiallyStaleCache) {
            // Slight delay before triggering background fetch to ensure UI is responsive first
            setTimeout(() => {
              if (DEBUG_CACHE) console.log('Calendar: Performing background fetch to refresh potentially stale data');
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
    const today = new Date();
    
    // Generate 12 months (6 before current month and 6 after)
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Start 6 months before current month
    for (let i = -6; i <= 6; i++) {
      let monthNum = (currentMonth + i) % 12;
      if (monthNum < 0) monthNum += 12;
      
      // Calculate year offset
      let yearOffset = Math.floor((currentMonth + i) / 12);
      if (currentMonth + i < 0 && (currentMonth + i) % 12 !== 0) {
        yearOffset -= 1;
      }
      
      const year = currentYear + yearOffset;
      months.push({
        date: new Date(year, monthNum, 1),
        index: i + 6 // Add 6 to make current month index 6
      });
    }
    
    // Sort the months chronologically
    months.sort((a, b) => a.date - b.date);
    
    // Find index of current month
    const currentMonthIndex = months.findIndex(
      month => month.date.getMonth() === currentMonth && month.date.getFullYear() === currentYear
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
    
    // Benchmark the fetch operation if debug is enabled
    const startTime = DEBUG_CACHE ? Date.now() : 0;
    
    // Only show full page loading if we don't have cached data
    const shouldShowLoading = !bookingsFromCache;
    if (shouldShowLoading) {
      setIsLoading(true);
    }
    
    try {
      if (DEBUG_CACHE) console.log('Calendar: Starting reservation fetch for property', selectedProperty);
      
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
      
      // Prepare params for API call
      const params = {
        listingMapIds: [selectedProperty],
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrival', // could be 'arrival' or 'departure'
        statuses: VALID_STATUSES
      };
      
      // Fetch reservations from API
      const result = await getReservationsWithFinancialData(params);
      
      if (DEBUG_CACHE) {
        const fetchTime = Date.now() - startTime;
        console.log(`Calendar: API fetch completed in ${fetchTime}ms`);
      }
      
      // Count reservations by status for debugging
      const statusCounts = {};
      if (result?.reservations && Array.isArray(result.reservations)) {
        if (DEBUG_CACHE) {
          // Count by status for debugging
          result.reservations.forEach(res => {
            const status = res.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          console.log('Calendar: Reservation status counts:', statusCounts);
        }
        
        // Transform processing start time
        const transformStart = DEBUG_CACHE ? Date.now() : 0;
        
        // Transform API data to our booking format with strict status and date filtering
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
            
            // Parse dates safely and adjust for display
            const startDate = new Date(arrivalDate);
            
            // Add one day to the start date to fix the display issue
            const adjustedStartDate = new Date(startDate);
            adjustedStartDate.setDate(adjustedStartDate.getDate() + 1);
            
            const endDate = new Date(departureDate);
            
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
              
              // Essential financial data
              ownerPayout: res.ownerPayout || 0,
              baseRate: res.baseRate || res.airbnbListingBasePrice || (res.financialData ? res.financialData.baseRate : 0) || 0,
              cleaningFee: res.cleaningFee || res.airbnbListingCleaningFee || (res.financialData ? res.financialData.cleaningFeeValue : 0) || 0,
              
              // Store minimal financial data
              financialData: res.financialData ? {
                baseRate: res.financialData.baseRate,
                cleaningFeeValue: res.financialData.cleaningFeeValue,
                managementFee: res.financialData.managementFee
              } : null,
            };
          })
          .filter(booking => booking !== null);
        
        if (DEBUG_CACHE) {
          const transformTime = Date.now() - transformStart;
          console.log(`Calendar: Data transformation completed in ${transformTime}ms`);
          console.log(`Calendar: Transformed ${transformedBookings.length} valid bookings`);
        }
        
        setBookings(transformedBookings);
        
        // Save to cache after successful fetch
        if (transformedBookings.length > 0) {
          setTimeout(() => saveBookingsToCache(), 10); // Slight delay to not block the UI
        }
      } else {
        // Handle no reservations or invalid response
        if (DEBUG_CACHE) console.log('Calendar: No reservations returned from API or invalid response');
        setBookings([]);
      }
    } catch (error) {
      console.error('Calendar: Error fetching reservations:', error);
      
      // If we have no cached data or fetching failed, set empty bookings
      if (!bookingsFromCache) {
        setBookings([]);
      }
    } finally {
      // Always set loading to false when fetch completes
      setIsLoading(false);
      
      if (DEBUG_CACHE) {
        const totalTime = Date.now() - startTime;
        console.log(`Calendar: Total fetch & processing completed in ${totalTime}ms`);
      }
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
    // Reset cached state when property changes
    setBookingsFromCache(false);
    setSelectedProperty(propertyId);
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

  // Check if date falls within a booking
  const getBookingForDate = (date) => {
    if (!date || !bookings || !Array.isArray(bookings)) return null;
    
    try {
      // Convert the date to midnight for comparison
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const targetTime = targetDate.getTime();
      
      // Find all bookings that include this date, then sort them so we prioritize display
      const matchingBookings = bookings.filter(booking => {
        if (!booking || !booking.startDate || !booking.endDate) return false;
        
        // Double-check that this booking has a valid status
        if (!booking.status || !VALID_STATUSES.includes(booking.status)) {
          return false;
        }
        
        // Create dates at midnight for comparison
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

  // Handle booking click to show reservation details
  const handleBookingClick = (booking) => {
    if (!booking) return;

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
      
      // Financial data for Guest Paid section
      nightlyRate: booking.baseRate ? booking.baseRate / (booking.nights || 1) : 0,
      cleaningFee: booking.cleaningFee || 0,
      serviceFee: booking.serviceFee || 
                  booking.hostChannelFee || 
                  booking.financialData?.hostChannelFee || 
                  booking.financialData?.VRBOChannelFee || 
                  booking.channelFee || 
                  0,
      occupancyTaxes: booking.occupancyTaxes || booking.tourismTax || booking.cityTax || 0,
      guestTotal: booking.guestTotal || booking.totalPrice || 0,
      
      // Financial data for Host Payout section
      baseRate: parseFloat(booking.baseRate) || 0,
      processingFee: booking.financialData?.PaymentProcessing ? parseFloat(booking.financialData.PaymentProcessing) : 0,
      channelFee: parseFloat(
        booking.hostChannelFee || 
        booking.financialData?.hostChannelFee || 
        booking.financialData?.VRBOChannelFee ||
        booking.channelFee || 
        0
      ),
      managementFee: parseFloat(
        booking.managementFee || 
        booking.pmCommission || 
        booking.financialData?.managementFee ||
        booking.financialData?.pmCommission ||
        booking.financialData?.managementFeeAirbnb ||
        0
      ),
      
      // Final payout
      hostPayout: parseFloat(booking.ownerPayout) || parseFloat(booking.airbnbExpectedPayoutAmount) || 0,
      
      // Channel information
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

  // Optimize renderDay for better performance
  const renderDay = React.useMemo(() => (date, month) => {
    if (!date) return <View style={styles.emptyDay} />;
    
    const dayNum = date.getDate();
    const booking = getBookingForDate(date);
    const segmentType = booking ? getBookingSegmentType(date, booking) : null;
    
    // Only show guest name and initial on the first day of booking
    const isFirstDay = segmentType === 'start' || segmentType === 'single';
    
    // Prepare guest name and initial
    let guestInitial = 'G';
    let guestName = 'Guest';
    
    if (booking && booking.guestName) {
      const trimmedName = booking.guestName.trim();
      if (trimmedName.length > 0) {
        // Extract first name by splitting on space and taking the first part
        const firstName = trimmedName.split(' ')[0];
        guestInitial = firstName.charAt(0).toUpperCase();
        guestName = firstName; // Use only the first name
      }
    }
    
    // Create cell content
    const cellContent = (
      <>
        <Text style={styles.dayNumber}>{dayNum}</Text>
        
        {booking && segmentType && (
          <View 
            style={[
              styles.bookingIndicator, 
              styles[`booking${segmentType.charAt(0).toUpperCase() + segmentType.slice(1)}`],
              { backgroundColor: booking.color }
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
          style={styles.dayCell}
          onPress={() => booking && handleBookingClick(booking)}
          disabled={!booking}
        >
          {cellContent}
        </TouchableOpacity>
        
        {/* Render name separately to allow it to float over cell boundaries */}
        {booking && isFirstDay && (
          <View style={styles.nameOverlay}>
            <Text 
              style={styles.nameOverlayText}
              numberOfLines={1}
              ellipsizeMode="tail">
              {guestName}
            </Text>
          </View>
        )}
      </View>
    );
  }, [bookings, selectedProperty]);

  const renderMonthCalendar = (monthDate) => {
    const days = getDaysInMonth(monthDate);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    return (
      <View style={styles.monthContainer}>
        <Text style={styles.monthTitle}>{monthName} {year}</Text>
        
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

  // Optimize bookings processing by reducing unnecessary operations
  const loadBookingsFromCache = async () => {
    try {
      if (DEBUG_CACHE) console.log('Calendar: Attempting to load bookings from cache...');
      
      // Create a cache key that includes the property id
      const cacheKey = `${CALENDAR_BOOKINGS_CACHE}_${selectedProperty}`;
      
      // Get the data in a single operation
      const cachedBookings = await loadFromCache(cacheKey);
      
      if (!cachedBookings || !Array.isArray(cachedBookings) || cachedBookings.length === 0) {
        if (DEBUG_CACHE) console.log('Calendar: No valid bookings in cache');
        return false;
      }
      
      if (DEBUG_CACHE) {
        console.log('Calendar: Loaded bookings from cache successfully');
        console.log('Calendar: Cached bookings count:', cachedBookings.length);
      }
      
      // Convert all date strings to Date objects in a single pass
      // This is faster than batch processing with setTimeout delays
      const fixedBookings = cachedBookings.map(booking => ({
        ...booking,
        startDate: booking.startDate ? new Date(booking.startDate) : null,
        endDate: booking.endDate ? new Date(booking.endDate) : null
      }));
      
      // Validate that we have proper date objects
      const hasValidBookings = fixedBookings.some(booking => 
        booking.startDate instanceof Date && 
        booking.endDate instanceof Date &&
        !isNaN(booking.startDate.getTime()) &&
        !isNaN(booking.endDate.getTime())
      );
      
      if (!hasValidBookings) {
        if (DEBUG_CACHE) console.log('Calendar: Cache exists but dates are invalid after parsing');
        return false;
      }
      
      // Critical: First set not loading, then update bookings state
      // This ensures the UI updates with cached data before any potential re-renders
      setIsLoading(false);
      setBookingsFromCache(true);
      
      // Update state with cached bookings immediately
      setBookings(fixedBookings);
      
      if (DEBUG_CACHE) console.log('Calendar: Successfully set bookings from cache');
      return true;
    } catch (error) {
      console.error('Calendar: Error loading bookings from cache:', error);
      return false;
    }
  };
  
  // Optimize saving bookings to cache
  const saveBookingsToCache = async () => {
    try {
      if (!selectedProperty || !bookings || !Array.isArray(bookings) || bookings.length === 0) {
        if (DEBUG_CACHE) console.log('Calendar: Not saving bookings to cache - invalid data');
        return;
      }
      
      if (DEBUG_CACHE) console.log('Calendar: Saving bookings to cache...');
      
      // Create a cache key that includes the property id
      const cacheKey = `${CALENDAR_BOOKINGS_CACHE}_${selectedProperty}`;
      
      // Save to cache with the proper key
      await saveToCache(cacheKey, bookings);
      
      if (DEBUG_CACHE) console.log('Calendar: Saved bookings to cache successfully');
    } catch (error) {
      console.error('Calendar: Error saving bookings to cache:', error);
    }
  };

  // Force refresh all calendar data
  const forceRefreshCalendarData = async () => {
    try {
      // Clear calendar cache
      if (DEBUG_CACHE) console.log('Calendar: Clearing calendar cache...');
      await clearCache(`${CALENDAR_BOOKINGS_CACHE}_${selectedProperty}`);
      
      setBookingsFromCache(false);
      setRefreshing(true);
      
      // Fetch new bookings
      await fetchBookingsForCalendar();
      
      setRefreshing(false);
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
      setRefreshing(false);
    }
  };
  
  // Optimize the fetchBookingsForCalendar function
  const fetchBookingsForCalendar = useCallback(async () => {
    if (!selectedProperty) return;
    
    try {
      // First try to load from cache - critical to load cache before setting any loading states
      const loadedFromCache = await loadBookingsFromCache();
      
      // Only show loading indicators if we don't have cached data
      if (!loadedFromCache) {
        // No cache, set loading states
        setCalendarLoading(true);
        setIsLoading(true);
        
        // No cache, fetch from API with loading indicators shown
        await fetchReservations();
        
        // Clear loading states after fetch completes
        setCalendarLoading(false);
        setIsLoading(false);
      } else {
        // We have cache, don't show loading indicators
        // and fetch in the background after a short delay
        setTimeout(() => {
          // Don't set isLoading to true here - we already have data to show
          fetchReservations().finally(() => {
            // Ensure loading indicators are cleared when done
            setCalendarLoading(false);
            setIsLoading(false);
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching bookings for calendar:', error);
      // Always clear loading states on error
      setCalendarLoading(false);
      setIsLoading(false);
    }
  }, [selectedProperty]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <View style={styles.propertyPickerContainer}>
            <PropertyPicker 
              selectedProperty={selectedProperty}
              onValueChange={handlePropertyChange}
              properties={formattedListings}
              loading={!formattedListings || formattedListings.length === 0}
              showSelectedImage={true}
            />
          </View>
        </View>
        
        {/* Improved refresh button with loading indicator and long-press for force refresh */}
        <TouchableOpacity 
          onPress={refreshBookings}
          onLongPress={forceRefreshCalendarData}
          delayLongPress={800}
          style={styles.refreshButton}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <Icon name="refresh" size={24} color="#333" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Render condition - now prioritizing cached data display */}
      {(isLoading && !bookingsFromCache) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={styles.loadingText}>Loading reservations...</Text>
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
        >
          {/* Small loading indicator when refreshing with cached data */}
          {/* {(isLoading || refreshing) && bookingsFromCache && (
            <View style={styles.miniLoadingContainer}>
              <ActivityIndicator size="small" color="#FF385C" />
              <Text style={styles.miniLoadingText}>Updating in background...</Text>
            </View>
          )} */}
          
          {allMonths.map((monthDate, index) => (
            <React.Fragment key={index}>
              {renderMonthCalendar(monthDate)}
            </React.Fragment>
          ))}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0',
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyPickerContainer: {
    flex: 1,
  },
  propertyImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
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
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    marginLeft: 16,
    color: '#000000',
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
    bottom: 5,
    left: 36,
    zIndex: 20,
    height: 28,
    paddingVertical: 2,
    paddingRight: 4,
    paddingLeft: 0,
    width: DAY_CELL_SIZE * 3,
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
    marginLeft: 4,
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
  },
  miniLoadingText: {
    fontSize: 14,
    color: '#777',
    marginLeft: 8,
  },
});

export default CalendarScreen; 