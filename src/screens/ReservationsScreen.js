import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Dimensions,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import ReservationsTable from '../components/ReservationsTable';
import CustomDropdown from '../components/CustomDropdown';
import DateRangePicker from '../components/DateRangePicker';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getReservationsWithFinancialData } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const SummaryCard = ({ title, value, isCount, color }) => {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color: color || '#B69D74' }]}>
        {isCount ? value : formatCurrency(value)}
      </Text>
    </View>
  );
};

const ReservationsScreen = ({ navigation }) => {
  const { reservations: initialReservations, listings, refreshData, isLoading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [selectedListing, setSelectedListing] = useState('All Properties');
  const [startDate, setStartDate] = useState(new Date()); // Default to today
  const [endDate, setEndDate] = useState(null); // Default to null (all future reservations)
  const [showFilters, setShowFilters] = useState(false);
  
  // Create listing options for dropdown
  const listingOptions = React.useMemo(() => {
    if (!listings || !listings.length) return ['All Properties'];
    
    // Extract property names
    const propertyNames = listings.map(listing => 
      listing.name || `Property ${listing.id}`
    );
    
    // Add "All Properties" option at the beginning
    return ['All Properties', ...propertyNames];
  }, [listings]);
  
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
    setSelectedListing('All Properties');
    setStartDate(new Date());
    setEndDate(null);
  };
  
  // Load reservations with filters
  const loadFilteredReservations = async () => {
    if (!listings || !listings.length) {
      console.log('No listings available, skipping reservation fetch');
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
      if (selectedListing !== 'All Properties' && listings) {
        // Find the selected listing by name
        const selectedListingObj = listings.find(
          listing => (listing.name || `Property ${listing.id}`) === selectedListing
        );
        
        if (selectedListingObj && selectedListingObj.id) {
          // Use the numeric ID
          const selectedListingId = Number(selectedListingObj.id);
          relevantListingIds = [selectedListingId];
          console.log(`Selected specific listing ID: ${selectedListingId}`);
        } else {
          console.log(`Could not find listing with name: ${selectedListing}`);
          // Fallback to all listings if we can't find the selected one
          relevantListingIds = listings.map(listing => Number(listing.id)).filter(id => !isNaN(id));
        }
      } else {
        // If "All Properties" is selected, include all listing IDs
        // Ensure they are numbers and filter out any NaN values
        relevantListingIds = listings.map(listing => Number(listing.id)).filter(id => !isNaN(id));
        console.log(`Using all listing IDs: [${relevantListingIds.join(', ')}]`);
      }
      
      // Common parameters for all API calls
      const baseParams = {
        fromDate: formatDateForApi(startDate),
        toDate: formatDateForApi(endDate),
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      };
      
      let allReservations = [];
      
      if (relevantListingIds.length === 1) {
        // If there's just one listing, make a single call
        const params = {
          ...baseParams,
          listingMapIds: [relevantListingIds[0]]
        };
        
        console.log('Fetching reservations for single listing with params:', JSON.stringify(params));
        const result = await getReservationsWithFinancialData(params);
        
        if (result?.reservations && Array.isArray(result.reservations)) {
          allReservations = result.reservations;
        }
      } else {
        // For multiple listings, we need to make separate API calls for each listing
        console.log(`Need to fetch reservations for ${relevantListingIds.length} listings individually`);
        
        // Fetch reservations for each listing separately
        for (const listingId of relevantListingIds) {
          const params = {
            ...baseParams,
            listingMapIds: [listingId]
          };
          
          console.log(`Fetching reservations for listing ${listingId}...`);
          const result = await getReservationsWithFinancialData(params);
          
          if (result?.reservations && Array.isArray(result.reservations)) {
            allReservations = [...allReservations, ...result.reservations];
          }
        }
        
        console.log(`Combined a total of ${allReservations.length} reservations from all listings`);
      }
      
      // Further filter by valid statuses if needed
      const validReservations = allReservations.filter(res => 
        VALID_STATUSES.includes(res.status)
      );
      
      // Sort reservations by arrival date (most recent first)
      const sortedReservations = validReservations.sort((a, b) => {
        const dateA = new Date(a.arrivalDate || a.checkInDate);
        const dateB = new Date(b.arrivalDate || b.checkInDate);
        return dateB - dateA;
      });
      
      // Log the first reservation and its ownerPayout for debugging
      if (sortedReservations.length > 0) {
        const first = sortedReservations[0];
        console.log('First reservation data:', {
          id: first.id,
          property: first.listingId || first.listingMapId,
          arrivalDate: first.arrivalDate || first.checkInDate,
          ownerPayout: first.ownerPayout,
          financialData: first.financialData ? 'present' : 'missing',
        });
      } else {
        console.log('No reservations found matching criteria');
      }
      
      setFilteredReservations(sortedReservations);
      console.log(`Loaded ${sortedReservations.length} filtered reservations (from ${allReservations.length} total)`);
    } catch (error) {
      console.error('Error loading reservations:', error);
      setFilteredReservations([]);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };
  
  // Apply filters when they change
  useEffect(() => {
    console.log('Filter changed, reloading reservations with:', {
      listing: selectedListing,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      listingsCount: listings?.length || 0
    });
    
    // Add a small timeout to prevent rapid concurrent requests
    const timeoutId = setTimeout(() => {
      loadFilteredReservations();
    }, 100);
    
    // Cleanup the timeout if the effect runs again before it fires
    return () => clearTimeout(timeoutId);
  }, [selectedListing, startDate, endDate, listings]);
  
  // Make sure we're logging the financial data for debugging
  useEffect(() => {
    if (filteredReservations.length > 0) {
      console.log('First reservation sample:', 
        JSON.stringify({
          id: filteredReservations[0].id,
          ownerPayout: filteredReservations[0].ownerPayout,
          financialData: filteredReservations[0].financialData
        }, null, 2)
      );
    }
  }, [filteredReservations]);
  
  // Initialize with all reservations
  useEffect(() => {
    if (initialReservations && !filteredReservations.length) {
      setFilteredReservations(initialReservations.filter(res => 
        VALID_STATUSES.includes(res.status)
      ));
    }
  }, [initialReservations]);

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
    console.log(reservation);
    navigation.navigate('ReservationDetail', { reservation });
  };

  if ((isLoading || authLoading) && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading reservations...</Text>
      </View>
    );
  }

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    // Adjust for timezone to prevent off-by-one errors
    const correctedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return correctedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Filters Section */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity 
          style={styles.filtersToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filtersToggleText}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Text>
          <Ionicons 
            name={showFilters ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
        
        {showFilters && (
          <View style={styles.filtersContent}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Property:</Text>
              <View style={styles.filterControl}>
                <CustomDropdown
                  options={listingOptions}
                  selectedValue={selectedListing}
                  onSelect={handleListingSelect}
                  placeholder="Select Property"
                  icon="home-outline"
                />
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Arrival Date:</Text>
              <View style={styles.dateFilters}>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.dateLabel}>From</Text>
                  <DateRangePicker
                    selectedDate={startDate}
                    onDateSelect={handleStartDateSelect}
                    placeholder="Start Date"
                  />
                </View>
                <View style={styles.datePickerContainer}>
                  <Text style={styles.dateLabel}>To</Text>
                  <DateRangePicker
                    selectedDate={endDate}
                    onDateSelect={handleEndDateSelect}
                    placeholder="End Date (Optional)"
                    minimumDate={startDate}
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetButton} 
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
              
              <View style={styles.activeFilters}>
                <Text style={styles.activeFiltersText}>
                  {selectedListing !== 'All Properties' && `Property: ${selectedListing}`}
                  {selectedListing !== 'All Properties' && (startDate || endDate) && ' • '}
                  {startDate && `From: ${formatDate(startDate)}`}
                  {startDate && endDate && ' • '}
                  {endDate && `To: ${formatDate(endDate)}`}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.dashboardContainer}>
        <View style={styles.dashboardCards}>
          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardCardLabel}>Bookings</Text>
            <Text style={styles.dashboardCardValue}>{totalBookings}</Text>
          </View>
          
          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardCardLabel}>Base Rate</Text>
            <Text style={styles.dashboardCardValue}>{formatCurrency(financialTotals.baseRate)}</Text>
          </View>
          
          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardCardLabel}>Cleaning Fee</Text>
            <Text style={styles.dashboardCardValue}>{formatCurrency(financialTotals.cleaningFee)}</Text>
          </View>
          
          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardCardLabel}>Owner Payout</Text>
            <Text style={styles.dashboardCardValue}>{formatCurrency(financialTotals.ownerPayout)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableContainer}>
        {filteredReservations && filteredReservations.length > 0 ? (
          <ReservationsTable
            reservations={filteredReservations}
            onRowPress={handleRowPress}
            showPropertyName={true}
            loading={loading || refreshing}
            onRefresh={onRefresh}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No reservations found matching your criteria.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.secondary,
  },
  tableContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  dashboardContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  dashboardCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  dashboardCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    width: '48%',
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dashboardCardLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  dashboardCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // New styles for filters
  filtersContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    overflow: 'hidden',
  },
  filtersToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  filtersToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  filtersContent: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.card.border,
  },
  filterRow: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  filterControl: {
    // Dropdown inherits its own styles
  },
  dateFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  datePickerContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  resetButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.md,
  },
  resetButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  activeFilters: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  activeFiltersText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 0,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#B69D74',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  emptyStateText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ReservationsScreen;
