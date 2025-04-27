import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format, isValid, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { theme } from '../theme';

// Channel colors
const CHANNEL_COLORS = {
  airbnb: '#FF385C',   // Red for Airbnb
  vrbo: '#3D89DE',     // Blue for VRBO
  default: '#D4A017'   // Darker matte gold for everything else
};

// Safe date formatting function
const safeFormatDate = (dateValue) => {
  try {
    // Debug the input
    console.log(`safeFormatDate input:`, {
      value: dateValue,
      type: typeof dateValue,
      isDate: dateValue instanceof Date
    });
    
    // Handle different date formats
    if (!dateValue) return 'N/A';
    
    // If it's already a Date object, format it directly
    if (dateValue instanceof Date) {
      // Check if date is valid before formatting
      if (!isValid(dateValue)) {
        console.warn(`Invalid date detected: ${dateValue}`);
        return 'N/A';
      }
      
      // Extract date parts directly - this preserves the exact date regardless of timezone
      const year = dateValue.getUTCFullYear();
      const month = dateValue.getUTCMonth();
      const day = dateValue.getUTCDate();
      
      // Create a string representation with day of week - month day, year
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(year, month, day)).getUTCDay()];
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
      
      const result = `${dayOfWeek}, ${monthName} ${day}, ${year}`;
      console.log(`Formatted from Date object: ${result}`);
      return result;
    } 
    
    // If it's a string, use parseISO to preserve the exact date without timezone adjustment
    if (typeof dateValue === 'string') {
      try {
        // Parse the date as UTC
        const parsedDate = parseISO(dateValue);
        console.log(`String date parsed:`, {
          original: dateValue,
          parsed: parsedDate
        });
        
        if (!isValid(parsedDate)) {
          console.warn(`Invalid date string detected: ${dateValue}`);
          return 'N/A';
        }
        
        // Extract date parts directly from UTC
        const year = parsedDate.getUTCFullYear();
        const month = parsedDate.getUTCMonth();
        const day = parsedDate.getUTCDate();
        
        // Create a string representation with day of week - month day, year
        const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(year, month, day)).getUTCDay()];
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
        
        const result = `${dayOfWeek}, ${monthName} ${day}, ${year}`;
        console.log(`Formatted from string: ${result}`);
        return result;
      } catch (e) {
        console.error(`Error parsing date string: ${e.message}`);
        return 'N/A';
      }
    }
    
    return 'N/A';
  } catch (error) {
    console.error(`Error formatting date: ${error.message}`, dateValue);
    return 'N/A';
  }
};

const ReservationDetailModal = ({ visible, onClose, reservation }) => {
  if (!reservation) return null;

  const formatCurrency = (amount) => {
    // Handle string values
    let numAmount = amount;
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
    }
    
    // Handle invalid or NaN values
    if (numAmount === null || numAmount === undefined || isNaN(numAmount)) {
      return '$0.00';
    }
    
    return numAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Helper function to safely parse numbers
  const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Log ALL possible channel fee data for debugging
  console.log('COMPLETE RESERVATION FEE DATA:', {
    // Direct properties
    channelFee: reservation.channelFee,
    hostChannelFee: reservation.hostChannelFee,
    VRBOChannelFee: reservation.VRBOChannelFee,
    serviceFee: reservation.serviceFee,
    
    // Nested in financialData
    financialData_channelFee: reservation.financialData?.channelFee,
    financialData_hostChannelFee: reservation.financialData?.hostChannelFee,
    financialData_VRBOChannelFee: reservation.financialData?.VRBOChannelFee,
    
    // Raw values without parsing
    channelFee_type: typeof reservation.channelFee,
    hostChannelFee_type: typeof reservation.hostChannelFee,
    
    // Parsed values
    parsed_channelFee: parseNumber(reservation.channelFee),
    parsed_hostChannelFee: parseNumber(reservation.hostChannelFee)
  });

  // Get the appropriate channel fee checking all possible sources
  const getChannelFee = () => {
    return parseNumber(
      reservation.hostChannelFee || 
      reservation.financialData?.hostChannelFee || 
      reservation.financialData?.VRBOChannelFee ||
      reservation.channelFee || 
      0
    );
  };
  
  // Get the appropriate management fee checking all possible sources
  const getManagementFee = () => {
    return parseNumber(
      reservation.managementFee || 
      reservation.pmCommission || 
      reservation.financialData?.managementFee ||
      reservation.financialData?.pmCommission ||
      reservation.financialData?.managementFeeAirbnb ||
      0
    );
  };

  // Calculate the base rate using a comprehensive formula
  const calculateBaseRate = () => {
    const finData = reservation.financialData || {};
    const nights = calculateNightsCount() || 1;
    
    const baseRate = (
      parseFloat(finData.baseRate || 0) +
      parseFloat(finData.weeklyDiscount || finData['weekly Discount'] || 0) +
      parseFloat(finData.couponDiscount || finData['coupon Discount'] || 0) +
      parseFloat(finData.monthlyDiscount || finData['monthly Discount'] || 0) +
      parseFloat(finData.cancellationPayout || finData['cancellation Payout'] || 0) +
      parseFloat(finData.otherFees || finData['other Fees'] || 0) +
      parseFloat(finData.claimsProtection || 0)
    ) || (parseFloat(reservation.totalPrice || 0) - parseFloat(reservation.cleaningFee || 0)) / nights;
    
    // Ensure base rate is never negative
    return Math.max(0, baseRate);
  };

  // Safely calculate the nights count between arrival and departure dates
  const calculateNightsCount = () => {
    try {
      // Debug dates
      console.log("Calculate nights input dates:", {
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate,
      });
      
      if (!reservation.arrivalDate || !reservation.departureDate) {
        // If we have a nights property, use that
        if (reservation.nights) {
          const nightsNum = parseInt(reservation.nights, 10);
          if (!isNaN(nightsNum)) {
            console.log(`Using provided nights value: ${nightsNum}`);
            return nightsNum;
          }
        }
        console.log("No valid dates for nights calculation");
        return 0;
      }
      
      let arrival, departure;
      
      // Handle case where dates are already Date objects
      if (reservation.arrivalDate instanceof Date) {
        arrival = reservation.arrivalDate;
      } else if (typeof reservation.arrivalDate === 'string') {
        // Use parseISO to preserve exact date without timezone conversion
        arrival = parseISO(reservation.arrivalDate);
      } else {
        console.log("Invalid arrival date format");
        return 0;
      }
      
      if (reservation.departureDate instanceof Date) {
        departure = reservation.departureDate;
      } else if (typeof reservation.departureDate === 'string') {
        // Use parseISO to preserve exact date without timezone conversion
        departure = parseISO(reservation.departureDate);
      } else {
        console.log("Invalid departure date format");
        return 0;
      }
      
      // Verify dates are valid
      if (!isValid(arrival) || !isValid(departure)) {
        console.warn('Invalid arrival/departure dates detected');
        
        // Try to use nights property if available
        if (reservation.nights) {
          const nightsNum = parseInt(reservation.nights, 10);
          if (!isNaN(nightsNum)) {
            console.log(`Using provided nights value after invalid date detection: ${nightsNum}`);
            return nightsNum;
          }
        }
        
        console.log("No valid dates or nights value");
        return 0;
      }
      
      console.log("Processed dates for nights calculation:", {
        arrival,
        departure
      });
      
      const diffTime = Math.abs(departure - arrival);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`Calculated nights: ${diffDays}`);
      return diffDays;
    } catch (error) {
      console.error(`Error calculating nights: ${error.message}`);
      
      if (reservation.nights) {
        const nightsNum = parseInt(reservation.nights, 10);
        if (!isNaN(nightsNum)) {
          console.log(`Using provided nights value after error: ${nightsNum}`);
          return nightsNum;
        }
      }
      
      console.log("Returning 0 nights due to error");
      return 0;
    }
  };

  // Get channel information
  const getChannelInfo = () => {
    let channelType = 'default';
    let displayName = 'Luxury Lodging';
    
    if (reservation.channel) {
      const channelLower = String(reservation.channel).toLowerCase();
      
      if (channelLower.includes('airbnb')) {
        channelType = 'airbnb';
        displayName = 'Airbnb';
      } else if (channelLower.includes('vrbo') || 
                channelLower.includes('homeaway') ||
                channelLower.includes('expedia')) {
        channelType = 'vrbo';
        displayName = 'VRBO';
      }
    } else if (reservation.channelName) {
      const channelNameLower = String(reservation.channelName).toLowerCase();
      
      if (channelNameLower.includes('airbnb')) {
        channelType = 'airbnb';
        displayName = 'Airbnb';
      } else if (channelNameLower.includes('vrbo') || 
                channelNameLower.includes('homeaway') ||
                channelNameLower.includes('expedia')) {
        channelType = 'vrbo';
        displayName = 'VRBO';
      }
    }
    
    return { type: channelType, displayName, color: CHANNEL_COLORS[channelType] };
  };

  // Check if payout data is incomplete
  const hasIncompleteFinancialData = () => {
    // We no longer consider zero payouts as incomplete - we'll display them as $0
    const payout = parseNumber(reservation.hostPayout || reservation.airbnbExpectedPayoutAmount || reservation.ownerPayout);
    return payout === null || payout === undefined;
  };

  const channelInfo = getChannelInfo();
  const nightsCount = calculateNightsCount();
  const incompleteFinancialData = hasIncompleteFinancialData();
  const guestCountText = `${reservation.adultCount || 1} adult${(reservation.adultCount || 1) !== 1 ? 's' : ''}${
    reservation.childrenCount ? `, ${reservation.childrenCount} child${reservation.childrenCount !== 1 ? 'ren' : ''}` : ''}${
    reservation.infantCount ? `, ${reservation.infantCount} infant${reservation.infantCount !== 1 ? 's' : ''}` : ''}`;
  
  // Format date range for the header with improved error handling
  const formatDateRange = () => {
    try {
      console.log("formatDateRange input:", {
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate,
        nightsCount
      });
      
      if (!reservation.arrivalDate || !reservation.departureDate) {
        if (nightsCount > 0) {
          return `Reservation (${nightsCount} nights)`;
        }
        return 'Upcoming Reservation';
      }
      
      let arrival, departure;
      let arrivalMonth, arrivalDay, departureMonth, departureDay;
      
      // Handle case where dates are already Date objects
      if (reservation.arrivalDate instanceof Date) {
        arrival = reservation.arrivalDate;
        console.log("Using arrival Date object directly:", arrival);
        // Extract UTC date parts
        arrivalMonth = arrival.getUTCMonth();
        arrivalDay = arrival.getUTCDate();
      } else if (typeof reservation.arrivalDate === 'string') {
        // Use parseISO to preserve exact date without timezone conversion
        arrival = parseISO(reservation.arrivalDate);
        console.log("Parsed arrival date from string:", {
          original: reservation.arrivalDate,
          parsed: arrival
        });
        // Extract UTC date parts
        arrivalMonth = arrival.getUTCMonth();
        arrivalDay = arrival.getUTCDate();
      } else {
        console.log("Invalid arrival date format in formatDateRange");
        return `Reservation (${nightsCount} nights)`;
      }
      
      if (reservation.departureDate instanceof Date) {
        departure = reservation.departureDate;
        console.log("Using departure Date object directly:", departure);
        // Extract UTC date parts
        departureMonth = departure.getUTCMonth();
        departureDay = departure.getUTCDate();
      } else if (typeof reservation.departureDate === 'string') {
        // Use parseISO to preserve exact date without timezone conversion
        departure = parseISO(reservation.departureDate);
        console.log("Parsed departure date from string:", {
          original: reservation.departureDate,
          parsed: departure
        });
        // Extract UTC date parts
        departureMonth = departure.getUTCMonth();
        departureDay = departure.getUTCDate();
      } else {
        console.log("Invalid departure date format in formatDateRange");
        return `Reservation (${nightsCount} nights)`;
      }
      
      // Check if dates are valid
      if (!isValid(arrival) || !isValid(departure)) {
        console.warn('Invalid arrival/departure dates in formatDateRange');
        return `Reservation (${nightsCount} nights)`;
      }
      
      // Get month names
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      console.log("formatDateRange processed dates:", {
        arrival: `${monthNames[arrivalMonth]} ${arrivalDay}`,
        departure: `${monthNames[departureMonth]} ${departureDay}`
      });
      
      // If same month, show "Month StartDay – EndDay (X nights)"
      if (arrivalMonth === departureMonth) {
        const result = `${monthNames[arrivalMonth]} ${arrivalDay} – ${departureDay} (${nightsCount} nights)`;
        console.log("Same month format:", result);
        return result;
      }
      
      // If different months, show "StartMonth StartDay – EndMonth EndDay (X nights)"
      const result = `${monthNames[arrivalMonth]} ${arrivalDay} – ${monthNames[departureMonth]} ${departureDay} (${nightsCount} nights)`;
      console.log("Different month format:", result);
      return result;
    } catch (error) {
      console.error(`Error in formatDateRange: ${error.message}`);
      return `Reservation (${nightsCount} nights)`;
    }
  };

  const dateRange = formatDateRange();

  // Debug date values
  console.log("RESERVATION DATES RECEIVED IN MODAL:", {
    arrivalDate: {
      value: reservation.arrivalDate,
      type: typeof reservation.arrivalDate,
      isDate: reservation.arrivalDate instanceof Date
    },
    departureDate: {
      value: reservation.departureDate,
      type: typeof reservation.departureDate,
      isDate: reservation.departureDate instanceof Date
    },
    bookingDate: {
      value: reservation.bookingDate,
      type: typeof reservation.bookingDate,
      isDate: reservation.bookingDate instanceof Date
    }
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close-outline" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Guest Profile Section */}
            <View style={styles.guestSection}>
              <Text style={styles.confirmedText}>Confirmed</Text>
              
              <View style={styles.guestInfoContainer}>
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{reservation.guestName || 'Guest'}</Text>
                  
                  <View style={styles.channelTag}>
                    <Text style={[styles.channelText, { color: channelInfo.color }]}>
                      {channelInfo.displayName}
                    </Text>
                  </View>
                  
                  <Text style={styles.propertyDetails}>
                    {reservation.propertyName || 'Property'}
                  </Text>
                  
                  <Text style={styles.stayDates}>{dateRange}</Text>
                  
                  <Text style={styles.guestSummary}>
                    {guestCountText} · {formatCurrency(reservation.hostPayout)}
                  </Text>
                </View>
                
                <View style={styles.guestAvatar}>
                  {reservation.guestPicture ? (
                    <Image 
                      source={{ uri: reservation.guestPicture }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {reservation.guestFirstName ? reservation.guestFirstName.charAt(0).toUpperCase() : 
                       reservation.guestName ? reservation.guestName.charAt(0).toUpperCase() : 'G'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.pageTitle}>Booking details</Text>
            
            {/* Guests Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Guests</Text>
              <Text style={styles.sectionValue}>{guestCountText}</Text>
            </View>
            
            {/* Booking Channel Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Booking Channel</Text>
              <View style={[styles.channelBadge, { backgroundColor: channelInfo.color }]}>
                <Text style={styles.channelBadgeText}>{channelInfo.displayName}</Text>
              </View>
            </View>
            
            {/* Check-in Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Check-in</Text>
              <Text style={styles.sectionValue}>{safeFormatDate(reservation.arrivalDate)}</Text>
            </View>
            
            {/* Checkout Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Checkout</Text>
              <Text style={styles.sectionValue}>{safeFormatDate(reservation.departureDate)}</Text>
            </View>
            
            {/* Booking date Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Booking date</Text>
              <Text style={styles.sectionValue}>{safeFormatDate(reservation.bookingDate)}</Text>
            </View>
            
            {/* Confirmation code Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Confirmation code</Text>
              <Text style={styles.sectionValue}>{reservation.confirmationCode || 'N/A'}</Text>
            </View>
            
            {/* Cancellation policy Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cancellation policy</Text>
              <Text style={styles.sectionValue}>{reservation.cancellationPolicy || 'Standard'}</Text>
            </View>
            
            {/* Host payout Section */}
            <View style={styles.financialSection}>
              <Text style={styles.financialSectionTitle}>Host payout</Text>
              
              {/* Income Section */}
              <View style={styles.financialSubsection}>
                <Text style={styles.financialSubheader}>Income</Text>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Base Rate</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(calculateBaseRate())}
                  </Text>
                </View>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Cleaning Fee</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(parseNumber(reservation.cleaningFee))}
                  </Text>
                </View>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Tourism Tax</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(parseNumber(
                      (reservation.financialData ? reservation.financialData.totalTax : 0) || 
                      reservation.tourismFee || 
                      (reservation.financialData ? (reservation.financialData.tourismFee || reservation.financialData.cityTax || 0) : 0)
                    ))}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>Total Income</Text>
                  <Text style={[styles.financialValue, styles.boldValue]}>
                    {formatCurrency(
                      calculateBaseRate() +
                      parseNumber(reservation.cleaningFee || 0) +
                      parseNumber(
                        (reservation.financialData ? reservation.financialData.totalTax : 0) || 
                        reservation.tourismFee || 
                        (reservation.financialData ? (reservation.financialData.tourismFee || reservation.financialData.cityTax || 0) : 0)
                      )
                    )}
                  </Text>
                </View>
              </View>
              
              {/* Fees Section */}
              <View style={styles.financialSubsection}>
                <Text style={styles.financialSubheader}>Fees</Text>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Processing Fee</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(parseNumber(reservation.processingFee || reservation.paymentProcessingFee || 0))}
                  </Text>
                </View>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Channel Fee</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(getChannelFee())}
                  </Text>
                </View>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Management Fee</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(getManagementFee())}
                  </Text>
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>Total Fees</Text>
                  <Text style={[styles.financialValue, styles.boldValue]}>
                    {formatCurrency(
                      parseNumber(reservation.processingFee || reservation.paymentProcessingFee || 0) +
                      getChannelFee() +
                      getManagementFee()
                    )}
                  </Text>
                </View>
              </View>
              
              {/* Summary Section */}
              <View style={styles.financialSubsection}>
                <Text style={styles.financialSubheader}>Summary</Text>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>Owner Payout</Text>
                  <Text style={[styles.financialValue, styles.boldValue]}>
                    {incompleteFinancialData ? 
                      "$0.00" : 
                      formatCurrency(parseNumber(reservation.hostPayout || reservation.airbnbExpectedPayoutAmount || reservation.ownerPayout))}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Add some space at the bottom */}
            <View style={styles.bottomSpace} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  // New guest section styles
  guestSection: {
    marginBottom: 20,
  },
  confirmedText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  guestInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  guestInfo: {
    flex: 1,
    paddingRight: 16,
  },
  guestName: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 8,
  },
  propertyDetails: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  stayDates: {
    fontSize: 16,
    marginBottom: 8,
  },
  guestSummary: {
    fontSize: 16,
  },
  guestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
  },
  divider: {
    height: 8,
    backgroundColor: '#f5f5f5',
    marginHorizontal: -20,
    marginBottom: 20,
  },
  // Existing styles
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 24,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    color: '#333',
  },
  calendarButton: {
    marginVertical: 24,
  },
  calendarButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  financialSection: {
    marginVertical: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  financialSectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  financialText: {
    fontSize: 14,
    color: '#333',
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  bottomSpace: {
    height: 50,
  },
  financialSubsection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  financialSubheader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#BB9F5D',
    marginBottom: 12,
  },
  boldValue: {
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  // Channel styles
  channelTag: {
    marginBottom: 8,
  },
  channelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  channelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  channelBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReservationDetailModal; 