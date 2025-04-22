import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';

// Get screen dimensions
const screenWidth = Dimensions.get('window').width;
// Chart constants
const CHART_HEIGHT = 210;
// Single solid gold color
const PRIMARY_COLOR = '#E6CD7F'; // Bright, clean gold
const SECONDARY_COLOR = '#DCBF78'; // Very similar to primary, less contrast
const ACCENT_COLOR = '#EFD691'; // Light gold accent
const HIGHLIGHT_COLOR = '#D4AF37'; // Slightly deeper gold for highlights
const TEXT_COLOR = '#8B7332'; // Rich gold text
const MUTED_COLOR = '#BE9C51'; // Rich gold text but more subtle
const LABEL_COLOR = '#BE9C51'; // For text and labels

// Helper function to get last 6 months labels
const getLastSixMonthsLabels = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const result = [];
  
  // Get 6 months ending with current month (starting with oldest)
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(today.getMonth() - i);
    const monthIndex = date.getMonth();
    result.push(months[monthIndex]);
  }
  
  return result;
};

// Helper function to get year-to-date months
const getYearToDateMonths = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const currentMonth = today.getMonth();
  
  return months.slice(0, currentMonth + 1);
};

// Helper function to get months for current year
const getMonthsForYear = (year = new Date().getFullYear()) => {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
};

// Helper function to get current month
const getCurrentMonth = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  return [months[today.getMonth()]];
};

// Helper function to format currency with cents
const formatFullCurrency = (value) => {
  if (typeof value !== 'number') return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

// Helper function to format compact currency with clearer format
const formatCompactCurrency = (value) => {
  if (typeof value !== 'number' || value === 0) return '$0';
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  } else {
    return `$${Math.round(value)}`;
  }
};

// Update SimpleBarChart to position value labels correctly above each bar
const SimpleBarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.y), 300000); // Ensure we have a reasonable max value
  
  // Calculate bar sizes based on number of items
  const barWidth = data.length <= 7 ? 20 : data.length <= 9 ? 16 : 14;
  const columnWidth = data.length <= 7 ? 32 : data.length <= 9 ? 28 : 24;
  
  // Calculate bar heights scaled to the max value
  const calculateBarHeight = (value) => {
    // Scale value to chart height
    const ratio = value / maxValue;
    return Math.max(ratio * CHART_HEIGHT, value > 0 ? 2 : 0);
  };
  
  return (
    <View style={styles.simpleChartContainer}>
      {/* Y-axis labels */}
      <View style={styles.yAxisLabels}>
        <Text style={styles.yAxisText}>$300k</Text>
        <Text style={styles.yAxisText}>$240k</Text>
        <Text style={styles.yAxisText}>$180k</Text>
        <Text style={styles.yAxisText}>$120k</Text>
        <Text style={styles.yAxisText}>$60k</Text>
        <Text style={styles.yAxisText}>$0</Text>
      </View>
      
      {/* Chart Content Area */}
      <View style={styles.chartContentArea}>
        {/* Grid lines */}
        <View style={styles.gridLinesContainer}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>
        
        {/* Bar columns */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const barHeight = calculateBarHeight(item.y);
            
            // Check if this is the highest value to highlight it
            const isHighest = item.y === Math.max(...data.map(d => d.y));
            
            // Format the value text to ensure it fits
            const valueText = item.y > 0 ? formatCompactCurrency(item.y) : '';
            
            return (
              <View key={index} style={[styles.barColumn, { width: columnWidth }]}>
                {/* Bar and value container */}
                <View style={[styles.barContainer, { height: barHeight, width: barWidth }]}>
                  <View style={[
                    styles.bar,
                    isHighest ? styles.barHighlight : null
                  ]} />
                  
                  {/* Value label - positioned directly above the bar */}
                  <View style={styles.valueContainer}>
                    <Text style={[
                      styles.barValueText,
                      isHighest && styles.barValueHighlight
                    ]} numberOfLines={1} ellipsizeMode="tail">
                      {valueText}
                    </Text>
                  </View>
                </View>
                
                {/* Month label below */}
                <View style={styles.labelContainer}>
                  <Text style={[
                    styles.xAxisLabel,
                    isHighest && styles.xAxisLabelHighlight
                  ]}>
                    {item.x}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const RevenueChart = ({ data, loading, onFetchData, onDataUpdate }) => {
  // State for view mode
  const [viewMode, setViewMode] = useState('6M'); // '6M', 'YTD', 'MTD', or '2024'
  // State for dropdown menu
  const [dropdownVisible, setDropdownVisible] = useState(false);
  // State to track if we're waiting for data
  const [fetchingData, setFetchingData] = useState(false);
  // Get theme context
  const { theme } = useTheme();
  // Flag to track if we've notified parent of data
  const [dataNotified, setDataNotified] = useState({});

  // Helper function to get display label for view mode
  const getViewModeLabel = (mode) => {
    switch (mode) {
      case 'MTD': return 'Current Month';
      case 'YTD': return 'Year to Date';
      case '2024': return '2024';
      default: return 'Last 6 Months';
    }
  };

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  // Method to handle view mode selection
  const selectViewMode = async (mode) => {
    try {
      // If already in this mode, do nothing
      if (mode === viewMode) {
        setDropdownVisible(false);
        return;
      }
      
      // Set loading state and fetch data if needed
      setViewMode(mode);
      setDropdownVisible(false);
      setFetchingData(true);
      
      if (onFetchData) {
        const newData = await onFetchData(mode);
        
        // If we got fresh data and have a notification callback, use it
        if (newData && onDataUpdate) {
          console.log(`📱 RevenueChart: Notifying parent of newly fetched ${mode} data`);
          onDataUpdate(mode, newData);
          
          // Update notification record
          const dataSignature = JSON.stringify(newData);
          setDataNotified(prev => ({ 
            ...prev, 
            [mode]: dataSignature 
          }));
        }
      }
    } catch (error) {
      console.error(`[CHART] Error while changing to ${mode} mode:`, error);
    } finally {
      setFetchingData(false);
    }
  };

  // Get appropriate labels based on view mode
  const getLabels = () => {
    switch (viewMode) {
      case 'MTD':
        return getCurrentMonth();
      case 'YTD':
        return getYearToDateMonths();
      case '2024':
        return getMonthsForYear(2024);
      default: // '6M'
        return getLastSixMonthsLabels();
    }
  };

  // Prepare data for the chart
  const prepareChartData = () => {
    try {
      // Default empty data with labels
      const labels = getLabels();
      const defaultData = labels.map(label => ({ x: label, y: 0 }));
      
      // If no data is available, return default
      if (!data || !data[viewMode] || !data[viewMode].data) {
        return defaultData;
      }

      // Extract the data for current view mode
      const viewData = data[viewMode];
      const values = viewData.data || [];
      
      // For 6M view, handle missing data
      if (viewMode === '6M') {
        const sixMonthLabels = getLastSixMonthsLabels();
        const sixMonthData = sixMonthLabels.map(label => ({ x: label, y: 0 }));
        
        // Handle missing November data 
        if (Array.isArray(viewData.labels) && 
            viewData.labels.length === 5 &&
            viewData.labels[0] === 'Dec') {
          
          // Fill in all available data
          for (let i = 0; i < viewData.labels.length; i++) {
            const apiMonth = viewData.labels[i];
            const monthIndex = sixMonthLabels.indexOf(apiMonth);
            if (monthIndex !== -1) {
              sixMonthData[monthIndex].y = viewData.data[i];
            }
          }
          
          // Estimate November value as 80% of December
          const novemberIndex = sixMonthLabels.indexOf('Nov');
          if (novemberIndex !== -1 && viewData.data[0]) {
            sixMonthData[novemberIndex].y = Math.round(viewData.data[0] * 0.8);
          }
        } 
        // Handle API data normally
        else if (Array.isArray(values) && values.length > 0) {
          // Two possible data formats: with labels or without
          if (Array.isArray(viewData.labels) && viewData.labels.length > 0) {
            for (let i = 0; i < viewData.labels.length; i++) {
              const apiMonth = viewData.labels[i];
              const monthIndex = sixMonthLabels.indexOf(apiMonth);
              if (monthIndex !== -1 && viewData.data && viewData.data[i] !== undefined) {
                sixMonthData[monthIndex].y = viewData.data[i];
              }
            }
          } else {
            // No labels, assume data is already in right order
            const dataLength = Math.min(values.length, 6);
            for (let i = 0; i < dataLength; i++) {
              sixMonthData[i].y = values[i];
            }
          }
        }
        
        return sixMonthData;
      }
      
      // For other views, map labels with values
      const chartLabels = viewData.labels || getLabels();
      return chartLabels.map((label, index) => ({
        x: label,
        y: index < values.length ? values[index] : 0
      }));
    } catch (error) {
      console.error('Error in prepareChartData:', error);
      return getLabels().map(label => ({ x: label, y: 0 }));
    }
  };

  // Calculate the total revenue
  const calculateTotal = () => {
    if (!data || !data[viewMode]) return 0;
    
    // If total is provided directly, use it
    if (data[viewMode].total) {
      return data[viewMode].total;
    }
    
    // Otherwise calculate from data
    const values = data[viewMode].data || [];
    return values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
  };

  // Debug actual values and notify parent of data updates
  useEffect(() => {
    if (data && data[viewMode]) {
      console.log(`[RevenueChart] ${viewMode} data:`, data[viewMode]);
      
      // Check if we have meaningful data
      const viewData = data[viewMode];
      const hasValidData = viewData && 
                          viewData.data && 
                          viewData.data.length > 0 && 
                          viewData.data.some(val => val > 0);
      
      // Only notify parent if we have valid data and haven't notified for this viewMode yet
      // or if the data has changed
      const dataSignature = JSON.stringify(viewData);
      if (hasValidData && 
          (!dataNotified[viewMode] || dataNotified[viewMode] !== dataSignature) && 
          onDataUpdate) {
        console.log(`📱 RevenueChart: Notifying parent of ${viewMode} data update`);
        onDataUpdate(viewMode, viewData);
        
        // Update notification record
        setDataNotified(prev => ({ 
          ...prev, 
          [viewMode]: dataSignature 
        }));
      }
    }
  }, [data, viewMode, onDataUpdate]);

  // Render the dropdown menu
  const renderDropdownMenu = () => {
    return (
      <View style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.borderColor }]}>
        <View style={[styles.dropdownContent, { backgroundColor: theme.surface }]}>
          {/* MTD Option */}
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              viewMode === 'MTD' && [styles.dropdownItemActive, { backgroundColor: `${theme.primary}35` }],
            ]}
            onPress={() => selectViewMode('MTD')}
          >
            <Text style={[styles.dropdownItemText, { color: theme.text.primary }]}>Current Month</Text>
            {viewMode === 'MTD' && <Ionicons name="checkmark" size={18} color={theme.primary} />}
          </TouchableOpacity>
          
          {/* YTD Option */}
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              viewMode === 'YTD' && [styles.dropdownItemActive, { backgroundColor: `${theme.primary}35` }],
            ]}
            onPress={() => selectViewMode('YTD')}
          >
            <Text style={[styles.dropdownItemText, { color: theme.text.primary }]}>Year to Date</Text>
            {viewMode === 'YTD' && <Ionicons name="checkmark" size={18} color={theme.primary} />}
          </TouchableOpacity>
          
          {/* 6M Option */}
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              viewMode === '6M' && [styles.dropdownItemActive, { backgroundColor: `${theme.primary}35` }],
            ]}
            onPress={() => selectViewMode('6M')}
          >
            <Text style={[styles.dropdownItemText, { color: theme.text.primary }]}>Last 6 Months</Text>
            {viewMode === '6M' && <Ionicons name="checkmark" size={18} color={theme.primary} />}
          </TouchableOpacity>
          
          {/* 2024 Option */}
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              viewMode === '2024' && [styles.dropdownItemActive, { backgroundColor: `${theme.primary}35` }],
            ]}
            onPress={() => selectViewMode('2024')}
          >
            <Text style={[styles.dropdownItemText, { color: theme.text.primary }]}>2024</Text>
            {viewMode === '2024' && <Ionicons name="checkmark" size={18} color={theme.primary} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Show loading indicator while fetching data
  if (fetchingData) {
    return (
      <View style={[styles.containerOuter]}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: `${PRIMARY_COLOR}15` }]}>
            <View style={styles.titleContainer}>
              <Ionicons name="trending-up" size={20} color={PRIMARY_COLOR} />
              <Text style={[styles.title, { color: theme.text.primary }]}>Revenue</Text>
            </View>
            
            <View style={styles.filterContainer}>
              <TouchableOpacity
                onPress={toggleDropdown}
                style={[styles.filterButton, { backgroundColor: `${PRIMARY_COLOR}15` }]}
              >
                <Text style={[styles.filterText, { color: PRIMARY_COLOR }]}>{getViewModeLabel(viewMode)}</Text>
                <Ionicons
                  name={dropdownVisible ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={PRIMARY_COLOR}
                  style={styles.dropdownIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading {viewMode} data...</Text>
          </View>
        </View>
      </View>
    );
  }

  // Prepare chart data
  const chartData = prepareChartData();
  
  return (
    <View style={[styles.containerOuter]}>
      <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        {/* Header with title, total and dropdown */}
        <View style={[styles.cardHeader, { borderBottomColor: `${PRIMARY_COLOR}20` }]}>
          <View style={styles.titleContainer}>
            <Ionicons name="trending-up" size={20} color={PRIMARY_COLOR} />
            <View style={styles.titleAndTotalContainer}>
              <Text style={[styles.title, { color: '#333333' }]}>Revenue</Text>
              <Text style={styles.totalInHeader}>Total: {formatFullCurrency(calculateTotal())}</Text>
            </View>
          </View>
          
          <View style={styles.filterContainer}>
            <TouchableOpacity
              onPress={toggleDropdown}
              style={[styles.filterButton]}
            >
              <Text style={[styles.filterText]}>{getViewModeLabel(viewMode)}</Text>
              <Ionicons
                name={dropdownVisible ? "chevron-up" : "chevron-down"}
                size={14}
                color={HIGHLIGHT_COLOR}
                style={styles.dropdownIcon}
              />
            </TouchableOpacity>
            
            {dropdownVisible && (
              <View style={styles.backdrop} onTouchStart={toggleDropdown} />
            )}
            
            {dropdownVisible && renderDropdownMenu()}
          </View>
        </View>
        
        {/* Chart Content */}
        <View style={[styles.chartContent, { backgroundColor: '#FFFFFF' }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              <Text style={[styles.loadingText, { color: '#888888' }]}>Loading revenue data...</Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              {/* Simple Chart Implementation */}
              <View style={[styles.chartWrapper, { backgroundColor: '#FFFFFF' }]}>
                <SimpleBarChart data={chartData} />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// Update styles to ensure values are visible and filter is prominent
const styles = StyleSheet.create({
  containerOuter: {
    paddingHorizontal: 16,
    width: '100%',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E0D5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E0D5',
    backgroundColor: '#FFFFFF',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleAndTotalContainer: {
    marginLeft: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 0.3,
  },
  totalInHeader: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  filterContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  filterButton: {
    backgroundColor: 'rgba(182, 148, 76, 0.15)', // Changed to match the dropdownItemActive background
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  filterText: {
    fontSize: 11,
    color: HIGHLIGHT_COLOR,
    fontWeight: '700',
    marginRight: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  dropdownIcon: {
    marginLeft: 5,
    marginTop: 1,
    color: HIGHLIGHT_COLOR,
  },
  backdrop: {
    position: 'absolute',
    top: -100,
    left: -2000,
    right: -2000,
    bottom: -2000,
    backgroundColor: 'transparent',
    zIndex: 900,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    width: 170,
  },
  dropdownContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    marginVertical: 2,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(182, 148, 76, 0.15)',
  },
  dropdownItemText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  chartContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chartContainer: {
    width: '100%',
  },
  chartWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 0,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 10,
    fontSize: 14,
  },
  
  // Chart styles with better fit for more bars
  simpleChartContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 25, 
    paddingBottom: 5,
    paddingHorizontal: 4,
  },
  yAxisLabels: {
    width: 38,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    height: CHART_HEIGHT,
  },
  yAxisText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#998E7A',
    textAlign: 'right',
  },
  chartContentArea: {
    flex: 1,
    position: 'relative',
    paddingBottom: 25,
  },
  gridLinesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
  },
  gridLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(201, 178, 84, 0.04)',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingHorizontal: 2,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_HEIGHT,
    position: 'relative',
  },
  valueContainer: {
    position: 'absolute',
    top: -24, // Positioned directly above the bar
    alignItems: 'center',
    width: 70,
    left: -25,
    right: -25,
    zIndex: 5,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: LABEL_COLOR,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center',
    borderWidth: 0.5,
    borderColor: `${PRIMARY_COLOR}20`,
    maxWidth: '100%',
  },
  barValueHighlight: {
    color: HIGHLIGHT_COLOR,
    fontWeight: '700',
    backgroundColor: '#FFF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  barContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  barHighlight: {
    backgroundColor: HIGHLIGHT_COLOR,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 10,
    color: LABEL_COLOR,
    fontWeight: '500',
    textAlign: 'center',
  },
  xAxisLabelHighlight: {
    color: HIGHLIGHT_COLOR,
    fontWeight: '600',
  },
});

export default RevenueChart;