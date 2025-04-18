import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Text
} from 'react-native';
import RevenueSummary from '../components/RevenueSummary';
import RevenueChart from '../components/RevenueChart';
import ListingActions from '../components/ListingActions';
import PropertyUpgrades from '../components/PropertyUpgrades';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { processRevenueData, getChartLabels } from '../utils/revenueUtils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getReservationsWithFinancialData } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const { reservations: authReservations, listings, refreshData, isLoading: authLoading, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [futureRevenue, setFutureRevenue] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

  // Mock data for listing actions
  const mockActions = [
    {
      date: '2024-03-27T14:30:00',
      listingName: 'Beach House',
      action: 'Updated pricing by adjusting the Base Rate by +5%'
    },
    {
      date: '2024-03-27T10:15:00',
      listingName: 'Mountain Cabin',
      action: 'Auditing new booking - Investigating potential income in March and April'
    },
    {
      date: '2024-03-26T16:45:00',
      listingName: 'Downtown Loft',
      action: 'Updating Cancellation Policy to Strict'
    }
  ];

  // Load reservations with financial data directly from API
  const loadFinancialData = async () => {
    if (!listings || !listings.length) {
      console.log('No listings available, skipping financial data fetch');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get all listing IDs
      const listingIds = listings.map(listing => listing.id);
      
      // Format current date for API
      const formatDateForApi = (date) => {
        if (!date) return null;
        const correctedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return correctedDate.toISOString().split('T')[0];
      };
      
      // Get today's date for future revenue calculation
      const today = new Date();
      const todayStr = formatDateForApi(today);
      
      // Parameters for all reservations (no date limits)
      const allReservationsParams = {
        listingMapIds: listingIds,
        dateType: 'arrivalDate',
        status: 'confirmed'
      };
      
      console.log('Fetching all-time reservations with params:', allReservationsParams);
      const allReservationsResult = await getReservationsWithFinancialData(allReservationsParams);
      
      // Get valid reservations
      const validReservations = (allReservationsResult?.reservations || []).filter(res => 
        VALID_STATUSES.includes(res.status)
      );
      
      console.log(`Received ${validReservations.length} valid reservations with financial data`);
      
      // Log a few sample reservations for debugging
      if (validReservations.length > 0) {
        const samples = validReservations.slice(0, 3);
        samples.forEach((sample, index) => {
          console.log(`Sample ${index + 1}:`, {
            id: sample.id,
            status: sample.status,
            ownerPayout: sample.ownerPayout,
            arrival: sample.arrivalDate || sample.checkIn,
            hasFinancialData: !!sample.financialData
          });
        });
      }
      
      setReservations(validReservations);
      
      // Calculate total revenue from all valid reservations
      let totalRevenue = 0;
      let reservationsWithPayout = 0;
      
      validReservations.forEach(reservation => {
        // Use the ownerPayout field populated by getReservationsWithFinancialData
        const ownerPayout = parseFloat(reservation.ownerPayout || 0);
        
        if (!isNaN(ownerPayout) && ownerPayout > 0) {
          totalRevenue += ownerPayout;
          reservationsWithPayout++;
        }
      });
      
      console.log(`Found ${reservationsWithPayout} reservations with valid payouts, total: ${totalRevenue}`);
      setTotalRevenue(totalRevenue);
      
      // Calculate future revenue - reservations with check-in date today or later
      let totalFutureRevenue = 0;
      let futureReservationCount = 0;
      
      validReservations.forEach(reservation => {
        try {
          // Get check-in date
          const checkInDateStr = reservation?.checkIn || reservation?.arrivalDate || reservation?.arrival;
          if (!checkInDateStr) return;
          
          const checkInDate = new Date(checkInDateStr);
          if (isNaN(checkInDate.getTime())) return;
          
          // Current date at midnight
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          
          if (checkInDate >= currentDate) {
            const ownerPayout = parseFloat(reservation.ownerPayout || 0);
            
            if (!isNaN(ownerPayout) && ownerPayout > 0) {
              totalFutureRevenue += ownerPayout;
              futureReservationCount++;
            }
          }
        } catch (error) {
          console.error("Error processing date for future revenue:", error);
        }
      });
      
      console.log(`Found ${futureReservationCount} future reservations, total future revenue: ${totalFutureRevenue}`);
      setFutureRevenue(totalFutureRevenue);
      
      // Process chart data with accurate owner payout values
      const processedData = processRevenueData(validReservations);
      
      console.log('Chart data processed:', {
        periods: Object.keys(processedData || {}),
        hasData: processedData && processedData['6M'],
        monthlyRevenueLength: processedData && processedData['6M'] && processedData['6M'].data.length,
        total: processedData && processedData['6M'] && processedData['6M'].total
      });
      
      setChartData(processedData);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when listings change
  useEffect(() => {
    if (listings && listings.length > 0) {
      loadFinancialData();
    }
  }, [listings]);

  // Initialize with reservations from auth context
  useEffect(() => {
    if (authReservations && authReservations.length > 0 && reservations.length === 0) {
      const validAuthReservations = authReservations.filter(res => 
        VALID_STATUSES.includes(res.status)
      );
      
      setReservations(validAuthReservations);
      
      // Process initial chart data if needed
      if (!chartData && validAuthReservations.length > 0) {
        const initialChartData = processRevenueData(validAuthReservations);
        setChartData(initialChartData);
      }
    }
  }, [authReservations]);

  // Refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });
    return unsubscribe;
  }, [navigation]);
  
  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Directly call loadFinancialData which already does all the data fetching
      await loadFinancialData();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData().then(() => setRefreshing(false));
  }, []);
  
  const renderChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
        </View>
      );
    }
    
    return <RevenueChart data={chartData} loading={loading} />;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Luxury Lodging Host</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
      
      <RevenueSummary 
        data={{
          totalRevenue: totalRevenue,
          futureRevenue: futureRevenue,
          sharingRevenue: 0
        }}
        loading={loading}
        style={styles.revenueSummary}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Debug revenue values being passed to RevenueSummary */}
        {console.log('Revenue Summary Data:', { 
          totalRevenue, 
          futureRevenue, 
          sharingRevenue: 0 
        })}

        <PropertyUpgrades />
        
        {renderChart()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000000',
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#B6944C',
    letterSpacing: 0.5,
  },
  revenueSummary: {
    marginTop: 0,
    marginBottom: 16,
  },
  signOutButton: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 24,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    borderRadius: 16,
    marginVertical: 8,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    marginTop: 16,
    fontSize: 14,
  },
});

export default HomeScreen;

