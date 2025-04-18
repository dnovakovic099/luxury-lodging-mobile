import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';
import moment from 'moment';
import { format, differenceInDays } from 'date-fns';
import { parseISO } from 'date-fns';
import { LinearGradient } from 'react-native-linear-gradient';

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

const FinancialRow = ({ label, value, type }) => {
  let valueStyle;
  
  switch (type) {
    case 'income':
      valueStyle = styles.incomeValue;
      break;
    case 'fee':
      valueStyle = styles.feeValue;
      break;
    case 'total':
      valueStyle = styles.totalValue;
      break;
    case 'payout':
      valueStyle = styles.payoutValue;
      break;
    default:
      valueStyle = styles.neutralValue;
  }
  
  return (
    <View style={styles.financialRow}>
      <Text style={styles.finRowLabel}>{label}</Text>
      <Text style={valueStyle}>{formatCurrency(value)}</Text>
    </View>
  );
};

// Summary card component for dashboard overview with modern styling
const SummaryCard = ({ label, value, icon, tint }) => {
  return (
    <View style={styles.summaryCard}>
      <LinearGradient
        colors={['rgba(40, 40, 40, 0.5)', 'rgba(25, 25, 25, 0.8)']}
        style={styles.summaryGradient}
      >
        <View style={[styles.summaryIcon, { backgroundColor: `${tint}15` }]}>
          <Icon name={icon} size={20} color={tint || '#B69D74'} />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={[styles.summaryValue, { color: tint || '#B69D74' }]}>{value}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// Export this component to be used in ReservationsScreen
export const ReservationsSummary = ({ bookings, totalRevenue, cleaningTotal, payoutTotal }) => {
  return (
    <View style={styles.summaryContainer}>
      <SummaryCard 
        label="Bookings" 
        value={bookings || '0'} 
        icon="calendar" 
        tint="#B69D74" 
      />
      <SummaryCard 
        label="Base Rate" 
        value={formatCurrency(totalRevenue || 0)} 
        icon="cash" 
        tint="#4CAF50" 
      />
      <SummaryCard 
        label="Cleaning Fee" 
        value={formatCurrency(cleaningTotal || 0)} 
        icon="brush" 
        tint="#4CAF50" 
      />
      <SummaryCard 
        label="Owner Payout" 
        value={formatCurrency(payoutTotal || 0)} 
        icon="wallet" 
        tint="#4CAF50" 
      />
    </View>
  );
};

const ReservationCard = ({ item }) => {
  const [showFinancials, setShowFinancials] = useState(false);
  
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
  let channelText = 'Luxury Lodging Direct';
  let channelColor = '#B69D74'; // Gold by default
  
  const channelLower = rawChannelName.toLowerCase();
  if (channelLower.includes('airbnb')) {
    channelText = 'Airbnb';
    channelColor = '#FF5A5F'; // Airbnb red
  } else if (channelLower.includes('vrbo') || channelLower.includes('homeaway')) {
    channelText = 'Vrbo';
    channelColor = '#3D91FF'; // Vrbo blue
  }
  
  // Check for possible financial data paths
  const financialsObj = item?.financials || item?.financial || item;
  
  // Extract financial data with no defaults
  const baseRate = parseNumber(financialsObj?.baseRate || findNestedProperty(item, 'baseRate'));
  const cleaningFee = parseNumber(financialsObj?.cleaningFee || findNestedProperty(item, 'cleaningFee'));
  const tourismTax = parseNumber(financialsObj?.cityTax || financialsObj?.tourismTax || findNestedProperty(item, 'cityTax') || findNestedProperty(item, 'tourismTax'));
  const petFee = parseNumber(financialsObj?.petFee || findNestedProperty(item, 'petFee'));
  
  // Calculate total
  const totalIncome = baseRate + cleaningFee + tourismTax + petFee;

  const processingFee = parseNumber(
    financialsObj?.financialData?.PaymentProcessing
  );
  const channelFee = parseNumber(financialsObj?.hostChannelFee || findNestedProperty(item, 'hostChannelFee'));
  const managementFee = parseNumber(financialsObj?.pmCommission || findNestedProperty(item, 'pmCommission'));
  const totalFees = processingFee + channelFee + managementFee;
  
  // Calculate payout with no defaults
  const providedPayout = parseNumber(financialsObj?.ownerPayout || findNestedProperty(item, 'ownerPayout') || item?.ownerPayout);
  const calculatedPayout = totalIncome - totalFees;
  
  // Use provided payout if available, otherwise use calculated
  const ownerPayout = providedPayout > 0 ? providedPayout : calculatedPayout;
  
  // Final payout value with no defaults
  const finalPayout = ownerPayout || parseNumber(item?.payout || item?.amount || item?.total);
  
  // Safely format dates with better error handling
  let formattedCheckIn = "N/A";
  let formattedCheckOut = "N/A";
  let nights = 0;
  
  try {
    // Try multiple possible date field names
    const checkInDate = item?.checkIn || item?.arrivalDate || item?.arrival || findNestedProperty(item, 'checkIn') || findNestedProperty(item, 'arrivalDate');
    const checkOutDate = item?.checkOut || item?.departureDate || item?.departure || findNestedProperty(item, 'checkOut') || findNestedProperty(item, 'departureDate');
    
    if (checkInDate) {
      formattedCheckIn = formatDate(checkInDate);
    }
    
    if (checkOutDate) {
      formattedCheckOut = formatDate(checkOutDate);
    }
    
    if (checkInDate && checkOutDate) {
      const startDate = new Date(checkInDate);
      const endDate = new Date(checkOutDate);
      
      if (startDate instanceof Date && !isNaN(startDate) && 
          endDate instanceof Date && !isNaN(endDate)) {
        nights = differenceInDays(endDate, startDate);
      }
    }
  } catch (error) {
    console.error("Error formatting dates:", error);
  }
  
  // Default nights if calculation failed but we have a nights value
  if (nights === 0 && item?.nights) {
    nights = parseNumber(item.nights);
  }
  
  const toggleFinancials = () => {
    setShowFinancials(!showFinancials);
  };

  return (
    <View style={styles.card}>
      {/* Property and Channel */}
      <View style={styles.cardHeader}>
        <Text style={styles.propertyName} numberOfLines={1}>
          {propertyName}
        </Text>
        <View style={[styles.channelTag, { backgroundColor: channelColor === '#B69D74' ? '#3A3A3A' : channelColor + '20' }]}>
          <Text style={[styles.channelText, { color: channelColor }]}>{channelText}</Text>
        </View>
      </View>
      
      {/* Guest Information */}
      <View style={styles.guestInfoContainer}>
        <Text style={styles.guestName} numberOfLines={1}>
          {guestName}
        </Text>
        
        <View style={styles.stayDetails}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>CHECK-IN</Text>
            <Text style={styles.dateValue}>{formattedCheckIn}</Text>
          </View>
          
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>CHECK-OUT</Text>
            <Text style={styles.dateValue}>{formattedCheckOut}</Text>
          </View>
          
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>NIGHTS</Text>
            <Text style={styles.dateValue}>{nights || 'N/A'}</Text>
          </View>
        </View>
      </View>
      
      {/* Payout Summary (Always Visible) */}
      <TouchableOpacity 
        style={[
          styles.payoutRow,
          showFinancials && styles.payoutRowExpanded
        ]}
        onPress={toggleFinancials}
        activeOpacity={0.7}
      >
        <View style={styles.payoutContent}>
          <Text style={styles.payoutLabel}>Owner Payout</Text>
          <Text style={styles.payoutValue}>
            {formatCurrency(finalPayout)}
          </Text>
        </View>
        <Icon 
          name={showFinancials ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#B69D74" 
        />
      </TouchableOpacity>
      
      {/* Collapsible Financial Details */}
      {showFinancials && (
        <View style={styles.financialDetails}>
          {/* Income Section */}
          <View style={styles.financialSection}>
            <Text style={styles.sectionTitle}>Income</Text>
            <FinancialRow label="Base Rate" value={baseRate} type="income" />
            <FinancialRow label="Cleaning Fee" value={cleaningFee} type="income" />
            {tourismTax > 0 && <FinancialRow label="City Tax" value={tourismTax} type="income" />}
            {petFee > 0 && <FinancialRow label="Pet Fee" value={petFee} type="income" />}
            <FinancialRow label="Total Income" value={totalIncome} type="total" />
          </View>
          
          {/* Fees Section */}
          <View style={styles.financialSection}>
            <Text style={styles.sectionTitle}>Fees</Text>
            {/* Always show processing fee */}
            <FinancialRow label="Processing Fee" value={processingFee} type="fee" />
            {channelFee > 0 && <FinancialRow label="Channel Fee" value={channelFee} type="fee" />}
            {managementFee > 0 && <FinancialRow label="Management Fee" value={managementFee} type="fee" />}
            <FinancialRow label="Total Fees" value={totalFees} type="fee" />
          </View>
          
          {/* Payout Section */}
          <View style={styles.financialSection}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <FinancialRow label="Owner Payout" value={finalPayout} type="payout" />
          </View>
        </View>
      )}
    </View>
  );
};

const ReservationsTable = ({ 
  reservations = [], 
  loading = false,
  onRefresh = () => {}
}) => {
  // Handle empty state
  if (!reservations || reservations.length === 0) {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B69D74" />
          <Text style={styles.emptyText}>Loading reservations...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="calendar-outline" size={48} color="#B69D74" />
        <Text style={styles.emptyText}>No reservations to display</Text>
      </View>
    );
  }

  // Reverse the order of reservations to display newest first
  const sortedReservations = [...reservations].reverse();

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedReservations}
        keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <ReservationCard item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshing={loading}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Summary dashboard styles
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  summaryCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 6,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // General container styles
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    padding: 16,
  },
  
  // Reservation card styles - REVERTED TO ORIGINAL
  card: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 60, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  channelTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guestInfoContainer: {
    marginBottom: 12,
  },
  guestName: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 10,
  },
  stayDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    borderRadius: 8,
    padding: 12,
  },
  dateInfo: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: '#777777',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 13,
    color: '#DDDDDD',
    fontWeight: '500',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 0,
  },
  payoutRowExpanded: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(70, 70, 70, 0.3)',
  },
  payoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    marginRight: 8,
  },
  payoutLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999999',
  },
  payoutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  financialDetails: {
    backgroundColor: 'rgba(25, 25, 25, 0.95)',
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    marginTop: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(70, 70, 70, 0.3)',
  },
  financialSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B69D74',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(70, 70, 70, 0.3)',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  finRowLabel: {
    fontSize: 13,
    color: '#888888',
  },
  neutralValue: {
    fontSize: 13,
    color: '#DDDDDD',
  },
  incomeValue: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 13,
    color: '#FF5A5F',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  
  // Empty and loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 16,
  },
  separator: {
    height: 12,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});

export default ReservationsTable;