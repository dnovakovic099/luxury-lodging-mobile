import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatCurrency } from '../utils/formatters';

// Use the exact gold color from theme.js
const GOLD = {
  primary: '#B6944C', // Matches theme's primary color
  light: 'rgba(182, 148, 76, 0.9)',
  lighter: 'rgba(182, 148, 76, 0.15)',
  dark: '#8B7355', // Matches theme's secondary color
};

// Helper function to get last 6 months labels (including year info)
const getLastSixMonthsLabels = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const result = [];
  const years = [];
  
  // Get 6 months ending with current month, tracking the year for each
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(today.getMonth() - i);
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    result.push(months[monthIndex]);
    years.push(year);
  }
  
  console.log("Last 6 months with years:", result.map((month, i) => `${month} ${years[i]}`));
  return { labels: result, years };
};

// Get the current month and year
const getCurrentMonthAndYear = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  return {
    month: months[today.getMonth()],
    year: today.getFullYear()
  };
};

// Helper function to get months in current year so far (with year)
const getYearToDateMonths = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  return {
    labels: months.slice(0, currentMonth + 1),
    year: currentYear
  };
};

// Helper function to get months for a specific year
const getMonthsForYear = (year) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    labels: months,
    year: year
  };
};

// Get current year
const getCurrentYear = () => new Date().getFullYear();

// The 2024 year to display (can be fixed or dynamic)
const TARGET_YEAR = 2024;

// Helper function to get current month
const getCurrentMonth = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  return months[today.getMonth()];
};

// Helper function to get months in specific year
const getCurrentYearMonths = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months; // Return all months for full year view
};

// Log the months to verify
console.log("Last 6 months:", getLastSixMonthsLabels());
console.log("Current month:", getCurrentMonth());
console.log("YTD months:", getYearToDateMonths());

const RevenueChart = ({ data, loading, onFetchData }) => {
  // State for expanded/collapsed view
  const [expanded, setExpanded] = useState(false);
  // State for view mode - persist in state
  const [viewMode, setViewMode] = useState('6M'); // '6M', 'YTD', 'MTD', or '2024'
  // State for dropdown menu
  const [dropdownVisible, setDropdownVisible] = useState(false);
  // State to track if we're waiting for data
  const [fetchingData, setFetchingData] = useState(false);
  
  // Store the current viewMode in a ref to track changes
  const prevViewModeRef = useRef(viewMode);

  // Log view mode changes for debugging
  useEffect(() => {
    if (prevViewModeRef.current !== viewMode) {
      console.log(`[CHART] View mode changed from ${prevViewModeRef.current} to ${viewMode}`);
      prevViewModeRef.current = viewMode;
    }
  }, [viewMode]);

  // Animation for expand/collapse
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  // Increase animation array to support up to 24 months
  const barHeights = useRef(Array(24).fill(0).map(() => new Animated.Value(0))).current;
  
  // Get year-aware labels for each view mode
  const sixMonthLabelData = getLastSixMonthsLabels();
  const sixMonthLabels = sixMonthLabelData.labels;
  const sixMonthYears = sixMonthLabelData.years;
  
  const currentMonthData = getCurrentMonthAndYear();
  const currentMonthLabel = currentMonthData.month;
  const currentYear = currentMonthData.year;
  
  const ytdLabelData = getYearToDateMonths();
  const ytdMonths = ytdLabelData.labels;
  const ytdYear = ytdLabelData.year;
  
  const targetYearData = getMonthsForYear(TARGET_YEAR);
  const yearMonths = targetYearData.labels;
  const yearForTargetView = targetYearData.year;
  
  // Log the months and years to verify
  console.log("6M view spans years:", sixMonthYears);
  console.log("YTD is for year:", ytdYear);
  console.log("2024 view is for year:", yearForTargetView);
  
  // Log the full data object for debugging
  console.log("RECEIVED DATA:", JSON.stringify(data));
  
  // Safely extract data from API response based on the current view mode
  const viewData = data?.[viewMode] || {};
  const viewLabels = Array.isArray(viewData?.labels) ? viewData.labels : [];
  const viewValues = Array.isArray(viewData?.data) ? viewData.data : [];
  const viewYears = Array.isArray(viewData?.years) ? viewData.years : [];
  
  // Fallback to 6M data if the current view doesn't have data
  const sixMonthData = data?.['6M'] || {};
  const chartData = Array.isArray(sixMonthData?.data) ? sixMonthData.data : [];
  
  console.log(`[CHART DEBUG] ${viewMode} data:`, viewValues.length > 0 ? 'available' : 'empty');
  
  // Get appropriate labels based on view mode - prefer API data first
  let labels;
  let labelYears;
  
  if (viewLabels.length > 0) {
    // Use data from API if available
    labels = viewLabels;
    labelYears = viewYears;
  } else {
    // Fall back to calculated labels
    switch (viewMode) {
      case 'MTD':
        labels = [currentMonthLabel];
        labelYears = [currentYear];
        break;
      case 'YTD':
        labels = ytdMonths;
        labelYears = Array(ytdMonths.length).fill(ytdYear);
        break;
      case '2024':
        labels = yearMonths;
        labelYears = Array(yearMonths.length).fill(yearForTargetView);
        break;
      default: // '6M'
        labels = sixMonthLabels;
        // Use years from the API response if available, otherwise use calculated years
        labelYears = (sixMonthData?.years && sixMonthData.years.length === sixMonthLabels.length) 
          ? sixMonthData.years 
          : sixMonthYears;
        break;
    }
  }
  
  // Make sure we have data points for our view mode
  let normalizedChartData;
  
  // If we have view-specific data, use it
  if (viewValues.length > 0) {
    normalizedChartData = viewValues;
  } else {
    // Otherwise fallback to derived data
    switch (viewMode) {
      case 'MTD':
        normalizedChartData = data?.['MTD']?.data || [0];
        break;
      
      case 'YTD':
        normalizedChartData = data?.['YTD']?.data || Array(4).fill(0);
        break;
      
      case '2024':
        normalizedChartData = data?.['2024']?.data || Array(12).fill(0);
        break;
      
      default: // '6M'
        normalizedChartData = chartData.slice(0, 6);
        break;
    }
  }
  
  // Ensure we have at least a minimal dataset with the right size
  if (normalizedChartData.length === 0) {
    console.warn(`No data available for ${viewMode} view.`);
    // Create an appropriate size array filled with zeros
    normalizedChartData = viewMode === 'MTD' 
      ? [0] 
      : viewMode === 'YTD' 
        ? Array(4).fill(0)  // 4 months for YTD Jan-Apr
        : viewMode === '2024'
          ? Array(12).fill(0)  // 12 months for 2024
          : Array(6).fill(0);  // 6 months for 6M
  }
  
  // Enforce exact length based on viewMode to prevent showing extra bars
  switch (viewMode) {
    case 'MTD':
      normalizedChartData = normalizedChartData.slice(0, 1);
      break;
    case 'YTD':
      normalizedChartData = normalizedChartData.slice(0, 4);
      break;
    case '2024':
      normalizedChartData = normalizedChartData.slice(0, 12);
      break;
    default: // '6M'
      normalizedChartData = normalizedChartData.slice(0, 6);
      break;
  }
  
  // Data should be aligned with months (oldest to newest)
  const adjustedChartData = normalizedChartData;
  
  console.log(`${viewMode} Chart Data Final:`, adjustedChartData.length, "bars:", adjustedChartData);
  
  // Calculate maximum value for chart scaling
  const maxValue = adjustedChartData && adjustedChartData.length > 0
    ? Math.max(...adjustedChartData.filter(value => typeof value === 'number' && !isNaN(value)))
    : 100; // Default value if no valid data

  console.log(`Chart max value: ${maxValue}`);
  
  // Toggle expanded state
  const toggleExpanded = () => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };
  
  // Toggle dropdown menu
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };
  
  // Method to handle view mode selection
  const selectViewMode = async (mode) => {
    try {
      console.log(`[CHART] Selecting view mode: ${mode}, current mode: ${viewMode}`);
      
      // If already in the selected mode, just return
      if (mode === viewMode) {
        console.log(`[CHART] Already in ${mode} mode, skipping update`);
        return;
      }
      
      // Check if we already have data for this mode
      if (data && data[mode] && data[mode].data && data[mode].data.length > 0) {
        console.log(`[CHART] Data for ${mode} mode already loaded, skipping fetch`);
        setViewMode(mode);
        setDropdownVisible(false);
        return;
      }
      
      // If we're changing modes, show loading state
      setFetchingData(true);
      
      try {
        // Get the current year if needed
        const currentYearData = getCurrentYearData();
        
        // Fetch data for the selected mode
        const result = await onFetchData(mode, currentYearData);
        
        if (result) {
          console.log(`[CHART] Data fetch successful for ${mode} mode`);
          // Process the fetched data
          const { labels = [], data = [] } = result;
          
          // Create month data array for chart rendering
          const newMonthData = labels.map((month, index) => ({
            month,
            value: data[index] || 0
          }));
          
          // Update component state with the new data
          setMonthData(newMonthData);
          setViewMode(mode);
          console.log(`[CHART] Chart data updated for ${mode} mode (${newMonthData.length} months)`);
        } else {
          console.warn(`[CHART] No data returned for ${mode} mode`);
          // If no data, clear the chart
          setMonthData([]);
        }
      } catch (error) {
        console.error(`[CHART] Error while changing to ${mode} mode:`, error);
        // Show error state or fallback
        setMonthData([]);
      } finally {
        setFetchingData(false);
        setDropdownVisible(false);
      }
    } catch (outerError) {
      console.error(`[CHART] Unexpected error in selectViewMode:`, outerError);
      setFetchingData(false);
      setDropdownVisible(false);
    }
  };
  
  // Optimize animation to be more performant
  useEffect(() => {
    // Skip animation if we're not rendering the component
    if (fetchingData || !adjustedChartData || adjustedChartData.length === 0) return;
    
    // Make sure we have something to animate
    const barCount = Math.min(adjustedChartData.length, barHeights.length);
    
    // Batch animations for better performance
    const animations = [];
    
    // Reset values before animating
    for (let i = 0; i < barCount; i++) {
      barHeights[i].setValue(0);
    }
    
    // Use a single timeout to start animations after values are reset
    setTimeout(() => {
      // Generate all animations at once
      for (let index = 0; index < barCount; index++) {
        // Calculate the exact height percentage based on the value's proportion to the max
        const value = adjustedChartData[index];
        const targetHeight = typeof value === 'number' && value > 0 
          ? (value / memoizedRoundedMax) 
          : 0.02; // Minimal height for empty bars
        
        animations.push(
          Animated.timing(barHeights[index], {
            toValue: targetHeight,
            duration: 550, // Reduced from 850 for better performance
            delay: index * 50, // Reduced from 80 for better performance
            useNativeDriver: false,
          })
        );
      }
      
      // Start all animations together
      Animated.stagger(30, animations).start(); // Reduced from 40 for better performance
    }, 10);
    
  }, [adjustedChartData, viewMode, memoizedRoundedMax, fetchingData]);
  
  // Calculate monthly average and total based on view mode
  const validValues = adjustedChartData.filter(v => typeof v === 'number' && v > 0);
  const monthlyAverage = validValues.length > 0
    ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length
    : 0;
    
  // Calculate total payout - with defensive coding
  const totalPayout = validValues.reduce((sum, val) => sum + val, 0);

  // Format currency with whole dollars and commas
  const formatExactCurrency = (value) => {
    if (typeof value !== 'number') return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format currency for full display with cents
  const formatFullCurrency = (value) => {
    if (typeof value !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Format currency in compact format (e.g., $3.9k)
  const formatCompactCurrency = (value) => {
    if (typeof value !== 'number' || value === 0) return '';
    
    if (value >= 1000) {
      // Show in k format with NO decimals
      return `$${Math.round(value / 1000)}k`;
    } else {
      return `$${Math.round(value)}`;
    }
  };

  // Format currency in extra compact format for 2024 view
  const formatSuperCompactCurrency = (value) => {
    if (typeof value !== 'number' || value === 0) return '';
    
    if (value >= 1000) {
      return `$${Math.round(value/1000)}k`;
    } else {
      return `$${Math.round(value)}`;
    }
  };

  // Add a new function for y-axis labels with 3-digit max format
  const formatAxisCurrency = (value) => {
    if (typeof value !== 'number') return '0';
    
    if (value >= 1000000) {
      return `${Math.round(value / 1000000)}M`; // Show 2M instead of 1.5M
    } else if (value >= 1000) {
      // Format with whole numbers for thousands
      return `${Math.round(value / 1000)}k`; // Show 81k instead of 81.3k
    } else {
      return `${Math.round(value)}`; // Show whole numbers for small values
    }
  };

  // Calculate the height of the detailed section for animation
  const detailSectionHeight = 380; // Increased height to accommodate Total row

  // Get appropriate width for bar columns based on view mode
  const getBarStyle = () => {
    switch (viewMode) {
      case 'MTD':
        return {
          barColumn: {
            ...styles.barColumn,
            width: '70%', // Wider for single bar
            marginHorizontal: 5, // Reduced from 10
          },
          bar: {
            ...styles.bar,
            width: '60%', // Thinner
          },
          barValue: {
            ...styles.barValue,
            width: 60, // Narrower to prevent overflow
            fontSize: 11, // Smaller font
            fontWeight: '400', // Thinner font
          }
        };
      case 'YTD':
        return {
          barColumn: {
            ...styles.barColumn,
            width: '24%', // Slightly increased
            marginHorizontal: 2, // Reduced spacing
          },
          bar: {
            ...styles.bar,
            width: '50%', // Thinner
          },
          barValue: {
            ...styles.barValue,
            width: 50, // Narrower
            fontSize: 10, // Smaller font
            fontWeight: '400', // Thinner font
          }
        };
      case '2024':
        return {
          barColumn: {
            ...styles.barColumn,
            width: '8%', // Slightly increased
            overflow: 'visible',
            marginHorizontal: 0, // No extra margin needed
          },
          bar: {
            ...styles.bar,
            width: '40%', // Thinner
          },
          barValue: {
            ...styles.barValue,
            width: 40, // Narrower
            fontSize: 9, // Smaller font
            fontWeight: '400', // Thinner font
          }
        };
      default: // '6M'
        return {
          barColumn: {
            ...styles.barColumn,
            width: '16%', // Increased
            marginHorizontal: 0, // No extra margin
          },
          bar: {
            ...styles.bar,
            width: '45%', // Slightly wider (was 40%)
          },
          barValue: {
            ...styles.barValue,
            width: 45, // Narrower
            fontSize: 10, // Smaller font
            fontWeight: '400', // Thinner font
          }
        };
    }
  };

  // Assign bar styles before using them
  const barStyles = getBarStyle();

  // Calculate axis values (memoized to prevent recalculation)
  const memoizedAxisValues = useMemo(() => {
    if (!maxValue) {
      return [0, 20, 40, 60, 80, 100];
    }

    // Calculate a rounded maximum value for clean axis labels
    let roundedMax;
    if (maxValue > 1000000) {
      // For values > 1M, round to nearest 500k
      roundedMax = Math.ceil(maxValue / 500000) * 500000;
    } else if (maxValue > 100000) {
      // For values > 100k, round to nearest 25k
      roundedMax = Math.ceil(maxValue / 25000) * 25000;
    } else if (maxValue > 10000) {
      // For values > 10k, round to nearest 10k
      roundedMax = Math.ceil(maxValue / 10000) * 10000;
    } else {
      // For smaller values, round to nearest 1k
      roundedMax = Math.ceil(maxValue / 1000) * 1000;
    }

    // Create 5 equally spaced intervals from 0 to roundedMax
    const step = roundedMax / 5;
    const axisValues = [0];
    
    for (let i = 1; i <= 5; i++) {
      axisValues.push(Math.round(i * step));
    }
    
    return axisValues;
  }, [maxValue]);
  
  // Store the rounded max value for reference
  const memoizedRoundedMax = useMemo(() => {
    if (!maxValue) return 100;
    
    if (maxValue > 1000000) {
      return Math.ceil(maxValue / 500000) * 500000;
    } else if (maxValue > 100000) {
      return Math.ceil(maxValue / 25000) * 25000;
    } else if (maxValue > 10000) {
      return Math.ceil(maxValue / 10000) * 10000;
    } else {
      return Math.ceil(maxValue / 1000) * 1000;
    }
  }, [maxValue]);

  // Update bar rendering to show actual values, but scale according to rounded max
  const renderBars = React.useCallback(() => {
    if (!adjustedChartData || adjustedChartData.length === 0) return null;
    
    // For empty data, avoid division by zero
    if (memoizedRoundedMax === 0) return null;
    
    // Calculate bar spacing based on view mode
    const barCount = adjustedChartData.length;
    
    // Determine bar width based on count
    const getBarWidth = () => {
      if (barCount >= 12) return '45%'; // Much wider bars for 12 months
      if (barCount > 9) return '50%'; // Wide bars for 10-11 months
      if (barCount > 6) return '55%'; // Medium bars for 7-9 months
      if (barCount > 3) return '60%'; // Wider bars for 4-6 months
      return '65%'; // Widest for 1-3 months
    };
    
    return (
      <View style={[
        styles.barsOuterContainer,
        // Add more left margin for all views to prevent first bar from being too far left
        { 
          left: 40, 
          right: 15,
          paddingLeft: 15,
        }
      ]}>
        {adjustedChartData.map((value, index) => {
          // Calculate height as a percentage of the maximum value
          const heightPercentage = (typeof value === 'number' && value > 0) ? (value / memoizedRoundedMax) : 0;
          // Calculate height in pixels, with a minimum to ensure visibility
          const barHeight = Math.max(heightPercentage * 170, 2);
          
          return (
            <View key={`bar-${index}`} style={[
              styles.barColumn,
              {
                // Fixed width based on number of bars - wider than before
                width: barCount >= 12 ? '7.2%' : barCount > 9 ? '8.5%' : barCount > 6 ? '12%' : barCount > 3 ? '15.5%' : '30%',
                marginHorizontal: barCount >= 12 ? 0.5 : barCount > 9 ? 0.8 : 1,
              }
            ]}>
              {/* Value label above bar - shows actual value, not rounded */}
              {!dropdownVisible && value > 0 && (
                <Text style={[
                  styles.barValue, 
                  { bottom: barHeight + 20 }, // Increased from 15 to 20 to move higher
                  barCount >= 12 ? { fontSize: 9, width: 40 } : {}
                ]}>
                  {formatCompactCurrency(value)}
                </Text>
              )}
              
              {/* Bar container positioned at bottom with increased offset */}
              <View style={{
                position: 'absolute',
                bottom: 20, // Keep the same position
                height: barHeight,
                width: '100%',
                alignItems: 'center'
              }}>
                <View style={[
                  styles.bar, 
                  { width: getBarWidth() }
                ]} />
              </View>
              
              {/* Month label below bar - MOVED CLOSER TO AXIS */}
              <View style={[styles.monthLabelContainer, { bottom: -5 }]}>
                <Text style={[
                  styles.monthLabelText,
                  barCount >= 12 ? { fontSize: 9 } : barCount > 9 ? { fontSize: 10 } : {}
                ]}>
                  {labels[index]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }, [adjustedChartData, memoizedRoundedMax, labels, dropdownVisible]);
  
  // Log data structure, view mode, and loading state for debugging
  console.log(`[CHART DEBUG] View Mode: ${viewMode}, Loading: ${loading}, Fetching: ${fetchingData}`);
  console.log(`[CHART DEBUG] Data Keys:`, Object.keys(data || {}));
  console.log(`[CHART DEBUG] ${viewMode} Data:`, data?.[viewMode]);
  
  // Check if the viewMode data is available after initial loading
  useEffect(() => {
    if (!fetchingData && data && data[viewMode]?.data?.length > 0) {
      console.log(`[CHART] Data available for ${viewMode}, validating view mode`);
    }
  }, [data, viewMode, fetchingData]);
  
  // Memoize month labels to avoid rerendering
  const monthLabelsComponent = React.useMemo(() => (
    <View style={[
      styles.monthsRow || {}, // Added fallback empty object in case style is undefined
      viewMode === 'MTD' && (styles.singleMonthRow || {}),
      viewMode === 'YTD' && (styles.ytdMonthRow || {}),
      viewMode === '2024' && (styles.fullYearMonthRow || {})
    ]}>
      {labels.map((month, index) => (
        <View 
          key={`month-${index}`} 
          style={[
            styles.monthLabel || {}, // Added fallback empty object
            viewMode === 'MTD' && (styles.singleMonthLabel || {}),
            viewMode === 'YTD' && (styles.ytdMonthLabel || {}),
            viewMode === '2024' && (styles.fullYearMonthLabel || {})
          ]}
        >
          <Text style={styles.monthText || {}}>{month}</Text>
        </View>
      ))}
    </View>
  ), [labels, viewMode]);
  
  // Check if we have data to display
  if (!chartData || chartData.length === 0) {
    console.warn("No chart data available, showing empty state");
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="bar-chart-outline" size={20} color={GOLD.primary} />
            <Text style={styles.headerTitle}>Revenue Analysis</Text>
          </View>
          <FilterDropdown 
            viewMode={viewMode} 
            toggleDropdown={toggleDropdown} 
            dropdownVisible={dropdownVisible}
            selectViewMode={selectViewMode}
          />
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No revenue data available</Text>
        </View>
      </View>
    );
  }
  
  try {
    // Show loading indicator while fetching data
    if (fetchingData) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="bar-chart-outline" size={20} color={GOLD.primary} />
              <Text style={styles.headerTitle}>Revenue Analysis</Text>
            </View>
            <FilterDropdown 
              viewMode={viewMode} 
              toggleDropdown={toggleDropdown} 
              dropdownVisible={false} // Force close dropdown during loading
              selectViewMode={selectViewMode}
            />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GOLD.primary} />
            <Text style={styles.loadingText}>Loading {viewMode} data...</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="bar-chart-outline" size={20} color={GOLD.primary} />
            <Text style={styles.headerTitle}>Revenue Analysis</Text>
          </View>
          
          {/* Filter dropdown component */}
          <FilterDropdown 
            viewMode={viewMode} 
            toggleDropdown={toggleDropdown} 
            dropdownVisible={dropdownVisible}
            selectViewMode={selectViewMode}
          />
        </View>
        
        {/* Chart visualization */}
        <View style={styles.chartContainer}>          
          {/* Chart area with axes and bars */}
          <View style={styles.chartContent}>
            {/* Y-axis hidden */}
            
            <View style={styles.chartGrid}>
              <View style={styles.gridLines}>
                {memoizedAxisValues.map((value, i) => {
                  // Calculate the exact position from top based on the value's proportion
                  const numLines = memoizedAxisValues.length;
                  const isLast = i === numLines - 1;
                  
                  // Position based on the value's proportion of the maximum
                  // This ensures grid lines align with their actual values
                  const proportion = value / memoizedRoundedMax;
                  const position = 180 * (1 - proportion);  // Invert for display (0 at bottom)
                  
                  // Determine if this is the top label (largest value)
                  const isTop = i === 0;
                  // Determine if this is the bottom label (0 value)
                  const isBottom = i === numLines - 1;
                  
                  return (
                    <View 
                      key={`grid-line-${i}`} 
                      style={[
                        styles.rowContainer, 
                        { 
                          position: 'absolute', 
                          top: position,
                          width: '100%',
                          zIndex: isBottom ? 3 : 1
                        }
                      ]}
                    >
                      <View style={styles.labelContainer}>
                        <Text style={{
                          color: isTop ? '#555555' : isBottom ? '#FFFFFF' : '#AAAAAA',
                          fontSize: 8,
                          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                          fontWeight: isBottom ? '600' : '500', 
                          marginLeft: 3,
                          marginRight: 4,
                        }}>
                          {/* Don't display top label at all */}
                          {isTop ? '' : formatAxisCurrency(value)}
                        </Text>
                      </View>
                      {/* Custom dotted line implementation */}
                      <View style={{
                        position: 'absolute',
                        left: 47,
                        right: 15,
                        height: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        {/* Create 15 dots for the dotted line effect */}
                        {Array(15).fill().map((_, dotIndex) => (
                          <View
                            key={`dot-${i}-${dotIndex}`}
                            style={{
                              width: 2,
                              height: isBottom ? 1.5 : 1,
                              backgroundColor: '#FFFFFF',
                              opacity: isTop ? 0.3 : isBottom ? 0.7 : 0.4, // Varying opacity
                              borderRadius: 1,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
              
              <View style={[
                styles.barsArea,
                viewMode === 'MTD' && styles.singleBarArea,
                viewMode === 'YTD' && styles.ytdBarArea
              ]}>
                {renderBars()}
              </View>
            </View>
          </View>
          
          {/* Month labels - now using memoized component */}
          {monthLabelsComponent}
        </View>
        
        {/* Space between chart and total */}
        <View style={styles.spacer} />
        
        {/* Total summary always visible */}
        <View style={styles.totalContainer}>
          <View style={styles.totalIcon}>
            <Ionicons name="wallet-outline" size={14} color={GOLD.primary} />
          </View>
          <Text style={styles.totalLabel}>
            {viewMode === '6M' 
              ? 'Total for Last 6 Months' 
              : viewMode === 'YTD' 
                ? 'Year to Date Total' 
                : viewMode === '2024'
                  ? '2024 Total'
                  : 'Month to Date Total'
            }
          </Text>
          <Text style={styles.totalValue}>{formatCurrency(totalPayout)}</Text>
        </View>
        
        {/* Toggle button for expanding/collapsing - only show for 6M view */}
        {viewMode === '6M' && (
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={toggleExpanded}
            activeOpacity={0.7}
          >
            <View style={styles.toggleContentWrapper}>
              <Text style={styles.toggleText}>
                {expanded ? 'Hide Monthly Breakdown' : 'Show Monthly Breakdown'}
              </Text>
              <Animated.View style={{
                transform: [{
                  rotate: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg']
                  })
                }],
                marginTop: 1
              }}>
                <Ionicons 
                  name="chevron-down" 
                  size={16} 
                  color={GOLD.primary} 
                />
              </Animated.View>
            </View>
          </TouchableOpacity>
        )}
        
        {/* Collapsible section - only for 6M view */}
        {viewMode === '6M' && (
          <Animated.View style={[
            styles.collapsibleSection,
            {
              height: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, detailSectionHeight]
              }),
              opacity: expandAnim,
              overflow: 'hidden'
            }
          ]}>
            {/* Monthly breakdown section */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={styles.tableHeaderCell}>
                  <Ionicons name="calendar-outline" size={16} color={GOLD.primary} style={styles.headerIcon} />
                  <Text style={styles.tableHeaderText}>Month</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.rightAlign]}>
                  <Ionicons name="cash-outline" size={16} color={GOLD.primary} style={styles.headerIcon} />
                  <Text style={[styles.tableHeaderText]}>Owner Payout</Text>
                </View>
              </View>
              
              {/* Table rows */}
              <View style={styles.tableContent}>
                {sixMonthLabels.map((month, index) => {
                  // Use actual data from API
                  const displayValue = chartData[index] || 0;
                  
                  return (
                    <View 
                      key={`row-${index}`} 
                      style={[
                        styles.tableRow,
                        index % 2 === 0 && styles.tableRowEven
                      ]}
                    >
                      <Text style={styles.tableMonth}>{month}</Text>
                      <Text style={[styles.tableValue, (!displayValue || displayValue === 0) && styles.zeroValue]}>
                        {typeof displayValue === 'number' && displayValue > 0 
                          ? formatCurrency(displayValue) 
                          : '-'}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.totalRowWrapper}>
                  <View style={[styles.tableRow, styles.totalRow]}>
                    <Text style={styles.totalCell}>Total</Text>
                    <Text style={[styles.totalCell, { textAlign: 'right' }]}>
                      {formatCurrency(
                        viewMode === '6M' 
                          ? (validValues.reduce((sum, val) => sum + val, 0))
                          : (validValues.length > 0 ? validValues[validValues.length - 1] : 0)
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Monthly average section - only for 6M view*/}
            <View style={styles.averageContainer}>
              <View style={styles.averageContent}>
                <Text style={styles.summaryLabel}>Monthly Average</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(
                    validValues.length > 0
                      ? (validValues.reduce((sum, val) => sum + val, 0) / validValues.length)
                      : 0
                  )}
                </Text>
              </View>
            </View>
            
            {/* Add bottom padding */}
            <View style={styles.bottomPadding}></View>
          </Animated.View>
        )}
      </View>
    );
  } catch (error) {
    // Log the specific error for debugging
    console.error("Error rendering RevenueChart:", error);
    
    // Return the fallback UI
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="bar-chart-outline" size={20} color={GOLD.primary} />
            <Text style={styles.headerTitle}>Revenue Analysis</Text>
          </View>
          <FilterDropdown 
            viewMode={viewMode} 
            toggleDropdown={toggleDropdown} 
            dropdownVisible={dropdownVisible}
            selectViewMode={selectViewMode}
          />
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Unable to display revenue data</Text>
          {__DEV__ && (
            <Text style={[styles.noDataText, {fontSize: 11, marginTop: 8}]}>
              Error: {error.message}
            </Text>
          )}
        </View>
      </View>
    );
  }
};

// Create optimized dropdown item component 
const DropdownItem = memo(({ label, isActive, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.dropdownItem, isActive && styles.dropdownItemActive]} 
      onPress={onPress}
    >
      <Text style={styles.dropdownItemText}>{label}</Text>
      {isActive && (
        <Ionicons name="checkmark" size={16} color={GOLD.primary} />
      )}
    </TouchableOpacity>
  );
});

// Define a separate container for the dropdown component
const FilterDropdown = React.memo(({ viewMode, toggleDropdown, dropdownVisible, selectViewMode }) => {
  const getViewModeLabel = (mode) => {
    switch (mode) {
      case 'MTD': return 'Month to Date';
      case 'YTD': return 'Year to Date';
      case '2024': return '2024';
      default: return 'Last 6 Months';
    }
  };
  
  // Create an improved version of the menu that renders on top layer
  const renderDropdownMenu = () => {
    if (!dropdownVisible) return null;
    
    return (
      <>
        {/* Solid opaque backdrop to block all content */}
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={toggleDropdown}
          activeOpacity={1}
        />
        
        {/* Completely solid dropdown menu */}
        <View style={[
          styles.dropdownMenu,
          Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 15 } : {}
        ]}>
          <View style={styles.dropdownContent}>
            <DropdownItem 
              label="Last 6 Months"
              isActive={viewMode === '6M'}
              onPress={() => selectViewMode('6M')}
            />
            
            <DropdownItem 
              label="2024"
              isActive={viewMode === '2024'}
              onPress={() => selectViewMode('2024')}
            />
            
            <DropdownItem 
              label="Year to Date"
              isActive={viewMode === 'YTD'}
              onPress={() => selectViewMode('YTD')}
            />
            
            <DropdownItem 
              label="Month to Date"
              isActive={viewMode === 'MTD'}
              onPress={() => selectViewMode('MTD')}
            />
          </View>
        </View>
      </>
    );
  };
  
  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Text style={styles.headerBadgeText}>
          {getViewModeLabel(viewMode)}
        </Text>
        <Ionicons 
          name={dropdownVisible ? "chevron-up" : "chevron-down"} 
          size={14} 
          color={GOLD.primary} 
          style={styles.dropdownIcon} 
        />
      </TouchableOpacity>
      
      {renderDropdownMenu()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'visible',
    marginBottom: 16,
    marginHorizontal: 16,
    paddingBottom: 6,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 18,
    position: 'relative',
    zIndex: 5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  headerBadge: {
    backgroundColor: 'rgba(182, 148, 76, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    color: GOLD.primary,
    fontWeight: '500',
  },
  chartContainer: {
    paddingTop: 20,
    paddingBottom: 0,
    marginHorizontal: 0, // Remove negative margin to prevent overflow
    overflow: 'hidden', // Prevent overflow
  },
  chartContent: {
    height: 230, // Fixed chart height
    flexDirection: 'row',
    paddingRight: 5,
    position: 'relative',
    overflow: 'visible',
  },
  yAxis: {
    width: 0, // Hide y-axis completely
    display: 'none', // Ensure it doesn't take up space
  },
  chartGrid: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
    marginBottom: 30, // Space for month labels
  },
  barsArea: {
    flex: 1,
    paddingLeft: 40, // Keep the same padding
    paddingRight: 15,
    height: 170, // Match grid height exactly
    overflow: 'visible',
  },
  barsOuterContainer: {
    position: 'absolute',
    bottom: 0,
    // left/right set dynamically in renderBars
    height: 170, // Match grid height
    flexDirection: 'row',
    justifyContent: 'space-between', // Keep space-between for consistent spacing
    alignItems: 'flex-end',
    overflow: 'visible',
  },
  barColumn: {
    height: '100%',
    alignItems: 'center',
    position: 'relative',
    // No fixed width here - set dynamically in render function
  },
  bar: {
    height: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: GOLD.primary,
    // Width set dynamically in render function
  },
  monthLabelContainer: {
    position: 'absolute',
    bottom: -5, // Changed from -10 to -5 to move even closer to axis
    left: 0,
    right: 0,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  monthLabelText: {
    fontSize: 11, // Default font size
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingTop: 2,
    maxWidth: '100%', // Allow full width
  },
  spacer: {
    height: 10, // Add space between chart and total
  },
  collapsibleSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: 400, // Increased from 360 to 400
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomColor: 'rgba(255, 255, 255, 0.0)',
    height: 46,
  },
  toggleContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    marginTop: 3,
  },
  toggleText: {
    color: GOLD.primary,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 6,
    lineHeight: 20,
    marginTop: 0,
    textAlignVertical: 'center',
  },
  tableContainer: {
    borderTopWidth: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  rightAlign: {
    justifyContent: 'flex-end',
  },
  tableHeaderText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  tableContent: {
    // No maxHeight - allow it to show all months
    width: '100%', // Ensure full width
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableRowEven: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tableMonth: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tableValue: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#FFFFFF',
  },
  zeroValue: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(182, 148, 76, 0.1)',
  },
  totalIcon: {
    marginRight: 10,
  },
  totalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#B6944C',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B6944C',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  averageContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  averageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  totalRowWrapper: {
    paddingBottom: 16,
    marginBottom: 20,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 5,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
  },
  totalCell: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
  barValue: {
    position: 'absolute',
    fontSize: 9, // Smaller font size
    fontWeight: '400', // Thinner font weight
    color: GOLD.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    width: 40, // Reduced width
    alignSelf: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  // Dropdown filter styles
  filterContainer: {
    position: 'relative',
    zIndex: 1000, // Much higher z-index
  },
  filterButton: {
    backgroundColor: 'rgba(182, 148, 76, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownIcon: {
    marginLeft: 5,
    marginTop: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#000000', // Darker background
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(182, 148, 76, 0.5)',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15, // Increased shadow
    elevation: 100,
    zIndex: 1000,
    width: 170,
  },
  dropdownContent: {
    backgroundColor: '#000000', // Completely black background
    borderRadius: 12,
    padding: 8,
    width: '100%',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000000', // Matching black background
    marginVertical: 2,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(182, 148, 76, 0.35)', // Slightly darker
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  backdrop: {
    position: 'absolute',
    top: -100, // Start higher to cover more
    left: -2000, // Cover more horizontal space
    right: -2000,
    bottom: -2000,
    backgroundColor: '#000000', // Fully black background
    zIndex: 900, // Very high z-index
  },
  // Remove monthsRow styles since we no longer need them
  monthsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    display: 'none', // Hide this row completely
  },
  // Hide all month label styles that create the vertical labels
  monthLabel: {
    alignItems: 'center',
    display: 'none', // Hide these labels
  },
  monthText: {
    color: 'transparent', // Make text invisible
    fontSize: 0, // Reduce size to nothing
    height: 0,
  },
  singleMonthRow: {
    display: 'none', // Hide these rows
  },
  ytdMonthRow: {
    display: 'none', // Hide these rows
  },
  fullYearMonthRow: {
    display: 'none', // Hide these rows
  },
  singleMonthLabel: {
    display: 'none', // Hide these labels
  },
  ytdMonthLabel: {
    display: 'none', // Hide these labels
  },
  fullYearMonthLabel: {
    display: 'none', // Hide these labels
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    fontSize: 14,
  },
  singleBarArea: {
    paddingBottom: 30, // Match with gridLines padding
  },
  ytdBarArea: {
    paddingBottom: 30, // Match with gridLines padding
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    height: 'auto',
  },
  labelContainer: {
    width: 45, // Slightly wider for better text spacing
    paddingRight: 5,
    alignItems: 'flex-end', // Right-align text
    position: 'absolute',
    left: 0, // Align with left edge
    zIndex: 5, // Ensure labels appear above lines
  },
  axisLabel: {
    fontSize: 8,
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginLeft: 3,
  },
  bottomAxisLabel: {
    color: 'rgba(255, 255, 255, 0.9)', 
    fontWeight: '600',
  },
  regularAxisLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 170, // Fixed grid height (slightly less than chart for spacing)
    overflow: 'visible',
    zIndex: 5,
  },
});

export default RevenueChart;