import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PropertyInfo, StatItem } from '../components/DetailComponent';
import RevenueChart from '../components/RevenueChart';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { processRevenueData, getChartLabels } from '../utils/revenueUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

if (typeof global.self === 'undefined') {
  global.self = global;
}

const ListingDetailScreen = ({ route }) => {
  const { property } = route.params;
  const { reservations: allReservations, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [reservations, setReservations] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const processData = async () => {
    if (!allReservations) return;

    setLoading(true);
    try {
      const propertyReservations = allReservations.filter(res => {
        return res.listingMapId === property.id
      });

      setReservations(propertyReservations);

      const validReservations = propertyReservations.filter(res => 
        VALID_STATUSES.includes(res.status)
      );
      
      const processedData = processRevenueData(validReservations);
      setChartData(processedData);
      
      if (processedData && processedData['1Y']) {
        setRevenue(processedData['1Y'].total);
      }
    } catch (error) {
      console.error('Error processing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    processData();
  }, [allReservations, property.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    return Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24));
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
      <Image
        source={{ uri: property.listingImages?.[0]?.url || 'https://via.placeholder.com/400' }}
        style={styles.headerImage}
      />

      <View style={styles.content}>
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <View style={styles.propertyLocation}>
            {/* <Ionicons 
              name="location-outline" 
              size={14} 
              color={theme.colors.text.secondary} 
            /> */}
            {/* <Text style={styles.propertyAddress}>
              {property.address?.city || 'Location unavailable'}
            </Text> */}
          </View>
        </View>

        <View style={styles.metricsContainer}>
          <PropertyInfo 
            icon="analytics-outline"
            label="Marketing Score"
            value={`${property.marketingScore || 85}/100`}
          />
          
          <View style={styles.statsGrid}>
            <StatItem 
              icon="cash-outline"
              value={`$${Math.round(revenue / 1000)}k`}
              label="Revenue YTD" 
              large={true}
              trend={12.5}
            />
            <StatItem 
              icon="time-outline"
              value={getDaysRemaining()}
              label="Days Remaining" 
            />
          </View>
        </View>

        <View style={styles.chartSection}>
          <RevenueChart 
            data={{ 
              monthlyRevenue: chartData?.[selectedPeriod]?.data || [],
              labels: getChartLabels(selectedPeriod),
              total: chartData?.[selectedPeriod]?.total || 0,
            }}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerImage: {
    width: SCREEN_WIDTH,
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing.lg,
  },
  propertyHeader: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  metricsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  chartSection: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default ListingDetailScreen;