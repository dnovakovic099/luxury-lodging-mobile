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
import PropertyUpgrades from '../components/PropertyUpgrades';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getListingFinancials, getMonthlyRevenueData } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const { listings, refreshData, isLoading: authLoading, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [futureRevenue, setFutureRevenue] = useState(0);
  const [sharingRevenue, setSharingRevenue] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  
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

  // Load financial data directly from API
  const loadFinancialData = async () => {
    if (!listings || !listings.length) {
      console.log('No listings available, skipping financial data fetch');
      return;
    }
    
    setLoading(true);
    console.log('Current Revenue Summary Data:', {futureRevenue, sharingRevenue, totalRevenue});
    
    try {
      // Get all listing IDs and ensure they are numbers
      const listingIds = listings.map(listing => Number(listing.id)).filter(id => !isNaN(id));
      console.log(`Using ${listingIds.length} listings for financial data:`, listingIds);
      
      // Format current date for API
      const formatDateForApi = (date) => {
        if (!date) return null;
        const correctedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return correctedDate.toISOString().split('T')[0];
      };
      
      // Get today's date
      const today = new Date();
      const todayStr = formatDateForApi(today);
      
      // Create a date 2 years in the future for future revenue
      const twoYearsFromNow = new Date(today);
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      const futureStr = formatDateForApi(twoYearsFromNow);
      
      // 1. First, get total historical revenue (all time)
      const totalRevenueParams = {
        listingMapIds: listingIds,
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      };
      
      console.log('Fetching total revenue with params:', JSON.stringify(totalRevenueParams));
      const totalRevenueData = await getListingFinancials(totalRevenueParams);
      console.log('TOTAL REVENUE - ownerPayout:', totalRevenueData?.result?.ownerPayout);
      
      // 2. Get future revenue with an explicit long date range (from today to 2 years in future)
      const futureRevenueParams = {
        listingMapIds: listingIds,
        fromDate: todayStr,
        toDate: futureStr,
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      };
      
      console.log('Fetching future revenue with explicit date range:', JSON.stringify(futureRevenueParams));
      const futureRevenueData = await getListingFinancials(futureRevenueParams);
      console.log('FUTURE REVENUE (from API) - ownerPayout:', futureRevenueData?.result?.ownerPayout);
      
      // Set total revenue from API
      const extractedTotalRevenue = totalRevenueData?.result?.ownerPayout || 0;
      // Use the explicit future revenue from API instead of calculating from monthly data
      const explicitFutureRevenue = futureRevenueData?.result?.ownerPayout || 0;
      
      setTotalRevenue(extractedTotalRevenue);
      setFutureRevenue(explicitFutureRevenue);
      
      // 3. Get monthly revenue data for chart directly from API
      console.log('Fetching monthly revenue data for chart...');
      const monthlyData = await getMonthlyRevenueData(listingIds, 6); // Get 6 months of data
      
      // Format the data for the chart component
      const formattedChartData = {
        '6M': {
          labels: monthlyData.labels,
          data: monthlyData.data,
          total: monthlyData.total
        },
        // You can add other time periods if needed
        'ALL': {
          labels: monthlyData.labels,
          data: monthlyData.data,
          total: monthlyData.total
        }
      };
      
      setChartData(formattedChartData);
      
      console.log('Updated Revenue Summary Data:', {
        totalRevenue: extractedTotalRevenue,
        futureRevenue: explicitFutureRevenue,
        sharingRevenue, 
        chartTotal: monthlyData.total,
        monthlyDataLabels: monthlyData.labels.join(', '),
        monthlyDataValues: monthlyData.data.join(', ')
      });
      
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
          sharingRevenue: sharingRevenue
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
          sharingRevenue 
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

