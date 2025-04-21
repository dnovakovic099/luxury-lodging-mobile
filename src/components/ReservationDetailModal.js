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
import { format } from 'date-fns';
import { theme } from '../theme';

// Channel colors
const CHANNEL_COLORS = {
  airbnb: '#FF385C',   // Red for Airbnb
  vrbo: '#3D89DE',     // Blue for VRBO
  default: '#D4A017'   // Darker matte gold for everything else
};

const ReservationDetailModal = ({ visible, onClose, reservation }) => {
  if (!reservation) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'EEE, MMM d, yyyy');
  };

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
    
    return baseRate;
  };

  const calculateNightsCount = () => {
    if (!reservation.arrivalDate || !reservation.departureDate) return 0;
    const arrival = new Date(reservation.arrivalDate);
    const departure = new Date(reservation.departureDate);
    const diffTime = Math.abs(departure - arrival);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  const channelInfo = getChannelInfo();
  const nightsCount = calculateNightsCount();
  const guestCountText = `${reservation.adultCount} adult${reservation.adultCount !== 1 ? 's' : ''}${
    reservation.childrenCount ? `, ${reservation.childrenCount} child${reservation.childrenCount !== 1 ? 'ren' : ''}` : ''}${
    reservation.infantCount ? `, ${reservation.infantCount} infant${reservation.infantCount !== 1 ? 's' : ''}` : ''}`;
  
  // Format date range for the header (e.g., "May 8 – 15 (7 nights)")
  const formatDateRange = () => {
    if (!reservation.arrivalDate || !reservation.departureDate) return '';
    const arrival = new Date(reservation.arrivalDate);
    const departure = new Date(reservation.departureDate);
    
    // If same month, show "Month StartDay – EndDay (X nights)"
    if (arrival.getMonth() === departure.getMonth()) {
      return `${format(arrival, 'MMM d')} – ${format(departure, 'd')} (${nightsCount} nights)`;
    }
    // If different months, show "StartMonth StartDay – EndMonth EndDay (X nights)"
    return `${format(arrival, 'MMM d')} – ${format(departure, 'MMM d')} (${nightsCount} nights)`;
  };

  const dateRange = formatDateRange();

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
              <Text style={styles.sectionValue}>{formatDate(reservation.arrivalDate)}</Text>
            </View>
            
            {/* Checkout Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Checkout</Text>
              <Text style={styles.sectionValue}>{formatDate(reservation.departureDate)}</Text>
            </View>
            
            {/* Booking date Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Booking date</Text>
              <Text style={styles.sectionValue}>{formatDate(reservation.bookingDate)}</Text>
            </View>
            
            {/* Confirmation code Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Confirmation code</Text>
              <Text style={styles.sectionValue}>{reservation.confirmationCode}</Text>
            </View>
            
            {/* Cancellation policy Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cancellation policy</Text>
              <Text style={styles.sectionValue}>{reservation.cancellationPolicy}</Text>
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
                    {formatCurrency(parseNumber(reservation.channelFee))}
                  </Text>
                </View>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Management Fee</Text>
                  <Text style={styles.financialValue}>
                    {formatCurrency(parseNumber(reservation.managementFee))}
                  </Text>
                </View>
                
                <View style={styles.financialRow}>
                  <Text style={styles.financialText}>Total Fees</Text>
                  <Text style={[styles.financialValue, styles.boldValue]}>
                    {formatCurrency(
                      parseNumber(reservation.processingFee || reservation.paymentProcessingFee || 0) +
                      parseNumber(reservation.channelFee || 0) +
                      parseNumber(reservation.managementFee || 0)
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
                    {formatCurrency(parseNumber(reservation.hostPayout || reservation.airbnbExpectedPayoutAmount || reservation.ownerPayout))}
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
    fontSize: 16,
    color: '#333',
  },
  financialValue: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#BB9F5D',
    marginBottom: 10,
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