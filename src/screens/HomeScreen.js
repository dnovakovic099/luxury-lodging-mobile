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
import UpcomingReservations from '../components/UpcomingReservations';

const HomeScreen = ({ navigation }) => {
  const { listings, upcomingReservations, refreshData, isLoading: authLoading, signOut, user, fetchUpcomingReservations, upcomingReservationsLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [futureRevenue, setFutureRevenue] = useState(0);
  const [sharingRevenue, setSharingRevenue] = useState(0);
  const [chartData, setChartData] = useState({
    '6M': { labels: [], data: [], years: [], total: 0 },
    'YTD': { labels: [], data: [], years: [], total: 0 },
    '2024': { labels: [], data: [], years: [], total: 0 },
    'ALL': { labels: [], data: [], years: [], total: 0 }
  });
  const [loading, setLoading] = useState(true);
  
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
      const monthlyData = await getMonthlyRevenueData(listingIds, 24); // Get 24 months of data for better filtering
      
      // Make sure we have years data, if not, generate it
      if (!monthlyData.years || monthlyData.years.length === 0) {
        monthlyData.years = [];
        const currentMonth = today.getMonth();
        
        // Go backward 24 months from today to match our data
        for (let i = 0; i < monthlyData.labels.length; i++) {
          const monthOffset = monthlyData.labels.length - 1 - i;
          const date = new Date(today);
          date.setMonth(currentMonth - monthOffset);
          monthlyData.years.push(date.getFullYear());
        }
        console.log('Generated years for monthly data:', monthlyData.years);
      }
      
      console.log('MONTHLY DATA:', monthlyData);
      
      // Process data for different time periods
      const currentYear = new Date().getFullYear();
      const currentMonth = today.getMonth();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Create empty datasets for each view
      const sixMonthsData = {
        labels: [],
        data: [],
        years: [],
        total: 0
      };
      
      const ytdData = {
        labels: [],
        data: [],
        years: [],
        total: 0
      };
      
      const mtdData = {
        labels: [],
        data: [],
        years: [],
        total: 0
      };
      
      const year2024Data = {
        labels: [],
        data: [],
        years: [],
        total: 0
      };
      
      // Calculate the date 6 months ago from today
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(today.getMonth() - 5); // -5 because we want 6 months INCLUDING current month
      const sixMonthsAgoYear = sixMonthsAgo.getFullYear();
      const sixMonthsAgoMonth = sixMonthsAgo.getMonth();
      
      // Process all monthly data to filter for each view
      for (let i = 0; i < monthlyData.labels.length; i++) {
        const month = monthlyData.labels[i];
        const value = monthlyData.data[i];
        const year = monthlyData.years[i];
        const monthIndex = months.indexOf(month);
        
        // Calculate date for this data point (for comparison with sixMonthsAgo)
        const dataDate = new Date(year, monthIndex, 1);
        
        // 1. Last 6 months - Include if date is on or after sixMonthsAgo
        if (dataDate >= sixMonthsAgo) {
          sixMonthsData.labels.push(month);
          sixMonthsData.data.push(value);
          sixMonthsData.years.push(year);
          sixMonthsData.total += value;
        }
        
        // 2. YTD - Current year only
        if (year === currentYear) {
          ytdData.labels.push(month);
          ytdData.data.push(value);
          ytdData.years.push(year);
          ytdData.total += value;
        }
        
        // 3. MTD - Current month and year only
        if (year === currentYear && monthIndex === currentMonth) {
          mtdData.labels.push(month);
          mtdData.data.push(value);
          mtdData.years.push(year);
          mtdData.total += value;
        }
        
        // 4. 2024 specific data
        if (year === 2024) {
          // We need to make sure the data is ordered by month (Jan-Dec)
          const existing2024Index = year2024Data.labels.indexOf(month);
          
          if (existing2024Index === -1) {
            // Add the month in the right position
            let insertIndex = 0;
            while (insertIndex < year2024Data.labels.length && 
                  months.indexOf(year2024Data.labels[insertIndex]) < monthIndex) {
              insertIndex++;
            }
            
            year2024Data.labels.splice(insertIndex, 0, month);
            year2024Data.data.splice(insertIndex, 0, value);
            year2024Data.years.splice(insertIndex, 0, year);
            year2024Data.total += value;
          }
        }
      }
      
      // Ensure 2024 data has all months (even if empty)
      if (year2024Data.labels.length < 12) {
        const fullYear2024 = {
          labels: months.slice(),
          data: Array(12).fill(0),
          years: Array(12).fill(2024),
          total: 0
        };
        
        // Copy existing 2024 data into the full year structure
        for (let i = 0; i < year2024Data.labels.length; i++) {
          const monthName = year2024Data.labels[i];
          const monthIndex = months.indexOf(monthName);
          if (monthIndex !== -1) {
            fullYear2024.data[monthIndex] = year2024Data.data[i];
            fullYear2024.total += year2024Data.data[i];
          }
        }
        
        // Replace with full structure
        year2024Data.labels = fullYear2024.labels;
        year2024Data.data = fullYear2024.data;
        year2024Data.years = fullYear2024.years;
        year2024Data.total = fullYear2024.total;
      }
      
      // Ensure each view has at least minimal structure
      if (sixMonthsData.labels.length === 0) {
        sixMonthsData.labels = months.slice(currentMonth - 5 < 0 ? 0 : currentMonth - 5, currentMonth + 1);
        sixMonthsData.data = Array(sixMonthsData.labels.length).fill(0);
        sixMonthsData.years = Array(sixMonthsData.labels.length).fill(currentYear);
      }
      
      if (ytdData.labels.length === 0) {
        ytdData.labels = months.slice(0, currentMonth + 1);
        ytdData.data = Array(ytdData.labels.length).fill(0);
        ytdData.years = Array(ytdData.labels.length).fill(currentYear);
      }
      
      if (mtdData.labels.length === 0) {
        mtdData.labels = [months[currentMonth]];
        mtdData.data = [0];
        mtdData.years = [currentYear];
      }
      
      // Format the data for the chart component
      const formattedChartData = {
        '6M': sixMonthsData,
        'YTD': ytdData,
        'MTD': mtdData,
        '2024': year2024Data,
        'ALL': sixMonthsData // Keep ALL data the same as 6M for backward compatibility
      };
      
      setChartData(formattedChartData);
      
      console.log('Updated Revenue Summary Data:', {
        totalRevenue: extractedTotalRevenue,
        futureRevenue: explicitFutureRevenue,
        sharingRevenue,
        sixMonthsLabels: sixMonthsData.labels.join(', '),
        sixMonthsYears: sixMonthsData.years.join(', '),
        ytdLabels: ytdData.labels.join(', '),
        ytdYears: ytdData.years.join(', '),
        year2024Labels: year2024Data.labels.join(', '),
        year2024Total: year2024Data.total
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
    fetchUpcomingReservations();
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
    // Refresh both financial data and upcoming reservations
    Promise.all([
      loadDashboardData(),
      fetchUpcomingReservations()
    ])
    .finally(() => setRefreshing(false));
  }, []);
  
  // Function to handle data fetching for different chart views
  const handleChartDataFetch = async (viewMode, yearInfo) => {
    console.log(`Fetching data for ${viewMode} view with year info:`, yearInfo);
    
    try {
      // Check if we already have data for this viewMode
      if (chartData && chartData[viewMode]?.data?.length > 0) {
        console.log(`[HOME] Already have ${viewMode} data, returning existing data`);
        return Promise.resolve(chartData[viewMode]);
      }
      
      // Get listing IDs
      const listingIds = listings.map(listing => Number(listing.id)).filter(id => !isNaN(id));
      
      if (!listingIds.length) {
        console.log('[HOME] No listing IDs available for data fetch');
        return Promise.resolve(null);
      }
      
      // Get fresh monthly data from API
      const monthlyData = await getMonthlyRevenueData(listingIds, 24);
      
      if (!monthlyData || !monthlyData.labels || !monthlyData.data) {
        console.error('[HOME] Invalid monthly data received');
        return Promise.resolve(null);
      }
      
      // Process the data based on view mode
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Create a deep copy of chart data to avoid reference issues
      let updatedChartData = JSON.parse(JSON.stringify(chartData));
      
      // For YTD view
      if (viewMode === 'YTD') {
        const ytdData = {
          labels: [],
          data: [],
          years: [],
          total: 0
        };
        
        // Filter data for current year
        for (let i = 0; i < monthlyData.labels.length; i++) {
          const month = monthlyData.labels[i];
          const value = monthlyData.data[i];
          const year = monthlyData.years?.[i] || currentYear;
          const monthIndex = months.indexOf(month);
          
          if (year === currentYear) {
            ytdData.labels.push(month);
            ytdData.data.push(value);
            ytdData.years.push(year);
            ytdData.total += value;
          }
        }
        
        // Ensure we have data for all months up to current month
        if (ytdData.labels.length === 0) {
          ytdData.labels = months.slice(0, currentMonth + 1);
          ytdData.data = Array(ytdData.labels.length).fill(0);
          ytdData.years = Array(ytdData.labels.length).fill(currentYear);
        }
        
        // Use uppercase key for YTD view
        updatedChartData['YTD'] = ytdData;
      }
      
      // For 2024 view
      if (viewMode === '2024') {
        const year2024Data = {
          labels: [],
          data: [],
          years: [],
          total: 0
        };
        
        // Filter data for 2024
        for (let i = 0; i < monthlyData.labels.length; i++) {
          const month = monthlyData.labels[i];
          const value = monthlyData.data[i];
          const year = monthlyData.years?.[i] || currentYear;
          const monthIndex = months.indexOf(month);
          
          if (year === 2024) {
            // We need to make sure the data is ordered by month (Jan-Dec)
            const existing2024Index = year2024Data.labels.indexOf(month);
            
            if (existing2024Index === -1) {
              // Add the month in the right position
              let insertIndex = 0;
              while (insertIndex < year2024Data.labels.length && 
                   months.indexOf(year2024Data.labels[insertIndex]) < monthIndex) {
                insertIndex++;
              }
              
              year2024Data.labels.splice(insertIndex, 0, month);
              year2024Data.data.splice(insertIndex, 0, value);
              year2024Data.years.splice(insertIndex, 0, year);
              year2024Data.total += value;
            }
          }
        }
        
        // Ensure 2024 data has all months (even if empty)
        if (year2024Data.labels.length < 12) {
          const fullYear2024 = {
            labels: months.slice(),
            data: Array(12).fill(0),
            years: Array(12).fill(2024),
            total: 0
          };
          
          // Copy existing 2024 data into the full year structure
          for (let i = 0; i < year2024Data.labels.length; i++) {
            const monthName = year2024Data.labels[i];
            const monthIndex = months.indexOf(monthName);
            if (monthIndex !== -1) {
              fullYear2024.data[monthIndex] = year2024Data.data[i];
              fullYear2024.total += year2024Data.data[i];
            }
          }
          
          // Use the prepared data for 2024 view
          updatedChartData['2024'] = fullYear2024;
        } else {
          updatedChartData['2024'] = year2024Data;
        }
      }
      
      // Log data for debugging
      console.log(`[HOME] Updated ${viewMode} data:`, 
        updatedChartData[viewMode]?.labels?.length, 
        updatedChartData[viewMode]?.data?.length
      );
      
      // Set the updated chart data
      setChartData(updatedChartData);
      
      // Return the specific view data
      return Promise.resolve(updatedChartData[viewMode] || null);
      
    } catch (error) {
      console.error(`Error fetching data for ${viewMode} view:`, error);
      return Promise.reject(error);
    }
  };
  
  const renderChart = () => {
    if (loading && !chartData['6M']?.data?.length) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
        </View>
      );
    }
    
    return <RevenueChart 
      data={chartData} 
      loading={loading} 
      onFetchData={handleChartDataFetch}
    />;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Debug log for upcoming reservations from AuthContext
  useEffect(() => {
    if (upcomingReservations) {
      console.log('HomeScreen: Upcoming reservations count:', upcomingReservations.length);
      if (upcomingReservations.length > 0) {
        console.log('HomeScreen: Upcoming reservations sample:', 
          upcomingReservations.map(r => ({
            id: r?.id,
            propertyName: r?.listingName || r?.property?.name || 'Unknown',
            arrival: r?.arrivalDate || r?.checkIn || 'No date',
            status: r?.status || 'No status'
          }))
        );
      }
    } else {
      console.log('HomeScreen: No upcoming reservations from AuthContext');
    }
  }, [upcomingReservations]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
        {/* TEST CALENDAR BUTTON */}
        {/* <TouchableOpacity 
          style={styles.calendarTestButton}
          onPress={() => navigation.navigate('Calendar')}
        >
          <Ionicons name="calendar" size={24} color="#FFFFFF" />
          <Text style={styles.calendarTestButtonText}>Open Calendar View</Text>
        </TouchableOpacity> */}

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

        {/* Debug revenue values being passed to RevenueSummary */}
        {console.log('Revenue Summary Data:', { 
          totalRevenue, 
          futureRevenue, 
          sharingRevenue 
        })}
        
        {/* Debug upcoming reservations data */}
        {console.log('Upcoming Reservations Data:', JSON.stringify({
          count: upcomingReservations?.length || 0,
          isArray: Array.isArray(upcomingReservations),
          uniqueListings: upcomingReservations ? 
            [...new Set(upcomingReservations.map(r => r?.listingName || r?.property?.name || r?.listing?.name))].filter(Boolean) : 'No reservations',
          data: upcomingReservations ? upcomingReservations.map(r => ({
            id: r?.id,
            listingId: r?.listingId,
            listingName: r?.listingName || r?.property?.name || r?.listing?.name || 'Unknown',
            checkIn: r?.checkIn || r?.arrivalDate,
            guest: r?.guest?.name,
            status: r?.status
          })) : 'No reservations'
        }))}

        <UpcomingReservations
          reservations={upcomingReservations}
          loading={upcomingReservationsLoading || authLoading}
        />
        
        {renderChart()}
        
        <PropertyUpgrades />
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 90,
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
  calendarTestButton: {
    backgroundColor: '#FF385C',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  calendarTestButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default HomeScreen;

