import React, { useState, useEffect, useRef } from 'react';
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

const CalendarScreen = ({ navigation }) => {
  const { listings } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState('1');
  const [allMonths, setAllMonths] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

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

      console.log('imageUrl', imageUrl);
      
      return {
        id: listing.id.toString(),
        name: listing.name || `Property ${listing.id}`,
        image: imageUrl
      };
    });
  }, [listings]);

  // Scroll to current month when months load or loading completes
  useEffect(() => {
    if (!isLoading && allMonths.length > 0 && scrollViewRef.current && currentMonthIndex > 0) {
      // Add a small delay to ensure the scrollview has rendered
      setTimeout(() => {
        // Calculate position based on month height (approx 450px per month)
        const monthHeight = 450; 
        scrollViewRef.current.scrollTo({ 
          y: currentMonthIndex * monthHeight, 
          animated: false 
        });
      }, 100);
    }
  }, [isLoading, allMonths, currentMonthIndex]);

  useEffect(() => {
    // If we have real listings from AuthContext, use those
    if (formattedListings.length > 0 && !selectedProperty) {
      setSelectedProperty(formattedListings[0].id);
    }
    
    // Generate calendar months
    generateCalendarMonths();
  }, [formattedListings]);

  // Effect to fetch reservations when the selected property changes
  useEffect(() => {
    if (selectedProperty && allMonths.length > 0) {
      fetchReservations();
    }
  }, [selectedProperty, allMonths]);

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
    
    setIsLoading(true);
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
      
      // Prepare params for API call
      const params = {
        listingMapIds: [selectedProperty],
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrival', // could be 'arrival' or 'departure'
        statuses: VALID_STATUSES
      };
      
      // Log detailed API request information
      console.log('API Request:');
      console.log('Endpoint: /reservations');
      console.log('Parameters:', JSON.stringify(params, null, 2));
      console.log('Valid statuses:', VALID_STATUSES);
      
      // Fetch reservations from API
      const result = await getReservationsWithFinancialData(params);
      
      // Log the raw API response
      console.log('API Response:');
      console.log('Total reservations:', result?.reservations?.length || 0);
      console.log('Status distribution:');
      
      // Count reservations by status
      const statusCounts = {};
      if (result?.reservations && Array.isArray(result.reservations)) {
        result.reservations.forEach(res => {
          const status = res.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log(JSON.stringify(statusCounts, null, 2));
        
        // Log a sample reservation if available
        if (result.reservations.length > 0) {
          console.log('Sample reservation:');
          console.log(JSON.stringify(result.reservations[0], null, 2));
        }
        
        // Transform API data to our booking format with strict status filtering
        const transformedBookings = result.reservations
          .filter(res => {
            // Validate that we have both arrival and departure dates
            const hasArrival = !!res.arrivalDate || !!res.checkInDate;
            const hasDeparture = !!res.departureDate || !!res.checkOutDate;
            
            // Strict status check
            const hasValidStatus = VALID_STATUSES.includes(res.status);
            
            // Log status information for debugging
            console.log(`Reservation ${res.id}: Status "${res.status}" - Valid: ${hasValidStatus}`);
            
            if (!hasValidStatus) {
              console.log(`Filtering out reservation with invalid status ${res.status}:`, res.id);
            }
            
            // Only include reservations with valid dates AND valid status
            return hasArrival && hasDeparture && hasValidStatus;
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
            
            console.log(`Reservation ${res.id} dates: Original start=${startDate.toISOString()}, Adjusted start=${adjustedStartDate.toISOString()}, End=${endDate.toISOString()}`);
            
            // Debug each reservation's source information
            console.log('Reservation source info:', {
              id: res.id,
              channelName: res.channelName,
              sourceType: res.sourceType,
              sourceName: res.sourceName,
              channel: res.channel,
              guestName: res.guestName || res.guestFirstName
            });
            
            // Determine the channel color using channelName
            let channelType = 'default';
            
            if (res.channelName) {
              const channelNameLower = String(res.channelName).toLowerCase();
              
              if (channelNameLower.includes('airbnb')) {
                channelType = 'airbnb';
              } else if (channelNameLower.includes('vrbo') || 
                         channelNameLower.includes('homeaway') ||
                         channelNameLower.includes('expedia')) {
                channelType = 'vrbo';
              } else {
                // Print the exact channel name for debugging
                console.log(`Unrecognized channel name: "${res.channelName}" for reservation ${res.id}`);
              }
              
              console.log(`Reservation ${res.id}: Channel detected as ${channelType} from channelName "${res.channelName}"`);
            } else {
              // Fallback to other fields if channelName is not available
              console.log(`No channelName for reservation ${res.id}, trying fallbacks`);
              
              // Check source type
              if (res.sourceType) {
                const sourceTypeLower = String(res.sourceType).toLowerCase();
                if (sourceTypeLower.includes('airbnb')) {
                  channelType = 'airbnb';
                  console.log(`Reservation ${res.id}: Using Airbnb from sourceType "${res.sourceType}"`);
                } else if (sourceTypeLower.includes('vrbo') || 
                            sourceTypeLower.includes('homeaway') ||
                            sourceTypeLower.includes('expedia')) {
                  channelType = 'vrbo';
                  console.log(`Reservation ${res.id}: Using VRBO from sourceType "${res.sourceType}"`);
                }
              }
              
              // Check source name
              if (channelType === 'default' && res.sourceName) {
                const sourceNameLower = String(res.sourceName).toLowerCase();
                if (sourceNameLower.includes('airbnb')) {
                  channelType = 'airbnb';
                  console.log(`Reservation ${res.id}: Using Airbnb from sourceName "${res.sourceName}"`);
                } else if (sourceNameLower.includes('vrbo') || 
                            sourceNameLower.includes('homeaway') ||
                            sourceNameLower.includes('expedia')) {
                  channelType = 'vrbo';
                  console.log(`Reservation ${res.id}: Using VRBO from sourceName "${res.sourceName}"`);
                }
              }
              
              // Final fallback to channel
              if (channelType === 'default' && res.channel) {
                const channelLower = String(res.channel).toLowerCase();
                if (channelLower.includes('airbnb')) {
                  channelType = 'airbnb';
                  console.log(`Reservation ${res.id}: Using Airbnb from channel "${res.channel}"`);
                } else if (channelLower.includes('vrbo') || 
                            channelLower.includes('homeaway') ||
                            channelLower.includes('expedia')) {
                  channelType = 'vrbo';
                  console.log(`Reservation ${res.id}: Using VRBO from channel "${res.channel}"`);
                }
              }

              console.log(`Final channel type for reservation ${res.id}: ${channelType}`);
            }
            
            // Use the appropriate color based on channel
            const bookingColor = CHANNEL_COLORS[channelType];
            
            return {
              id: res.id || res.reservationId,
              startDate: adjustedStartDate,
              endDate: endDate,
              guestName: res.guestName || res.guestFirstName || 'Guest',
              color: bookingColor,
              status: res.status,
              channel: channelType,
              channelName: res.channelName || '',
              sourceType: res.sourceType || ''
            };
          })
          .filter(booking => booking !== null);
        
        console.log(`Filtered to ${transformedBookings.length} valid reservations with status in`, VALID_STATUSES);
        
        // Final verification that all bookings have valid statuses
        const validBookings = transformedBookings.filter(booking => {
          if (!booking.status || !VALID_STATUSES.includes(booking.status)) {
            console.error(`WARNING: Invalid booking status "${booking.status}" slipped through filtering - ID: ${booking.id}`);
            return false;
          }
          return true;
        });
        
        if (validBookings.length !== transformedBookings.length) {
          console.error(`WARNING: Found ${transformedBookings.length - validBookings.length} bookings with invalid status after filtering`);
        }
        
        setBookings(validBookings);
      } else {
        console.log('No reservations found or invalid response');
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    console.log('Property changed to:', propertyId);
    setSelectedProperty(propertyId);
    // Reservations will be fetched by the useEffect
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

  // Compare dates ignoring time
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

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
        
        if (isInRange) {
          // Log for debugging
          console.log(`Date ${targetDate.toISOString().split('T')[0]} matches booking ${booking.id} 
            (${bookingStart.toISOString().split('T')[0]} to ${bookingEnd.toISOString().split('T')[0]})`);
        }
        
        return isInRange;
      });
      
      // If we have multiple bookings, prioritize them based on channel type
      if (matchingBookings.length > 1) {
        console.log(`Found ${matchingBookings.length} overlapping bookings for date ${date.toISOString().split('T')[0]}`);
        
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

  const renderDay = (date, month) => {
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
    
    return (
      <View style={styles.dayCell}>
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
  };

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
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('ReservationsList')}
        >
          <Icon name="list-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
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
          {allMonths.map((monthDate, index) => (
            <React.Fragment key={index}>
              {renderMonthCalendar(monthDate)}
            </React.Fragment>
          ))}
        </ScrollView>
      )}
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
  settingsButton: {
    padding: 8,
    marginLeft: 10,
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
  dayCell: {
    width: DAY_CELL_SIZE,
    height: 70,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    padding: 4,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
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
    overflow: 'visible',
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
});

export default CalendarScreen; 