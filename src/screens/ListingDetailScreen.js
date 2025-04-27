import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Linking,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RevenueChart from '../components/RevenueChart';
import { theme as defaultTheme } from '../theme';
import { getListingFinancials, getMonthlyRevenueData } from '../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { saveToCache, loadFromCache, createParameterKey } from '../utils/cacheUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Gold color constants 
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)'
};

// Cache keys for specific property data
const PROPERTY_REVENUE_CACHE = 'cache_property_revenue';
const PROPERTY_CHART_CACHE = 'cache_property_chart';

// Mock data for chart - with simpler structure
const MOCK_CHART_DATA = {
  '6M': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    data: [4500, 6700, 5200, 8900, 7600, 9200]
  },
  'YTD': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    data: [4500, 6700, 5200, 8900, 7600, 9200]
  },
  'MTD': {
    labels: ['Jun'],
    data: [9200]
  },
  '2024': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data: [4500, 6700, 5200, 8900, 7600, 9200, 0, 0, 0, 0, 0, 0]
  },
  'ALL': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    data: [4500, 6700, 5200, 8900, 7600, 9200]
  }
};

const ListingDetailScreen = ({ route }) => {
  const { property, totalRevenue: passedTotalRevenue } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState(MOCK_CHART_DATA);
  const [loading, setLoading] = useState(true);
  const [propertyRevenue, setPropertyRevenue] = useState(passedTotalRevenue || 0);
  const [bookingRate, setBookingRate] = useState(92);
  const [occupancyRate, setOccupancyRate] = useState(78);
  const [marketingScore, setMarketingScore] = useState(85);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [dataFromCache, setDataFromCache] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Animation for header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  // Load data
  useFocusEffect(
    React.useCallback(() => {
      const loadCachedData = async () => {
        const hasCachedData = await loadPropertyDataFromCache();
        if (!hasCachedData) {
          await loadPropertyData();
        }
      };
      
      loadCachedData();
    }, [property?.id])
  );
  
  // Save data to cache when it changes
  useEffect(() => {
    if (propertyRevenue && chartData) {
      savePropertyDataToCache();
    }
  }, [propertyRevenue, chartData]);

  // Load property data from cache
  const loadPropertyDataFromCache = async () => {
    if (!property || !property.id) return false;
    
    try {
      const paramKey = createParameterKey({ propertyId: property.id });
      const cachedRevenue = await loadFromCache(PROPERTY_REVENUE_CACHE, paramKey);
      const cachedChartData = await loadFromCache(PROPERTY_CHART_CACHE, paramKey);
      
      if (cachedRevenue && cachedChartData) {
        console.log('Property data loaded from cache');
        setPropertyRevenue(cachedRevenue);
        setChartData(cachedChartData);
        setDataFromCache(true);
        setLoading(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return false;
    }
  };
  
  // Save property data to cache
  const savePropertyDataToCache = async () => {
    if (!property || !property.id) return;
    
    try {
      const paramKey = createParameterKey({ propertyId: property.id });
      await saveToCache(PROPERTY_REVENUE_CACHE, propertyRevenue, paramKey);
      await saveToCache(PROPERTY_CHART_CACHE, chartData, paramKey);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const loadPropertyData = async () => {
    if (!property || !property.id) return;

    setLoading(true);
    try {
      const listingId = property.id;
      
      // Get total revenue
      const totalRevenueParams = {
        listingMapIds: [listingId],
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      };
      
      const totalRevenueData = await getListingFinancials(totalRevenueParams);
      const totalRevenue = totalRevenueData?.result?.ownerPayout || 0;
      
      if (!passedTotalRevenue || passedTotalRevenue !== totalRevenue) {
        setPropertyRevenue(totalRevenue);
      }
      
      // Get monthly revenue data
      try {
        const monthlyData = await getMonthlyRevenueData([listingId], 12);
        
        if (monthlyData && monthlyData.labels && monthlyData.labels.length > 0) {
          // Simplified chart data format
          const chartData = {
            '6M': {
              labels: monthlyData.labels.slice(0, 6),
              data: monthlyData.data.slice(0, 6)
            },
            'YTD': {
              labels: monthlyData.labels.slice(0, 6), // For simplicity
              data: monthlyData.data.slice(0, 6)
            },
            'MTD': {
              labels: [monthlyData.labels[0]],
              data: [monthlyData.data[0]]
            },
            '2024': {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              data: Array(12).fill(0).map((_, idx) => {
                const monthIdx = monthlyData.labels.indexOf(
                  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx]
                );
                return monthIdx !== -1 ? monthlyData.data[monthIdx] : 0;
              })
            },
            'ALL': {
              labels: monthlyData.labels.slice(0, 6),
              data: monthlyData.data.slice(0, 6)
            }
          };
          
          console.log('Chart data processed successfully');
          setChartData(chartData);
        } else {
          console.log('Using mock chart data due to invalid API response');
          setChartData(MOCK_CHART_DATA);
        }
      } catch (chartError) {
        console.error('Error getting chart data:', chartError);
        setChartData(MOCK_CHART_DATA);
      }
      
    } catch (error) {
      console.error('Error loading property data:', error);
      setChartData(MOCK_CHART_DATA);
    } finally {
      setLoading(false);
      setDataFromCache(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setDataFromCache(false);
    await loadPropertyData();
    setRefreshing(false);
  };
  
  const handleLinkClick = async (type) => {
    let url;
    if (type === 'airbnb' && property.airbnbListingUrl) {
      url = property.airbnbListingUrl;
    } else if (type === 'vrbo' && property.vrboListingUrl) {
      url = property.vrboListingUrl;
    } else if (type === 'airbnb' && property.externalUrls?.airbnb) {
      url = property.externalUrls.airbnb;
    } else if (type === 'vrbo' && property.externalUrls?.vrbo) {
      url = property.externalUrls.vrbo;
    }
    
    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert("Cannot open link", "Unable to open the external link.");
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert("Error", "There was a problem opening the link.");
      }
    } else {
      console.log(`No ${type} URL available for this property`);
    }
  };

  if (loading && !refreshing && !dataFromCache) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={GOLD.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading property details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Transparent Header with Animations */}
      <Animated.View 
        style={[
          styles.header,
          { 
            backgroundColor: isDarkMode ? 'rgba(20, 20, 22, 0.95)' : 'rgba(250, 250, 250, 0.95)',
            opacity: headerOpacity,
            paddingTop: insets.top,
            height: 60 + insets.top
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {property.name}
          </Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={GOLD.primary}
            colors={[GOLD.primary]}
          />
        }
      >
        {/* Hero Image - Smaller */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: property.listingImages?.[selectedImageIndex]?.url || 'https://via.placeholder.com/400' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          
          {/* Semi-transparent overlay */}
          <View style={styles.imageOverlay} />
          
          {/* Back and Share buttons */}
          <View style={[styles.heroButtons, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroButton}>
              <Ionicons name="share-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Property title on hero */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>{property.name}</Text>
            <Text style={styles.heroSubtitle}>Sleeps {property.maxOccupancy || 20}</Text>
            <View style={styles.heroLocationContainer}>
              <Ionicons name="location-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroLocationText} numberOfLines={1}>
                {property.address || '10601 101st Street North, Largo, FL, 33773'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Image Gallery - Separate, larger thumbnails */}
        <View style={styles.galleryContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryScrollContent}
          >
            {property.listingImages?.slice(0, 6).map((image, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.galleryImageContainer,
                  selectedImageIndex === index && styles.galleryImageSelected
                ]}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image 
                  source={{ uri: image.url || 'https://via.placeholder.com/150' }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Content Cards */}
        <View style={styles.contentContainer}>
          {/* Property Details Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Property Details</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            
            {/* Property Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
                <Ionicons name="people-outline" size={22} color={GOLD.primary} style={styles.detailIcon} />
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>{property.maxOccupancy || '4'}</Text>
                <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Guests</Text>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
                <Ionicons name="home-outline" size={22} color={GOLD.primary} style={styles.detailIcon} />
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>{property.propertyType || 'House'}</Text>
                <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Type</Text>
              </View>
            </View>
            
            {/* Booking Links */}
            <View style={styles.bookingLinksContainer}>
              <TouchableOpacity 
                style={styles.airbnbButton}
                onPress={() => handleLinkClick('airbnb')}
              >
                <Text style={styles.airbnbButtonText}>View on Airbnb</Text>
                <Ionicons name="arrow-forward" size={16} color="#FF5A5F" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.vrboButton}
                onPress={() => handleLinkClick('vrbo')}
              >
                <Text style={styles.vrboButtonText}>View on VRBO</Text>
                <Ionicons name="arrow-forward" size={16} color="#3D67FF" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Performance Metrics Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Performance Metrics</Text>
            
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.metricIconWrapper, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <Ionicons name="trending-up" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{marketingScore}/100</Text>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Marketing Score</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.metricIconWrapper, { backgroundColor: 'rgba(255, 90, 95, 0.1)' }]}>
                  <Ionicons name="calendar" size={20} color="#FF5A5F" />
                </View>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{bookingRate}%</Text>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Booking Rate</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.metricIconWrapper, { backgroundColor: 'rgba(61, 103, 255, 0.1)' }]}>
                  <Ionicons name="bed" size={20} color="#3D67FF" />
                </View>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{occupancyRate}%</Text>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Occupancy Rate</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.metricIconWrapper, { backgroundColor: GOLD.light }]}>
                  <Ionicons name="cash" size={20} color={GOLD.primary} />
                </View>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(propertyRevenue)}</Text>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Total Revenue</Text>
              </View>
            </View>
          </View>
          
          {/* Revenue Chart Section */}
          <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Revenue Analysis</Text>
            <RevenueChart 
              data={chartData} 
              loading={loading && !dataFromCache}
              chartHeight={220}
            />
          </View>
          
          {/* Amenities Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Amenities</Text>
            
            <View style={styles.amenitiesContainer}>
              {property.hasPool && (
                <View style={[styles.amenityTag, { backgroundColor: theme.surface }]}>
                  <Ionicons name="water" size={16} color={GOLD.primary} />
                  <Text style={[styles.amenityText, { color: theme.text.primary }]}>Pool</Text>
                </View>
              )}
              
              {property.hasWifi && (
                <View style={[styles.amenityTag, { backgroundColor: theme.surface }]}>
                  <Ionicons name="wifi" size={16} color={GOLD.primary} />
                  <Text style={[styles.amenityText, { color: theme.text.primary }]}>WiFi</Text>
                </View>
              )}
              
              {property.hasHotTub && (
                <View style={[styles.amenityTag, { backgroundColor: theme.surface }]}>
                  <Ionicons name="flame" size={16} color={GOLD.primary} />
                  <Text style={[styles.amenityText, { color: theme.text.primary }]}>Hot Tub</Text>
                </View>
              )}
              
              {property.petFriendly && (
                <View style={[styles.amenityTag, { backgroundColor: theme.surface }]}>
                  <Ionicons name="paw" size={16} color={GOLD.primary} />
                  <Text style={[styles.amenityText, { color: theme.text.primary }]}>Pet Friendly</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Bottom spacer */}
          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    height: SCREEN_HEIGHT * 0.35, // Reduced height
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  heroButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitleContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  heroLocationText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 5,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Gallery - separate from hero image
  galleryContainer: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
  },
  galleryScrollContent: {
    paddingHorizontal: 16,
  },
  galleryImageContainer: {
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  galleryImageSelected: {
    borderColor: GOLD.primary,
  },
  galleryImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
  },
  // Main content
  contentContainer: {
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  // Property details
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailIcon: {
    marginBottom: 10,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  // Booking links
  bookingLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  airbnbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 0.48,
  },
  airbnbButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF5A5F',
    marginRight: 8,
  },
  vrboButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 103, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 0.48,
  },
  vrboButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D67FF',
    marginRight: 8,
  },
  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricCard: {
    width: '48%',
    margin: '1%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  metricIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  // Chart
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Amenities
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  amenityText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default ListingDetailScreen;