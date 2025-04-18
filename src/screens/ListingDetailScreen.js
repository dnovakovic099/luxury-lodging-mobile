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
import { processRevenueData } from '../utils/revenueUtils';
import { getReservationsWithFinancialData } from '../services/api';
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
  const [reservations, setReservations] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Directly use the passed totalRevenue without modification
  const revenue = passedTotalRevenue || 0;

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Properties'
    });
  }, [navigation]);

  const loadPropertyData = async () => {
    if (!property || !property.id) return;

    setLoading(true);
    try {
      const listingIds = [property.id];
      
      const allReservationsParams = {
        listingMapIds: listingIds,
        dateType: 'arrivalDate',
        status: 'confirmed'
      };
      
      console.log('Fetching property reservations with params:', allReservationsParams);
      const result = await getReservationsWithFinancialData(allReservationsParams);
      
      const validReservations = (result?.reservations || []).filter(res => 
        VALID_STATUSES.includes(res.status)
      );
      
      setReservations(validReservations);
      
      const processedData = processRevenueData(validReservations);
      console.log('Chart data processed:', processedData ? 
        `Found data for periods: ${Object.keys(processedData).join(', ')}` : 
        'No chart data processed');
      setChartData(processedData);
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
            value={formatCurrency(revenue)}
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