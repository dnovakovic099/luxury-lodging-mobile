import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PropertyInfo, StatItem } from '../components/DetailComponent';
import RevenueChart from '../components/RevenueChart';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getListingFinancials, getMonthlyRevenueData } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

if (typeof global.self === 'undefined') {
  global.self = global;
}

const MetricCard = ({ icon, label, value, color = theme.colors.primary, large = false }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={styles.metricContent}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, large && styles.largeMetricValue]}>{value}</Text>
    </View>
  </View>
);

const ListingDetailScreen = ({ route, navigation }) => {
  const { property, totalRevenue: passedTotalRevenue } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [propertyRevenue, setPropertyRevenue] = useState(passedTotalRevenue || 0);

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Properties'
    });
  }, [navigation]);

  const loadPropertyData = async () => {
    if (!property || !property.id) return;

    setLoading(true);
    try {
      const listingId = property.id;
      
      // 1. Get total revenue for this property using getListingFinancials
      const totalRevenueParams = {
        listingMapIds: [listingId],
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      };
      
      console.log(`Fetching total revenue for property ${listingId}`);
      const totalRevenueData = await getListingFinancials(totalRevenueParams);
      const totalRevenue = totalRevenueData?.result?.ownerPayout || 0;
      
      // Only update if we didn't get a value from the listings screen or if it's different
      if (!passedTotalRevenue || passedTotalRevenue !== totalRevenue) {
        setPropertyRevenue(totalRevenue);
      }
      
      // 2. Get monthly revenue data for chart
      console.log(`Fetching monthly revenue data for property ${listingId}`);
      const monthlyData = await getMonthlyRevenueData([listingId], 24); // Get 24 months of data for better filtering
      
      // Process data for different time periods
      const currentYear = new Date().getFullYear();
      
      // Process 6M data - keep as is (API already returns last 6 months)
      const sixMonthsData = {
        labels: monthlyData.labels.slice(0, 6),
        data: monthlyData.data.slice(0, 6),
        years: monthlyData.years.slice(0, 6),
        total: monthlyData.data.slice(0, 6).reduce((sum, val) => sum + val, 0)
      };
      
      // Process YTD data - filter current year only
      const ytdData = {
        labels: [],
        data: [],
        years: [],
        total: 0
      };
      
      // Process current month data
      const currentMonth = new Date().getMonth(); // 0-based (Jan=0, Dec=11)
      const currentMonthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth];
      const mtdData = {
        labels: [currentMonthName],
        data: [0], // Default to 0
        years: [currentYear],
        total: 0
      };
      
      // Process 2024 data specifically
      const year2024Data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        data: Array(12).fill(0),
        years: Array(12).fill(2024),
        total: 0
      };
      
      // Filter data for YTD, MTD and 2024 views
      for (let i = 0; i < monthlyData.labels.length; i++) {
        const year = monthlyData.years[i];
        const month = monthlyData.labels[i];
        const value = monthlyData.data[i];
        
        // Add to YTD if current year
        if (year === currentYear) {
          ytdData.labels.push(month);
          ytdData.data.push(value);
          ytdData.years.push(year);
          ytdData.total += value;
          
          // Add to MTD if current month
          if (month === currentMonthName) {
            mtdData.data[0] = value;
            mtdData.total = value;
          }
        }
        
        // Add to 2024 data if it's from 2024
        if (year === 2024) {
          // Find month index (Jan=0, Feb=1, etc)
          const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
          if (monthIndex !== -1) {
            year2024Data.data[monthIndex] = value;
            year2024Data.total += value;
          }
        }
      }
      
      // Format the data for the chart component
      // The RevenueChart component expects data in a specific format with labels array and data array
      const formattedChartData = {
        '6M': sixMonthsData,
        'YTD': ytdData,
        'MTD': mtdData,
        '2024': year2024Data,
        'ALL': sixMonthsData,
        // Keep 1W, 1M, 3M, 1Y with empty data for backward compatibility
        '1W': { labels: [], data: [], years: [], total: 0 },
        '1M': { labels: [], data: [], years: [], total: 0 },
        '3M': { labels: [], data: [], years: [], total: 0 },
        '1Y': { labels: [], data: [], years: [], total: 0 }
      };
      
      setChartData(formattedChartData);
      console.log('Chart data updated with direct API data:', {
        labels: monthlyData.labels,
        years: monthlyData.years,
        values: monthlyData.data,
        total: monthlyData.total,
        ytdTotal: ytdData.total,
        year2024Total: year2024Data.total
      });
      
    } catch (error) {
      console.error('Error loading property data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPropertyData();
    }, [property?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPropertyData();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Property Header with Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: property.listingImages?.[0]?.url || 'https://via.placeholder.com/400' }}
          style={styles.headerImage}
        />
        <View style={styles.imageOverlay} />
        <View style={styles.propertyNameContainer}>
          <Text style={styles.propertyName}>{property.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Metrics Section */}
        <View style={styles.metricsContainer}>
          <MetricCard 
            icon="analytics-outline"
            label="Marketing Score"
            value={`${property.marketingScore || 85}/100`}
            color="#4CAF50"
          />
          
          <MetricCard 
            icon="cash-outline"
            label="Total Revenue"
            value={formatCurrency(propertyRevenue)}
            large={true}
          />
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Revenue Analysis</Text>
          <RevenueChart data={chartData} loading={loading} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  propertyNameContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  propertyName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  metricsContainer: {
    marginTop: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  largeMetricValue: {
    fontSize: 18,
    color: theme.colors.primary,
  },
  chartSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ListingDetailScreen;