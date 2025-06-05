import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform
} from 'react-native';
import RevenueSummary from '../components/RevenueSummary';
import RevenueChart from '../components/RevenueChart';
import PropertyUpgrades from '../components/PropertyUpgrades';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getListingFinancials, getMonthlyRevenueData } from '../services/api';
import UpcomingReservations from '../components/UpcomingReservations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  saveToCache,
  loadFromCache,
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

// Feature flags
const SHOW_PROPERTY_UPGRADES = false; // Set to false to hide Property Upgrades section

// Cache keys
const METRICS_CACHE = CACHE_KEYS.MONTHLY_REVENUE; // Use the standardized key from cacheUtils
// Set debug flag to true to debug real device cache issues
const DEBUG_CACHE = false; // Set to true temporarily for debugging
// Detect if we're on a real device vs simulator
const IS_REAL_DEVICE = Platform.OS === 'ios' ? !Platform.constants.systemName.includes('Simulator') : !__DEV__;

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
    if (userData && !authLoading) {
      checkCachePersistence();
    }
  }, [userData, authLoading]);
  
  // Log when auth loading state changes
  useEffect(() => {
    if (!authLoading && userData) {
      // Check for cache structure issues first
      Promise.all([
        checkAndFixCacheStructure(),
        checkCachePersistence()
      ]).then(([fixedMetricsData]) => {
        // Now ensure we load from cache when user signs back in
        // Load both metrics and reservations from cache
        Promise.all([
          loadMetricsFromCache(),
          loadReservationsFromCache()
        ]);
      });
    }
  }, [authLoading]);
  
  // Log when userData object changes
  useEffect(() => {
  }, [userData]);
  
  // Add state for cached metrics
  const [metricsFromCache, setMetricsFromCache] = useState(false);
  
  // Add state to track loading financial data
  const [isLoadingFinancialData, setIsLoadingFinancialData] = useState(false);
  
  // Helper function to determine if data is invalid/empty
  const isEmptyMetricsData = (data) => {
    if (!data) return true;
    
    // Check if revenue values are both 0
    const hasNoRevenue = (!data.totalRevenue || data.totalRevenue === 0) && 
                          (!data.futureRevenue || data.futureRevenue === 0);
    
    // Check if chart data exists but is empty
    const hasEmptyChartData = !data.chartData || 
      Object.keys(data.chartData).length === 0;
    
    // Check if chart data exists but all values are 0
    const hasZeroChartData = data.chartData && 
      Object.keys(data.chartData).length > 0 &&
      Object.values(data.chartData).every(chart => 
        !chart || !chart.data || chart.data.length === 0 || chart.data.every(val => val === 0)
      );
    
    return hasNoRevenue && (hasEmptyChartData || hasZeroChartData);
  };

  // Load metrics from cache
  const loadMetricsFromCache = async () => {
    try {
      // ===== STEP 1: Check if cache exists =====
      // Get all keys from AsyncStorage
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        
        // Check if our metrics key exists
        const hasMetricsCache = allKeys.includes(METRICS_CACHE);
        
        if (!hasMetricsCache) {
          return false;
        }
      } catch (keysError) {
        // Continue anyway - the key might still exist
      }
      
      // ===== STEP 2: Try loading with cacheUtils =====
      try {
        const cachedMetrics = await loadFromCache(METRICS_CACHE);
        
        if (cachedMetrics) {
          // Check chart data content
          if (cachedMetrics.chartData) {
            const chartKeys = Object.keys(cachedMetrics.chartData);
            if (chartKeys.length > 0) {
              const firstKey = chartKeys[0];
              const firstChart = cachedMetrics.chartData[firstKey];
              
              if (firstChart?.data) {
                const nonZeroCount = firstChart.data.filter(v => v > 0).length;
              }
            }
          }
          
          // On real devices, be more lenient with validation
          if (IS_REAL_DEVICE) {
            // For real devices, accept ANY data that has structure
            if (cachedMetrics.totalRevenue !== undefined || 
                cachedMetrics.futureRevenue !== undefined || 
                cachedMetrics.chartData) {
              
              // Update state with cached values
              if (cachedMetrics.totalRevenue !== undefined) {
                setTotalRevenue(cachedMetrics.totalRevenue);
              }
              
              if (cachedMetrics.futureRevenue !== undefined) {
                setFutureRevenue(cachedMetrics.futureRevenue);
              }
              
              if (cachedMetrics.chartData) {
                setChartData(cachedMetrics.chartData);
              }
              
              setMetricsFromCache(true);
              return true;
            }
          } else {
            // For simulator, do basic validation
            if (!isEmptyMetricsData(cachedMetrics)) {
              // Update state with cached values
              if (cachedMetrics.totalRevenue !== undefined) {
                setTotalRevenue(cachedMetrics.totalRevenue);
              }
              
              if (cachedMetrics.futureRevenue !== undefined) {
                setFutureRevenue(cachedMetrics.futureRevenue);
              }
              
              if (cachedMetrics.chartData) {
                setChartData(cachedMetrics.chartData);
              }
              
              setMetricsFromCache(true);
              return true;
            } else {
              return false;
            }
          }
        } 
      } catch (cacheUtilsError) {
        // Continue to direct access fallback
      }
      
      // ===== STEP 3: Try direct AsyncStorage access =====
      let directSuccess = false;
      try {
        const rawValue = await AsyncStorage.getItem(METRICS_CACHE);
        
        if (!rawValue) {
          return false;
        }
        
        const parsedValue = JSON.parse(rawValue);
        
        // Extract data based on structure
        let extractedData = parsedValue;
        
        // If wrapped in cacheUtils format, extract the inner data
        if (parsedValue?.data && parsedValue?.timestamp) {
          extractedData = parsedValue.data;
        }
        
        // For real devices, be even more lenient
        if (IS_REAL_DEVICE || !isEmptyMetricsData(extractedData)) {
          // Update state with any valid fields
          if (extractedData.totalRevenue !== undefined) {
            setTotalRevenue(extractedData.totalRevenue);
          }
          
          if (extractedData.futureRevenue !== undefined) {
            setFutureRevenue(extractedData.futureRevenue);
          }
          
          if (extractedData.chartData) {
            setChartData(extractedData.chartData);
          }
          
          setMetricsFromCache(true);
          directSuccess = true;
        }
      } catch (directError) {
        // Continue to direct access fallback
      }
      
      return directSuccess;
    } catch (error) {
      return false;
    }
  };
  
  // Save metrics to cache
  const saveMetricsToCache = async () => {
    try {
      // Log initial data state
      const sanitizedTotalRevenue = typeof totalRevenue === 'number' ? totalRevenue : 0;
      const sanitizedFutureRevenue = typeof futureRevenue === 'number' ? futureRevenue : 0;
      
      // Check if we have any meaningful data to cache
      const hasEmptyChartData = !chartData || 
        Object.keys(chartData).length === 0 || 
        Object.values(chartData).every(chart => 
          !chart.data || chart.data.length === 0 || chart.data.every(val => val === 0)
        );
      
      if (sanitizedTotalRevenue === 0 && sanitizedFutureRevenue === 0 && hasEmptyChartData) {
        return;
      }
      
      const metricsToCache = {
        totalRevenue: sanitizedTotalRevenue,
        futureRevenue: sanitizedFutureRevenue,
        chartData: chartData
      };
      
      // Try saving with cacheUtils first
      await saveToCache(METRICS_CACHE, metricsToCache);
      
      // Double-check cache was saved successfully
      if (DEBUG_CACHE) {
        // Verify the key exists
        const allKeys = await AsyncStorage.getAllKeys();
        const hasMetricsCache = allKeys.includes(METRICS_CACHE);
        
        if (hasMetricsCache) {
          // Verify the cache content
          try {
            // Try to immediately read back what we just saved
            const savedRaw = await AsyncStorage.getItem(METRICS_CACHE);
            
            if (!savedRaw) {
              console.error('CRITICAL: Key exists but content is empty!');
            } else {
              const parsedSaved = JSON.parse(savedRaw);
              
              // Get the actual data (unwrap from cacheUtils if needed)
              const actualData = parsedSaved?.data || parsedSaved;
              
              // Verify essential fields
              if (actualData.totalRevenue !== undefined &&
                  actualData.futureRevenue !== undefined &&
                  actualData.chartData) {
                console.log('CRITICAL: Saved data verification:');
                console.log('    hasTotalRevenue:', actualData.totalRevenue !== undefined);
                console.log('    totalRevenue:', actualData.totalRevenue);
                console.log('    hasFutureRevenue:', actualData.futureRevenue !== undefined);
                console.log('    futureRevenue:', actualData.futureRevenue);
                console.log('    hasChartData:', !!actualData.chartData);
                console.log('    chartDataKeys:', actualData.chartData ? Object.keys(actualData.chartData) : []);
              }
            }
          } catch (parseError) {
            console.error('CRITICAL: Saved data cannot be parsed:', parseError);
          }
        } else {
          console.warn('Failed to save metrics cache with cacheUtils - keys not found');
          
          // Fallback: Try direct save if cacheUtils failed
          console.log('Attempting direct save fallback...');
          const jsonValue = JSON.stringify(metricsToCache);
          await AsyncStorage.setItem(METRICS_CACHE, jsonValue);
          
          // Check if direct save worked
          const afterDirectSave = await AsyncStorage.getAllKeys();
          const directSaveWorked = afterDirectSave.includes(METRICS_CACHE);
          
          console.log('Direct save result:', {
            worked: directSaveWorked,
            allKeys: afterDirectSave
          });
          
          // Verify direct save content
          if (directSaveWorked) {
            try {
              const directSavedRaw = await AsyncStorage.getItem(METRICS_CACHE);
              console.log(`Direct save verification: Raw length = ${directSavedRaw?.length || 0}`);
            } catch (directVerifyError) {
              console.error('Error verifying direct save:', directVerifyError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving metrics to cache:', error);
      
      // Last resort fallback - try direct save with simpler data
      try {
        if (DEBUG_CACHE) console.log('Attempting emergency direct cache save...');
        const simplifiedData = {
          totalRevenue: typeof totalRevenue === 'number' ? totalRevenue : 0,
          futureRevenue: typeof futureRevenue === 'number' ? futureRevenue : 0
        };
        await AsyncStorage.setItem(METRICS_CACHE, JSON.stringify(simplifiedData));
      } catch (fallbackError) {
        console.error('Even emergency cache save failed:', fallbackError);
      }
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
    
    // Prevent multiple simultaneous calls
    if (isLoadingFinancialData && !forceReload) {
      console.log('🔒 LoadFinancial: Already loading, skipping duplicate call');
      return;
    }
    
    setIsLoadingFinancialData(true);
    
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
      const monthlyData = await getMonthlyRevenueData(listingIds, 6);
      
      // Make sure we have years data, if not, generate it
      if (!monthlyData.years || monthlyData.years.length === 0) {
        monthlyData.years = [];
        const currentMonth = today.getMonth();
        
        // Go backward 6 months from today to match our data
        for (let i = 0; i < monthlyData.labels.length; i++) {
          const monthOffset = 5 - i; // For 6 months, oldest is 5 months back
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
      
      // For 6M view, we can use the monthlyData directly since we only requested 6 months
      sixMonthsData.labels = monthlyData.labels || [];
      sixMonthsData.data = monthlyData.data || [];
      sixMonthsData.years = monthlyData.years || [];
      sixMonthsData.total = monthlyData.total || 0;
      
      // For other views, we need to get additional data
      if (sixMonthsData.labels.length > 0) {
        // Get 24 months of data for processing YTD and 2024 views
        const extendedMonthlyData = await getMonthlyRevenueData(listingIds, 24);
        
        // Process extended data for other views
        for (let i = 0; i < extendedMonthlyData.labels.length; i++) {
          const month = extendedMonthlyData.labels[i];
          const value = extendedMonthlyData.data[i];
          const year = extendedMonthlyData.years[i];
          const monthIndex = months.indexOf(month);
          
          // 1. YTD - Current year only
          if (year === currentYear) {
            ytdData.labels.push(month);
            ytdData.data.push(value);
            ytdData.years.push(year);
            ytdData.total += value;
          }
          
          // 2. MTD - Current month and year only
          if (year === currentYear && monthIndex === currentMonth) {
            mtdData.labels.push(month);
            mtdData.data.push(value);
            mtdData.years.push(year);
            mtdData.total += value;
          }
          
          // 3. 2024 specific data
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
        // Generate fallback 6-month labels
        const fallbackLabels = [];
        const fallbackYears = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(today.getMonth() - i);
          fallbackLabels.push(months[date.getMonth()]);
          fallbackYears.push(date.getFullYear());
        }
        sixMonthsData.labels = fallbackLabels;
        sixMonthsData.data = Array(6).fill(0);
        sixMonthsData.years = fallbackYears;
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
      setIsLoadingFinancialData(false);
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
    
  }, []);
  
  const loadDashboardData = async () => {
    // First attempt: Try loading from cache
    let hasCachedMetrics = false;
    
    try {
      hasCachedMetrics = await loadMetricsFromCache();
    } catch (cacheError) {
      console.error('Error loading from cache:', cacheError);
    }
    
    // Show loading state if we don't have cached metrics
    if (!hasCachedMetrics) {
      setLoading(true);
    }
    
    try {
      // Determine if we need to force reload data
      const noListings = !listings || listings.length === 0;
      const needsFreshData = noListings || !hasCachedMetrics;
      
      // Real device special handling
      if (IS_REAL_DEVICE && needsFreshData) {        
        // Make multiple attempts with error handling for real devices
        try {
          await loadFinancialData(true); // Force reload for real device
        } catch (firstAttemptError) {
          console.error('First attempt to load financial data failed:', firstAttemptError);
          
          // Wait a moment and try again
          setTimeout(async () => {
            try {
              await loadFinancialData(true);
            } catch (retryError) {
              console.error('Even retry attempt failed:', retryError);
            }
          }, 1000);
        }
      } else {
        // Standard approach for simulator or if we have cached data
        await loadFinancialData(needsFreshData);
      }
      
      // AuthContext will handle reservations caching automatically
      
    } catch (error) {
      console.error('Error in dashboard data loading:', error);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh all data and clear cache
  const forceRefreshAllData = async () => {
    // Clear cache
    await clearMetricsCache();
    
    // Reset cache flags
    setMetricsFromCache(false);
    
    // Set loading state
    setLoading(true);
    
    try {
      // Force reload financial data
      await loadFinancialData(true);
      
      // Reload reservations
      await fetchUpcomingReservations();
      
    } catch (error) {
      console.error('Error during force refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Reset the cached state while refreshing
    
    // Refresh both financial data and upcoming reservations
    Promise.all([
      loadFinancialData(true), // Force reload on pull-to-refresh
      fetchUpcomingReservations()
    ])
    .then(() => {
      // Save the refreshed data to cache
      saveMetricsToCache();
    })
    .finally(() => setRefreshing(false));
  }, []);
  
  // Function to handle data fetching for different chart views
  const handleChartDataFetch = async (viewMode, yearInfo) => {    
    try {
      console.log(`🔄 ChartFetch: Handling data fetch for ${viewMode} view`);
      
      // If financial data is already loading, don't make duplicate calls
      if (isLoadingFinancialData) {
        console.log(`🔒 ChartFetch: Financial data already loading, skipping ${viewMode} fetch`);
        return null;
      }
      
      // Check if we already have valid data for this viewMode
      if (chartData && 
          chartData[viewMode]?.data?.length > 0 && 
          !chartData[viewMode]?.data.every(val => val === 0)) {
        console.log(`🔄 ChartFetch: Using existing data for ${viewMode}:`, {
          labels: chartData[viewMode].labels,
          dataLength: chartData[viewMode].data.length
        });
        // Return existing data
        return chartData[viewMode];
      }
      
      // Get listing IDs
      const listingIds = listings?.map(listing => Number(listing.id))?.filter(id => !isNaN(id)) || [];
      
      if (!listingIds.length) {
        console.log(`🔄 ChartFetch: No listing IDs available`);
        return null;
      }
      
      // Determine how many months to fetch based on view mode
      let monthsToFetch = 6;
      if (viewMode === 'YTD' || viewMode === '2024') {
        monthsToFetch = 24; // Need more data for these views
      }
      
      console.log(`🔄 ChartFetch: Fetching ${monthsToFetch} months for ${viewMode} view`);
            
      // Get fresh monthly data from API
      const monthlyData = await getMonthlyRevenueData(listingIds, monthsToFetch);
      
      console.log(`🔄 ChartFetch: Received API data for ${viewMode}:`, {
        labels: monthlyData.labels,
        dataLength: monthlyData.data?.length,
        total: monthlyData.total
      });
      
      if (!monthlyData || !monthlyData.labels || !monthlyData.data) {
        console.log(`🔄 ChartFetch: Invalid API response for ${viewMode}`);
        return null;
      }
      
      // Process the data based on view mode
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Create a deep copy of chart data to avoid reference issues
      let updatedChartData = JSON.parse(JSON.stringify(chartData));
      
      // For 6M view (also handle ALL view)
      if (viewMode === '6M' || viewMode === 'ALL') {
        // For 6M view, use the API data directly since we requested exactly 6 months
        const sixMonthsData = {
          labels: monthlyData.labels || [],
          data: monthlyData.data || [],
          years: monthlyData.years || [],
          total: monthlyData.total || 0
        };
        
        // Ensure we have exactly 6 months
        if (sixMonthsData.labels.length !== 6) {
          // Generate fallback 6-month labels if API data is insufficient
          const fallbackLabels = [];
          const fallbackYears = [];
          for (let i = 5; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(today.getMonth() - i);
            fallbackLabels.push(months[date.getMonth()]);
            fallbackYears.push(date.getFullYear());
          }
          sixMonthsData.labels = fallbackLabels;
          sixMonthsData.data = Array(6).fill(0);
          sixMonthsData.years = fallbackYears;
          sixMonthsData.total = 0;
        }
        
        updatedChartData['6M'] = sixMonthsData;
        updatedChartData['ALL'] = sixMonthsData; // Keep ALL the same as 6M for backward compatibility
      }
      
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
          
          updatedChartData['2024'] = fullYear2024;
        } else {
          updatedChartData['2024'] = year2024Data;
        }
      }
      
      // Update the state with the new data
      setChartData(updatedChartData);
      
      // Return the data for the requested view mode
      return updatedChartData[viewMode];
      
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return null;
    }
  };
  
  // Add this new function to update parent state when chart data is loaded
  const handleChartDataUpdate = (chartKey, updatedData) => {
    // Only update if we have meaningful data
    if (updatedData && updatedData.data && updatedData.data.length > 0) {
      // Update the chart data in parent state
      setChartData(prevData => {
        const newData = {...prevData};
        newData[chartKey] = updatedData;
        
        // After updating state, attempt to save to cache
        setTimeout(() => {
          saveMetricsToCache();
        }, 500);
        
        return newData;
      });
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
              <TouchableOpacity 
                style={styles.metricCard}
                onPress={() => navigation.navigate('Listings')}
              >
                {metricsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.metricLoader} />
                ) : (
                  <Text style={styles.metricValue}>{propertiesCount}</Text>
                )}
                <View style={styles.metricLabelRow}>
                  <Ionicons name="home-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metricLabel}>PROPERTIES</Text>
                </View>
              </TouchableOpacity>
              
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
      onDataUpdate={handleChartDataUpdate}
    />;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
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
      const allKeys = await AsyncStorage.getAllKeys();
      
      const hasMetricsCache = allKeys.includes(METRICS_CACHE);
      
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
            {/* Remove menu button - replaced with spacer */}
            <View style={{width: 40}} />
            
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
                loading={upcomingReservationsLoading || refreshing}
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
            
            {SHOW_PROPERTY_UPGRADES && (
              <Animated.View 
                style={{ 
                  opacity: fadeAnim, 
                  transform: [{ translateY: Animated.multiply(slideAnim, 1.6) }]
                }}
              >
                <PropertyUpgrades />
              </Animated.View>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
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


