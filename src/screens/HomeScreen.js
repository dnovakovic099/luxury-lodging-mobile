import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  Animated,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import RevenueSummary from '../components/RevenueSummary';
import RevenueChart from '../components/RevenueChart';
import PropertyUpgrades from '../components/PropertyUpgrades';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getListingFinancials, getMonthlyRevenueData } from '../services/api';
import UpcomingReservations from '../components/UpcomingReservations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  saveToCache,
  loadFromCache,
  clearCache,
  CACHE_KEYS
} from '../utils/cacheUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gold color constants for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  gradient: '#D4AF37'
};

// Cache keys
const METRICS_CACHE = CACHE_KEYS.MONTHLY_REVENUE; // Use the standardized key from cacheUtils
const UPCOMING_RESERVATIONS_CACHE = CACHE_KEYS.UPCOMING_RESERVATIONS; // Use the standardized key from cacheUtils
// Set debug flag to false
const DEBUG_CACHE = false;

// Helper to get time of day greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

// Helper to format currency with cents
const formatFullCurrency = (value) => {
  if (typeof value !== 'number') return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const HomeScreen = ({ navigation }) => {
  const { 
    listings, 
    upcomingReservations, 
    refreshData, 
    isLoading: authLoading, 
    signOut, 
    userData,
    fetchUpcomingReservations, 
    upcomingReservationsLoading
  } = useAuth();
  const { theme: appTheme, isDarkMode, toggleTheme } = useTheme();
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  // Header animation based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, Platform.OS === 'ios' ? 45 + insets.top : 55],
    extrapolate: 'clamp'
  });
  
  // Run entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  // Log auth state on mount
  useEffect(() => {
    console.log('Auth state on mount:', { 
      userDataExists: !!userData,
      userDataValue: userData,
      authLoading,
      listingsCount: listings?.length
    });
    
    // Check if we still have metrics cache after sign-in
    if (userData && !authLoading) {
      checkCachePersistence();
    }
  }, [userData, authLoading]);
  
  // Log when auth loading state changes
  useEffect(() => {
    console.log('Auth loading changed:', { 
      authLoading, 
      userDataExists: !!userData 
    });
    
    // Log userData when auth is done loading
    if (!authLoading && userData) {
      console.log('User data after auth loaded:', userData);
      
      // Check for cache structure issues first
      Promise.all([
        checkAndFixCacheStructure(),
        checkCachePersistence()
      ]).then(([fixedMetricsData]) => {
        if (fixedMetricsData) {
          console.log('Found and potentially fixed metrics cache structure issue');
        }
        
        // Now ensure we load from cache when user signs back in
        if (DEBUG_CACHE) {
          console.log('Auth loaded - ensuring we load cached data');
        }
        
        // Load both metrics and reservations from cache
        Promise.all([
          loadMetricsFromCache(),
          loadReservationsFromCache()
        ]).then(([hasCachedMetrics, hasCachedReservations]) => {
          if (DEBUG_CACHE) {
            console.log('Cache load attempt after auth completed:', {
              hadCachedMetrics: hasCachedMetrics,
              hadCachedReservations: hasCachedReservations
            });
          }
        });
      });
    }
  }, [authLoading]);
  
  // Log when userData object changes
  useEffect(() => {
    console.log('User data changed:', userData);
  }, [userData]);
  
  // Add state for cached metrics
  const [metricsFromCache, setMetricsFromCache] = useState(false);
  const [reservationsFromCache, setReservationsFromCache] = useState(false);
  const [upcomingReservationsFromCache, setUpcomingReservationsFromCache] = useState(false);
  
  // Load metrics from cache
  const loadMetricsFromCache = async () => {
    try {
      if (DEBUG_CACHE) console.log('Attempting to load metrics from cache...');
      
      // First check if the cache key exists at all
      const allKeys = await AsyncStorage.getAllKeys();
      if (DEBUG_CACHE) console.log('All AsyncStorage keys:', allKeys);
      
      // Check specifically for our metrics key
      const hasMetricsCache = allKeys.includes(METRICS_CACHE);
      if (DEBUG_CACHE) console.log('Has metrics cache key:', hasMetricsCache);
      
      if (!hasMetricsCache) {
        return false;
      }
      
      // First try using the proper cacheUtils function to get the data
      const cachedMetrics = await loadFromCache(METRICS_CACHE);
      
      if (cachedMetrics) {
        if (DEBUG_CACHE) {
          console.log('Loaded metrics from cache successfully using cacheUtils');
          console.log('Cached metrics summary:', {
            hasTotalRevenue: cachedMetrics.totalRevenue !== undefined,
            totalRevenue: cachedMetrics.totalRevenue,
            hasFutureRevenue: cachedMetrics.futureRevenue !== undefined,
            futureRevenue: cachedMetrics.futureRevenue,
            hasChartData: !!cachedMetrics.chartData,
            chartDataKeys: cachedMetrics.chartData ? Object.keys(cachedMetrics.chartData) : []
          });
        }
        
        // Validate data quality - check if chart data has actual content
        let hasValidData = true;
        
        // Check if all values are zero/empty
        if (cachedMetrics.totalRevenue === 0 && cachedMetrics.futureRevenue === 0) {
          // If we have chart data, verify it's not just empty arrays
          if (cachedMetrics.chartData) {
            const chartDataKeys = Object.keys(cachedMetrics.chartData);
            if (chartDataKeys.length > 0) {
              // Check the first chart data set (e.g., '6M')
              const firstKey = chartDataKeys[0];
              const chartSet = cachedMetrics.chartData[firstKey];
              
              // Consider data invalid if arrays are empty or all values are zero
              if (!chartSet || 
                  !chartSet.data || 
                  chartSet.data.length === 0 || 
                  chartSet.data.every(val => val === 0)) {
                if (DEBUG_CACHE) console.log('Chart data exists but contains only empty arrays or zero values');
                hasValidData = false;
              }
            } else {
              hasValidData = false;
            }
          } else {
            hasValidData = false;
          }
        }
        
        if (!hasValidData) {
          if (DEBUG_CACHE) console.log('Cache data exists but appears to be empty or invalid');
          return false;
        }
        
        // Update state with cached values
        if (cachedMetrics.totalRevenue !== undefined) {
          setTotalRevenue(cachedMetrics.totalRevenue);
        }
        
        if (cachedMetrics.futureRevenue !== undefined) {
          setFutureRevenue(cachedMetrics.futureRevenue);
        }
        
        if (cachedMetrics.chartData !== undefined) {
          setChartData(cachedMetrics.chartData);
        }
        
        setMetricsFromCache(true);
        return true;
      } 
      
      // If cacheUtils failed to load, try direct access as a fallback
      if (DEBUG_CACHE) console.log('cacheUtils loading failed, trying direct access...');
      
      const rawCachedValue = await AsyncStorage.getItem(METRICS_CACHE);
      if (!rawCachedValue) {
        if (DEBUG_CACHE) console.log('No raw cache value found');
        return false;
      }
      
      try {
        const parsedValue = JSON.parse(rawCachedValue);
        if (DEBUG_CACHE) console.log('Parsed raw cache value successfully');
        
        // Extract data based on structure
        let extractedData = parsedValue;
        
        // If data is wrapped in cacheUtils format, extract it
        if (parsedValue?.data && parsedValue?.timestamp) {
          extractedData = parsedValue.data;
          if (DEBUG_CACHE) console.log('Extracted data from cacheUtils wrapper');
        }
        
        if (DEBUG_CACHE) {
          console.log('Direct cache access metrics summary:', {
            hasTotalRevenue: extractedData.totalRevenue !== undefined,
            totalRevenue: extractedData.totalRevenue,
            hasFutureRevenue: extractedData.futureRevenue !== undefined,
            futureRevenue: extractedData.futureRevenue,
            hasChartData: !!extractedData.chartData,
            chartDataKeys: extractedData.chartData ? Object.keys(extractedData.chartData) : []
          });
        }
        
        // Update state with extracted values
        if (extractedData.totalRevenue !== undefined) {
          setTotalRevenue(extractedData.totalRevenue);
        }
        
        if (extractedData.futureRevenue !== undefined) {
          setFutureRevenue(extractedData.futureRevenue);
        }
        
        if (extractedData.chartData !== undefined) {
          setChartData(extractedData.chartData);
        }
        
        setMetricsFromCache(true);
        return true;
      } catch (parseError) {
        console.error('Failed to parse raw cached value:', parseError);
        return false;
      }
      
    } catch (error) {
      console.error('Error loading metrics from cache:', error);
      return false;
    }
  };
  
  // Save metrics to cache
  const saveMetricsToCache = async () => {
    try {
      if (DEBUG_CACHE) console.log('Preparing to save metrics to cache...');
      
      // Don't save empty data to prevent caching useless information
      const hasValidChartData = chartData && 
        Object.keys(chartData).some(key => 
          chartData[key]?.data?.length > 0 && 
          !chartData[key]?.data.every(val => val === 0)
        );
        
      // Only save if we have meaningful data
      if (totalRevenue === 0 && futureRevenue === 0 && !hasValidChartData) {
        if (DEBUG_CACHE) console.log('Skipping cache save - no meaningful data to cache');
        return;
      }
      
      const metricsToCache = {
        totalRevenue,
        futureRevenue,
        chartData
      };
      
      if (DEBUG_CACHE) {
        console.log('Metrics to cache summary:', {
          totalRevenue,
          futureRevenue,
          chartDataKeys: chartData ? Object.keys(chartData) : [],
          hasValidChartData
        });
      }
      
      await saveToCache(METRICS_CACHE, metricsToCache);
      
      // Verify the cache was saved successfully
      if (DEBUG_CACHE) {
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('AsyncStorage keys after saving:', allKeys);
        console.log('Metrics cache saved successfully');
      }
    } catch (error) {
      console.error('Error saving metrics to cache:', error);
    }
  };
  
  // Clear metrics cache
  const clearMetricsCache = async () => {
    try {
      await AsyncStorage.removeItem(METRICS_CACHE);
      await AsyncStorage.removeItem(`${METRICS_CACHE}_meta`);
      console.log('Cleared metrics cache');
      setMetricsFromCache(false);
    } catch (error) {
      console.error('Error clearing metrics cache:', error);
    }
  };

  // Load financial data directly from API
  const loadFinancialData = async (forceReload = false) => {
    if (!listings || !listings.length) {
      return;
    }
    
    // Only show loading if we don't have cached data or if force reload
    if (!metricsFromCache || forceReload) {
      setLoading(true);
    }
    
    try {
      // Get all listing IDs and ensure they are numbers
      const listingIds = listings.map(listing => Number(listing.id)).filter(id => !isNaN(id));
      
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
      
      const totalRevenueData = await getListingFinancials(totalRevenueParams);
      
      // 2. Get future revenue with an explicit long date range (from today to 2 years in future)
      const futureRevenueParams = {
        listingMapIds: listingIds,
        fromDate: todayStr,
        toDate: futureStr,
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      };
      
      const futureRevenueData = await getListingFinancials(futureRevenueParams);
      
      // Set total revenue from API
      const extractedTotalRevenue = totalRevenueData?.result?.ownerPayout || 0;
      // Use the explicit future revenue from API instead of calculating from monthly data
      const explicitFutureRevenue = futureRevenueData?.result?.ownerPayout || 0;
      
      setTotalRevenue(extractedTotalRevenue);
      setFutureRevenue(explicitFutureRevenue);
      
      // 3. Get monthly revenue data for chart directly from API
      const monthlyData = await getMonthlyRevenueData(listingIds, 24);
      
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
      }
      
      
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
      
      // After successfully fetching data, save to cache
      await saveMetricsToCache();
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when listings change
  useEffect(() => {
    if (listings && listings.length > 0) {
      // First check if cached metrics have valid chart data
      const hasValidChartData = chartData && 
        Object.keys(chartData).some(key => 
          chartData[key]?.data?.length > 0 && 
          !chartData[key]?.data.every(val => val === 0)
        );
      
      // Force reload if chart data is invalid, otherwise use regular load
      if (metricsFromCache && !hasValidChartData) {
        console.log('Cached metrics exist but chart data is invalid, forcing reload');
        loadFinancialData(true);
      } else {
        loadFinancialData();
      }
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
    
    // Log userData object to see available fields
    console.log('User data:', userData);
  }, []);
  
  const loadDashboardData = async () => {
    // Load metrics and reservations from cache
    const [hasCachedMetrics, hasCachedReservations] = await Promise.all([
      loadMetricsFromCache(),
      loadReservationsFromCache()
    ]);
    
    if (!hasCachedMetrics) {
      setLoading(true);
    }
    
    try {
      // Force reload if we have no listings
      const shouldForceReload = !listings || listings.length === 0;
      
      // Load fresh data from API regardless of cache state if force reload needed
      // or if we don't have valid cached metrics
      await loadFinancialData(shouldForceReload || !hasCachedMetrics);
      
      // Always fetch fresh reservations, but the loading indicator won't show
      // if we have cached data because of reservationsFromCache state
      await fetchUpcomingReservations();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh all data and clear cache
  const forceRefreshAllData = async () => {
    if (DEBUG_CACHE) console.log('Force refreshing all data and clearing cache...');
    
    // Clear cache
    await clearMetricsCache();
    
    // Reset cache flags
    setMetricsFromCache(false);
    setReservationsFromCache(false);
    
    // Set loading state
    setLoading(true);
    
    try {
      // Force reload financial data
      await loadFinancialData(true);
      
      // Reload reservations
      await fetchUpcomingReservations();
      
      if (DEBUG_CACHE) console.log('Force refresh completed successfully');
    } catch (error) {
      console.error('Error during force refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Reset the cached state while refreshing
    setReservationsFromCache(false);
    
    // Refresh both financial data and upcoming reservations
    Promise.all([
      loadFinancialData(true), // Force reload on pull-to-refresh
      fetchUpcomingReservations()
    ])
    .then(() => {
      // Save the refreshed data to cache
      saveMetricsToCache();
      saveReservationsToCache();
    })
    .finally(() => setRefreshing(false));
  }, []);
  
  // Function to handle data fetching for different chart views
  const handleChartDataFetch = async (viewMode, yearInfo) => {
    
    try {
      // Check if we already have valid data for this viewMode
      if (chartData && 
          chartData[viewMode]?.data?.length > 0 && 
          !chartData[viewMode]?.data.every(val => val === 0)) {
        return Promise.resolve(chartData[viewMode]);
      }
      
      // Get listing IDs
      const listingIds = listings.map(listing => Number(listing.id)).filter(id => !isNaN(id));
      
      if (!listingIds.length) {
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
      
      
      // Set the updated chart data
      setChartData(updatedChartData);
      
      // Return the specific view data
      return Promise.resolve(updatedChartData[viewMode] || null);
      
    } catch (error) {
      console.error(`Error fetching data for ${viewMode} view:`, error);
      return Promise.reject(error);
    }
  };
  
  const renderHeroSection = () => {
    // Get total properties count
    const propertiesCount = listings?.length || 0;
    
    // Calculate monthly revenue average (from 6M data)
    const sixMonthAvg = chartData['6M']?.total 
      ? Math.round(chartData['6M'].total / (chartData['6M'].data.length || 1)) 
      : 0;
      
    // Calculate YTD monthly average
    const ytdMonthlyAvg = chartData['YTD']?.total && chartData['YTD']?.data?.length
      ? Math.round(chartData['YTD'].total / chartData['YTD'].data.length)
      : 0;
    
    // Format user's full name with better logging
    let fullName = 'Luxury Host';
    if (userData) {
      console.log('User data in renderHeroSection:', {
        email: userData.email,
        sub: userData.sub,
        name: userData.name,
        fullUserData: userData
      });
      
      // Try different possible name properties
      if (userData.name) {
        fullName = userData.name;
      } else if (userData.firstName || userData.lastName) {
        fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      } else if (userData.sub) {
        // Sometimes the name might be in the sub field
        fullName = userData.sub;
      } else if (userData.email) {
        // Use email without domain as fallback
        fullName = userData.email.split('@')[0];
      }
      
      if (!fullName) {
        fullName = 'Luxury Host';
      }
    }
    
    // Determine if the metrics are loading - avoid showing loading if we have cached data
    const metricsLoading = (loading && !metricsFromCache) || refreshing;
    
    return (
      <Animated.View 
        style={[
          styles.heroSection,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.heroGradient}>
          {/* Subtle geometric pattern */}
          <View style={styles.patternOverlay}>
            <View style={styles.patternDot} />
            <View style={styles.patternLine} />
            <View style={styles.patternCircle} />
          </View>
          
          <View style={styles.heroContent}>
            {/* User greeting with left-aligned modern design */}
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.userName}>{fullName}</Text>
              </View>
              
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {/* Key metrics row */}
            <View style={styles.metricsContainer}>
              {/* Properties metric */}
              <View style={styles.metricCard}>
                {metricsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.metricLoader} />
                ) : (
                  <Text style={styles.metricValue}>{propertiesCount}</Text>
                )}
                <View style={styles.metricLabelRow}>
                  <Ionicons name="home-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metricLabel}>PROPERTIES</Text>
                </View>
              </View>
              
              {/* 6M monthly average */}
              <View style={styles.metricCard}>
                {metricsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.metricLoader} />
                ) : (
                  <Text style={styles.metricValue}>{formatFullCurrency(sixMonthAvg)}</Text>
                )}
                <View style={styles.metricLabelRow}>
                  <Ionicons name="bar-chart-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metricLabel}>AVG/MO (6M)</Text>
                </View>
              </View>
              
              {/* YTD monthly average */}
              <View style={styles.metricCard}>
                {metricsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.metricLoader} />
                ) : (
                  <Text style={styles.metricValue}>{formatFullCurrency(ytdMonthlyAvg)}</Text>
                )}
                <View style={styles.metricLabelRow}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metricLabel}>AVG/MO YTD</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };
  
  // Add loading state for RevenueSummary
  const renderRevenueSummary = () => {
    return (
      <RevenueSummary 
        data={{
          totalRevenue: totalRevenue,
          futureRevenue: futureRevenue,
          sharingRevenue: sharingRevenue
        }}
        loading={(loading && !metricsFromCache) || refreshing}
        style={styles.revenueSummary}
      />
    );
  };

  const renderChart = () => {
    if (loading && !chartData['6M']?.data?.length && !metricsFromCache) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: appTheme.surface }]}>
          <ActivityIndicator size="large" color={appTheme.primary} />
          <Text style={[styles.loadingText, { color: appTheme.text.secondary }]}>Loading revenue data...</Text>
        </View>
      );
    }
    
    return <RevenueChart 
      data={chartData} 
      loading={(loading && !metricsFromCache) || refreshing} 
      onFetchData={handleChartDataFetch}
    />;
  };

  const handleSignOut = async () => {
    try {
      if (DEBUG_CACHE) {
        console.log('Signing out - checking cache state before sign out');
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('AsyncStorage keys before sign out:', allKeys);
        
        // Check our metrics cache specifically
        const hasMetricsCache = allKeys.includes(METRICS_CACHE);
        console.log('Has metrics cache before sign out:', hasMetricsCache);
      }
      
      await signOut();
      
      if (DEBUG_CACHE) {
        console.log('Sign out completed');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
  };
  
  const handleMenuPress = () => {
    // Implement menu functionality here
    // For now, we'll just use this as a placeholder
    console.log('Menu pressed');
  };
  
  const handleProfilePress = () => {
    // Navigate to profile or account settings
    navigation.navigate('Profile');
  };

  // Add function to check cache persistence
  const checkCachePersistence = async () => {
    if (!DEBUG_CACHE) return;
    
    try {
      console.log('Checking cache persistence after sign-in...');
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('All keys after sign-in:', allKeys);
      
      const hasMetricsCache = allKeys.includes(METRICS_CACHE);
      console.log('Cache survived sign-in/out process:', hasMetricsCache);
      
      if (hasMetricsCache) {
        // Try to read the cache directly
        const rawCache = await AsyncStorage.getItem(METRICS_CACHE);
        if (rawCache) {
          console.log('Raw cache still exists after sign-in');
          try {
            const parsed = JSON.parse(rawCache);
            console.log('Cache structure after sign-in:', {
              hasData: !!parsed?.data,
              hasTimestamp: !!parsed?.timestamp,
            });
          } catch (e) {
            console.log('Could not parse cache after sign-in');
          }
        }
      }
    } catch (error) {
      console.error('Error checking cache persistence:', error);
    }
  };

  // Check and fix cache structure issues
  const checkAndFixCacheStructure = async () => {
    if (!DEBUG_CACHE) return null;
    
    try {
      console.log('Checking cache structure for potential issues...');
      
      // Get the raw value to inspect structure
      const rawValue = await AsyncStorage.getItem(METRICS_CACHE);
      if (!rawValue) {
        console.log('No cache found to inspect');
        return null;
      }
      
      try {
        const parsedValue = JSON.parse(rawValue);
        console.log('Cache parsed successfully');
        
        // Check structure to see if cache was saved with the correct format
        // If the data has a 'data' and 'timestamp' field, it might be double-wrapped
        if (parsedValue?.data && parsedValue?.timestamp) {
          console.log('Detected potential double-wrapped cache structure - may need fix');
          
          // Log the structure
          console.log('Current structure:', {
            hasData: true,
            dataKeys: Object.keys(parsedValue.data),
            timestamp: new Date(parsedValue.timestamp).toISOString()
          });
          
          // If data contains the metrics we expect, it's properly structured with cacheUtils
          return parsedValue.data;
        } 
        
        // If we have direct access to the metrics (not wrapped by cacheUtils), we should fix
        if (parsedValue.totalRevenue !== undefined || 
            parsedValue.futureRevenue !== undefined || 
            parsedValue.chartData !== undefined) {
          console.log('Cache appears to be directly stored without cacheUtils wrapper');
          return parsedValue;
        }
        
        console.log('Cache structure unknown:', parsedValue);
        return null;
      } catch (error) {
        console.error('Error parsing cache:', error);
        return null;
      }
    } catch (error) {
      console.error('Error checking cache structure:', error);
      return null;
    }
  };

  // Load reservations from cache
  const loadReservationsFromCache = async () => {
    try {
      if (DEBUG_CACHE) console.log('Home: Loading reservations from cache...');
      const cachedReservations = await loadFromCache(UPCOMING_RESERVATIONS_CACHE);
      
      // Validate cached data
      if (cachedReservations && Array.isArray(cachedReservations) && cachedReservations.length > 0) {
        // Filter out any invalid reservations
        const validReservations = cachedReservations.filter(reservation => 
          reservation && 
          reservation.id && 
          reservation.startDate && 
          reservation.endDate && 
          reservation.guests
        );
        
        if (validReservations.length > 0) {
          if (DEBUG_CACHE) console.log(`Home: Found ${validReservations.length} valid reservations in cache`);
          setUpcomingReservations(validReservations);
          setUpcomingReservationsFromCache(true);
          return true;
        } else {
          if (DEBUG_CACHE) console.log('Home: Cached reservations were invalid, not using');
        }
      } else {
        if (DEBUG_CACHE) console.log('Home: No valid reservations in cache');
      }
      
      return false;
    } catch (error) {
      console.error('Home: Error loading reservations from cache:', error);
      return false;
    }
  };
  
  // Save reservations to cache
  const saveReservationsToCache = async () => {
    try {
      if (!upcomingReservations || !Array.isArray(upcomingReservations)) {
        if (DEBUG_CACHE) console.log('Home: No reservations to cache');
        return false;
      }
      
      // Validate reservations before caching
      const validReservations = upcomingReservations.filter(reservation => 
        reservation && 
        reservation.id && 
        reservation.startDate && 
        reservation.endDate && 
        reservation.guests
      );
      
      if (validReservations.length === 0) {
        if (DEBUG_CACHE) console.log('Home: No valid reservations to cache');
        return false;
      }
      
      if (DEBUG_CACHE) console.log(`Home: Saving ${validReservations.length} reservations to cache`);
      await saveToCache(UPCOMING_RESERVATIONS_CACHE, validReservations);
      
      return true;
    } catch (error) {
      console.error('Home: Error saving reservations to cache:', error);
      return false;
    }
  };

  // Update the useEffect for caching reservations with better validation
  useEffect(() => {
    // Only cache reservations if user is logged in and we have valid reservations
    if (userData && 
        upcomingReservations && 
        Array.isArray(upcomingReservations) && 
        upcomingReservations.length > 0 &&
        !upcomingReservationsFromCache) {
      saveReservationsToCache();
    }
  }, [userData, upcomingReservations, upcomingReservationsFromCache]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: GOLD.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.animatedHeader,
        { 
          height: headerHeight,
          opacity: headerOpacity,
          top: 0,
        }
      ]}>
        <View style={styles.headerGradient}>
          <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? insets.top : 0 }]}>
            <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
              <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Luxury Lodging Host</Text>
            
            {/* Completely hide dark mode button */}
            <View style={{width: 24}} />
          </View>
        </View>
      </Animated.View>
      
      {/* Main Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: 0 }
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
          />
        }
      >
        {/* Top section with greeting and stats */}
        {renderHeroSection()}
        
        {/* White Content Container */}
        <View style={styles.whiteContentContainer}>
          {/* RevenueSummary with loading state */}
          {renderRevenueSummary()}

          {/* Main Content Sections */}
          <View style={styles.mainContent}>
            <Animated.View 
              style={{ 
                opacity: fadeAnim, 
                transform: [{ translateY: Animated.multiply(slideAnim, 1.2) }]
              }}
            >
              <UpcomingReservations
                reservations={upcomingReservations}
                loading={(upcomingReservationsLoading && !reservationsFromCache) || refreshing}
              />
            </Animated.View>
            
            <Animated.View 
              style={{ 
                opacity: fadeAnim, 
                transform: [{ translateY: Animated.multiply(slideAnim, 1.4) }]
              }}
            >
              {renderChart()}
            </Animated.View>
            
            <Animated.View 
              style={{ 
                opacity: fadeAnim, 
                transform: [{ translateY: Animated.multiply(slideAnim, 1.6) }]
              }}
            >
              <PropertyUpgrades />
            </Animated.View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleThemeToggle}
            >
              <View style={styles.actionButtonIcon}>
                <Ionicons 
                  name={isDarkMode ? "sunny-outline" : "moon-outline"} 
                  size={20} 
                  color={GOLD.primary} 
                />
              </View>
              <Text style={styles.actionButtonText}>
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </Text>
            </TouchableOpacity> */}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleSignOut}
            >
              <View style={styles.actionButtonIcon}>
                <Ionicons name="log-out-outline" size={20} color={GOLD.primary} />
              </View>
              <Text style={styles.actionButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
      
      {/* Fixed Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Calendar')}
      >
        <Ionicons name="calendar" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GOLD.primary,
  },
  animatedHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: GOLD.primary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: '100%',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scrollView: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  heroSection: {
    width: '100%',
    height: 150, // Added more height to accommodate spacing
    overflow: 'hidden',
  },
  heroGradient: {
    width: '100%',
    height: '100%',
    padding: 12,
    backgroundColor: GOLD.primary,
    position: 'relative',
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    overflow: 'hidden',
  },
  patternDot: {
    position: 'absolute',
    top: 40,
    right: 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
  },
  patternLine: {
    position: 'absolute',
    top: 120,
    left: -20,
    width: 150,
    height: 5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  patternCircle: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: '#FFFFFF',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4, // Slightly more space
    marginBottom: 0,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 12, // Increased space below username
  },
  refreshButton: {
    width: 30, // Reduced size
    height: 30, // Reduced size
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8, // Increased space above metrics
    marginBottom: 0,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 10, // Slightly smaller radius
    paddingVertical: 6, // Smaller padding
    paddingHorizontal: 6, // Smaller padding
    marginHorizontal: 3,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 15, // Smaller text
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 7, // Smaller label
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  spacer: {
    height: 0,
  },
  whiteContentContainer: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginTop: -1, // No gap between gold and white sections
    borderTopLeftRadius: 0, // No rounded corners
    borderTopRightRadius: 0, // No rounded corners
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
    zIndex: 5,
  },
  decorativeElement: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 15,
    zIndex: 10,
  },
  goldLine: {
    width: 40,
    height: 4,
    backgroundColor: GOLD.primary,
    borderRadius: 2,
  },
  revenueSummary: {
    marginHorizontal: 16,
    borderRadius: 16,
    height: 80,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  mainContent: {
    paddingTop: 16,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E0D5',
  },
  loadingText: {
    color: '#888888',
    marginTop: 16,
    fontSize: 14,
  },
  actionButtonsContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(182, 148, 76, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(182, 148, 76, 0.15)',
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#333333',
    fontWeight: '500',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 25,
    right: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    zIndex: 999,
  },
  metricLoader: {
    marginBottom: 2, // Match value text margin
    height: 15, // Approximately the same height as the text
  },
});

export default HomeScreen;


