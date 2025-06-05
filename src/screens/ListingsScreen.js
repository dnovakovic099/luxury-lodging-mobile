import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Image,
  StatusBar,
  Pressable,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropertyCard from '../components/PropertyCard';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';
import { theme as defaultTheme } from '../theme';
import { fetchListings, getListingFinancials } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToCache, loadFromCache, CACHE_KEYS } from '../utils/cacheUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys for listings screen
const LISTINGS_REVENUE_CACHE = 'cache_listings_revenue';
// Debug flag for cache logging
const DEBUG_CACHE = true;

// Feature flags
const ENABLE_LISTING_CLICKS = false; // Set to false to disable clicking on listings

// Define gold colors for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  gradient: '#D4AF37'
};

const { width } = Dimensions.get('window');

const SearchBar = ({ value, onChangeText, onFocus, onBlur, isFocused }) => {
  const { theme, isDarkMode } = useTheme();
  const [localFocus, setLocalFocus] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: localFocus ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [localFocus]);
  
  const handleFocus = () => {
    setLocalFocus(true);
    if (onFocus) onFocus();
  };
  
  const handleBlur = () => {
    setLocalFocus(false);
    if (onBlur) onBlur();
  };
  
  const bgColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDarkMode ? 'rgba(45, 45, 47, 0.8)' : 'rgba(245, 245, 247, 0.8)',
      isDarkMode ? 'rgba(50, 50, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)'
    ]
  });
  
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'transparent',
      GOLD.primary
    ]
  });
  
  return (
    <Animated.View style={[
      styles.searchContainer, 
      localFocus && styles.searchContainerFocused
    ]}>
      <Animated.View style={[
        styles.searchBar, 
        { 
          backgroundColor: bgColor,
          borderColor: borderColor,
          transform: [{ scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.02]
          }) }]
        }
      ]}>
        <Ionicons name="search" size={20} color={localFocus ? GOLD.primary : theme.text.secondary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search properties..."
          placeholderTextColor={theme.text.secondary}
          style={[styles.searchInput, { color: theme.text.primary }]}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {value ? (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={20} color={theme.text.secondary} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
};

const PropertyStats = ({ totalProperties, totalRevenue }) => {
  const { theme, isDarkMode } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const formatRevenue = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };
  
  const cardBackground = isDarkMode ? 'rgba(40, 40, 45, 0.6)' : 'rgba(255, 255, 255, 0.8)';
  
  return (
    <Animated.View style={[
      styles.statsContainer,
      {
        opacity: animatedValue,
        transform: [{ translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0]
        })}]
      }
    ]}>
      <View style={[styles.statCard, { backgroundColor: cardBackground }]}>
        <View style={[styles.statIconContainer, { backgroundColor: GOLD.light }]}>
          <Ionicons name="home" size={18} color={GOLD.primary} />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={[styles.statValue, { color: theme.text.primary }]}>{totalProperties}</Text>
          <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Properties</Text>
        </View>
      </View>
      
      <View style={[styles.statCard, { backgroundColor: cardBackground }]}>
        <View style={[styles.statIconContainer, { backgroundColor: GOLD.light }]}>
          <Ionicons name="trending-up" size={18} color={GOLD.primary} />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={[styles.statValue, { color: theme.text.primary }]}>{formatRevenue(totalRevenue)}</Text>
          <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Revenue</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const FilterButton = ({ label, isActive, icon, onPress }) => {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        styles.filterButton,
        isActive ? styles.filterButtonActive : {
          backgroundColor: isDarkMode ? 'rgba(50, 50, 55, 0.6)' : 'rgba(240, 240, 240, 0.6)'
        }
      ]}
      onPress={onPress}
    >
      {icon && <Ionicons 
        name={icon} 
        size={14} 
        color={isActive ? GOLD.primary : theme.text.secondary} 
        style={styles.filterIcon}
      />}
      <Text style={[
        styles.filterButtonText,
        { color: isActive ? GOLD.primary : theme.text.secondary }
      ]}>{label}</Text>
    </TouchableOpacity>
  );
};

const ListingsHeader = ({ title }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.listingsHeaderContainer}>
      <Text style={[styles.listingsHeaderTitle, { color: theme.text.primary }]}>{title}</Text>
    </View>
  );
};

const PropertyListItem = React.memo(({ item, index, onPress, getPropertyRevenue, clicksEnabled }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  const revenue = getPropertyRevenue(item.id);
  
  return (
    <Animated.View style={{
      opacity: animatedValue,
      transform: [
        { 
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }) 
        },
        { scale: scaleAnim }
      ],
    }}>
      <TouchableOpacity
        activeOpacity={clicksEnabled ? 0.7 : 1}
        onPress={() => onPress(item, revenue)}
        style={styles.touchable}
      >
        <PropertyCard
          property={item}
          revenue={revenue}
          onPress={() => onPress(item, revenue)}
          clicksEnabled={clicksEnabled}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

const ListingsScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { listings } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [propertyRevenues, setPropertyRevenues] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  // Add state for tracking when data is loaded from cache
  const [revenuesFromCache, setRevenuesFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 60 + insets.top],
    extrapolate: 'clamp'
  });
  
  const searchBarTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: 'clamp'
  });
  
  const filteredListings = listings?.filter(listing => {
    const matchesSearch = listing.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'revenue') {
      return matchesSearch;
    }
    if (activeFilter === 'recent') {
      return matchesSearch;
    }
    
    return matchesSearch;
  }) || [];
  
  const sortedListings = [...filteredListings].sort((a, b) => {
    if (activeFilter === 'revenue') {
      return (propertyRevenues[b.id] || 0) - (propertyRevenues[a.id] || 0);
    }
    if (activeFilter === 'recent') {
      return parseInt(b.id) - parseInt(a.id);
    }
    return 0;
  });
  
  const totalRevenue = Object.values(propertyRevenues).reduce((sum, revenue) => sum + revenue, 0);
  
  const topRevenueProperties = [...filteredListings]
    .sort((a, b) => (propertyRevenues[b.id] || 0) - (propertyRevenues[a.id] || 0))
    .slice(0, 3);

  const itemAnimatedValues = useRef({}).current;
  
  const getItemAnimatedValue = (id) => {
    if (!itemAnimatedValues[id]) {
      itemAnimatedValues[id] = new Animated.Value(0);
    }
    return itemAnimatedValues[id];
  };

  // Function to load property revenues from cache
  const loadRevenuesFromCache = async () => {
    try {
      if (DEBUG_CACHE) console.log('Attempting to load property revenues from cache...');
      
      // Check if cache key exists
      const allKeys = await AsyncStorage.getAllKeys();
      const hasRevenuesCache = allKeys.includes(LISTINGS_REVENUE_CACHE);
      
      if (DEBUG_CACHE) {
        console.log('Has property revenues cache key:', hasRevenuesCache);
      }
      
      if (!hasRevenuesCache) {
        return false;
      }
      
      // Try using cacheUtils function to get the data
      const cachedRevenues = await loadFromCache(LISTINGS_REVENUE_CACHE);
      
      if (cachedRevenues && typeof cachedRevenues === 'object') {
        if (DEBUG_CACHE) {
          console.log('Loaded property revenues from cache successfully');
          console.log('Properties with cached revenue:', Object.keys(cachedRevenues).length);
        }
        
        // Update state with cached revenues
        setPropertyRevenues(cachedRevenues);
        setRevenuesFromCache(true);
        return true;
      }
      
      // Try direct access as fallback
      if (DEBUG_CACHE) console.log('cacheUtils loading failed, trying direct access...');
      
      const rawCachedValue = await AsyncStorage.getItem(LISTINGS_REVENUE_CACHE);
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
        
        if (typeof extractedData === 'object') {
          if (DEBUG_CACHE) {
            console.log('Direct cache access revenues summary:', {
              propertiesCount: Object.keys(extractedData).length
            });
          }
          
          // Update state with extracted values
          setPropertyRevenues(extractedData);
          setRevenuesFromCache(true);
          return true;
        }
      } catch (parseError) {
        console.error('Failed to parse raw cached value:', parseError);
      }
      
      return false;
    } catch (error) {
      console.error('Error loading property revenues from cache:', error);
      return false;
    }
  };
  
  // Function to save property revenues to cache
  const saveRevenuesToCache = async () => {
    try {
      if (Object.keys(propertyRevenues).length === 0) {
        if (DEBUG_CACHE) console.log('No property revenues to cache');
        return;
      }
      
      if (DEBUG_CACHE) {
        console.log('Saving property revenues to cache...');
        console.log('Properties count:', Object.keys(propertyRevenues).length);
      }
      
      await saveToCache(LISTINGS_REVENUE_CACHE, propertyRevenues);
      
      if (DEBUG_CACHE) {
        console.log('Property revenues saved to cache successfully');
      }
    } catch (error) {
      console.error('Error saving property revenues to cache:', error);
    }
  };

  useEffect(() => {
    if (listings && listings.length > 0) {
      // First try to load from cache, then load fresh data
      loadRevenuesFromCache().then(hasCachedData => {
        loadFinancialData();
      });
    } else {
      setLoading(false);
    }
  }, [listings]);
  
  // Add effect to save revenues to cache when they change
  useEffect(() => {
    if (Object.keys(propertyRevenues).length > 0) {
      saveRevenuesToCache();
    }
  }, [propertyRevenues]);

  const loadFinancialData = async () => {
    if (!listings || !listings.length) {
      return;
    }
    
    // Only show loading if we don't have cached data
    if (!revenuesFromCache) {
      setLoading(true);
    }
    
    try {
      const revenueByProperty = {};
      
      for (const listing of listings) {
        const listingId = listing.id;
        if (!listingId) continue;
        
        const listingParams = {
          listingMapIds: [listingId],
          dateType: 'arrivalDate',
          statuses: ['confirmed', 'new', 'modified', 'ownerStay']
        };
        
        const listingFinancialData = await getListingFinancials(listingParams);
        
        const listingRevenue = listingFinancialData?.result?.ownerPayout || 0;
        
        revenueByProperty[listingId] = listingRevenue;
      }
      
      setPropertyRevenues(revenueByProperty);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyRevenue = (propertyId) => {
    return propertyRevenues[propertyId] || 0;
  };

  const renderItem = ({ item, index }) => {
    return (
      <PropertyListItem
        item={item}
        index={index}
        getPropertyRevenue={getPropertyRevenue}
        clicksEnabled={ENABLE_LISTING_CLICKS}
        onPress={ENABLE_LISTING_CLICKS ? (property, revenue) => {
          navigation.navigate('ListingDetail', {
            property,
            totalRevenue: revenue
          });
        } : () => {
          // Do nothing when clicks are disabled
        }}
      />
    );
  };

  const renderTopProperties = () => {
    if (!topRevenueProperties.length) return null;
    
    const sectionTitle = listings?.length === 1 ? "Your Property" : "Top Performing Properties";
    
    return (
      <View style={styles.topPropertiesSection}>
        <ListingsHeader title={sectionTitle} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topPropertiesContainer}
          decelerationRate="fast"
          snapToInterval={width * 0.65}
          snapToAlignment="center"
          pagingEnabled={false}
        >
          {topRevenueProperties.map((property, index) => {
            const revenue = getPropertyRevenue(property.id);
            
            const listingData = [
              { 
                icon: 'cash-outline', 
                value: moneyFormatter(revenue), 
                label: 'Total Revenue',
                isPrimary: true
              }
            ];
            
            if (property.location) {
              listingData.push({ 
                icon: 'location-outline', 
                value: property.location,
                isPrimary: false 
              });
            }
            
            if (property.bedroomCount) {
              listingData.push({ 
                icon: 'bed-outline', 
                value: `${property.bedroomCount} Bedrooms`,
                isPrimary: false 
              });
            }
            
            const amenities = [];
            if (property.hasPool) amenities.push('Pool');
            if (property.hasWifi) amenities.push('WiFi');
            if (property.hasHotTub) amenities.push('Hot Tub');
            if (property.petFriendly) amenities.push('Pet Friendly');
            
            return (
              <TouchableOpacity 
                key={property.id} 
                style={[styles.topPropertyCard, {
                  backgroundColor: isDarkMode ? 'rgba(45, 45, 50, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  width: width * 0.65,
                  marginLeft: index === 0 ? 4 : 12,
                }]}
                onPress={ENABLE_LISTING_CLICKS ? () => navigation.navigate('ListingDetail', {
                  property,
                  totalRevenue: revenue
                }) : () => {
                  // Do nothing when clicks are disabled
                }}
                activeOpacity={ENABLE_LISTING_CLICKS ? 0.7 : 1}
              >
                <View style={styles.topPropertyImageContainer}>
                  <Image 
                    source={{ uri: property.listingImages[0]?.url || 'https://via.placeholder.com/300' }}
                    style={styles.topPropertyImage}
                    resizeMode="cover"
                  />
                  <View style={styles.topPropertyOverlay} />
                  <View style={styles.topPropertyBadge}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#4CAF50', // Green dot
                      marginRight: 5,
                    }} />
                    <Text style={styles.topPropertyBadgeText}>Active</Text>
                  </View>
                  
                  {property.propertyType && (
                    <View style={styles.propertyTypeTag}>
                      <Text style={styles.propertyTypeText}>
                        {property.propertyType}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.topPropertyInfo}>
                  <Text 
                    style={[styles.topPropertyName, { color: theme.text.primary }]} 
                    numberOfLines={1}
                  >
                    {property.name}
                  </Text>
                  
                  <View style={styles.topPropertyStats}>
                    {listingData.map((data, dataIndex) => (
                      <View key={dataIndex} style={[
                        styles.topPropertyStat,
                        dataIndex < listingData.length - 1 && styles.topPropertyStatWithMargin
                      ]}>
                        <Ionicons 
                          name={data.icon} 
                          size={13} 
                          color={data.isPrimary ? GOLD.primary : theme.text.secondary} 
                        />
                        <Text 
                          style={[
                            styles.topPropertyStatValue, 
                            { 
                              color: data.isPrimary ? GOLD.primary : theme.text.secondary,
                              fontWeight: data.isPrimary ? '700' : '500'
                            }
                          ]}
                          numberOfLines={1}
                        >
                          {data.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.topPropertyFooter}>
                    <View style={styles.amenitiesContainer}>
                      {amenities.length > 0 && amenities.slice(0, 2).map((amenity, i) => (
                        <View key={i} style={styles.amenityTag}>
                          <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                      ))}
                    </View>
                    
                    <View style={styles.listingLinks}>
                      <TouchableOpacity 
                        style={[styles.listingLinkButton, { backgroundColor: 'rgba(255,90,95,0.1)' }]}
                        onPress={async () => {
                          const url = property.airbnbListingUrl || (property.externalUrls && property.externalUrls.airbnb);
                          if (url) {
                            try {
                              const canOpen = await Linking.canOpenURL(url);
                              if (canOpen) {
                                await Linking.openURL(url);
                              } else {
                                Alert.alert("Cannot open link", "Unable to open the Airbnb link.");
                              }
                            } catch (error) {
                              console.error('Error opening URL:', error);
                              Alert.alert("Error", "There was a problem opening the link.");
                            }
                          } else {
                            console.log('No Airbnb URL available for this property');
                          }
                        }}
                      >
                        <Text style={[styles.listingLinkText, { color: '#FF5A5F' }]}>Airbnb</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.listingLinkButton, { backgroundColor: 'rgba(61,103,255,0.1)' }]}
                        onPress={async () => {
                          console.log('Property:', property);
                          const url = property.vrboListingUrl || (property.externalUrls && property.externalUrls.vrbo);
                          if (url) {
                            try {
                              const canOpen = await Linking.canOpenURL(url);
                              if (canOpen) {
                                await Linking.openURL(url);
                              } else {
                                Alert.alert("Cannot open link", "Unable to open the VRBO link.");
                              }
                            } catch (error) {
                              console.error('Error opening URL:', error);
                              Alert.alert("Error", "There was a problem opening the link.");
                            }
                          } else {
                            console.log('No VRBO URL available for this property');
                          }
                        }}
                      >
                        <Text style={[styles.listingLinkText, { color: '#3D67FF' }]}>VRBO</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          
          {listings?.length === 1 && (
            <View 
              style={[styles.topPropertyCard, styles.tipsCard, {
                backgroundColor: isDarkMode ? 'rgba(35, 35, 40, 0.9)' : 'rgba(250, 250, 252, 0.9)',
                width: width * 0.65,
                marginLeft: 12,
                borderColor: GOLD.light,
                borderWidth: 1
              }]}
            >
              <View style={styles.tipsContent}>
                <Ionicons name="analytics-outline" size={30} color={GOLD.primary} />
                <Text style={[styles.tipsTitle, { color: isDarkMode ? '#fff' : '#333' }]}>Revenue Analytics</Text>
                <Text style={[styles.tipsText, { color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#555' }]}>
                  Explore detailed revenue analysis and booking trends in the reports section.
                </Text>
                
                <TouchableOpacity 
                  style={styles.tipsButton}
                  onPress={() => navigation.navigate('Analytics')}
                >
                  <Text style={styles.tipsButtonText}>View Reports</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const moneyFormatter = (amount) => {
    if (!amount || isNaN(amount)) return '$0';
    
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const renderAllPropertiesHeader = () => (
    <View style={styles.allPropertiesHeaderContainer}>
      <View style={styles.headerDecoration} />
      <ListingsHeader title="All Properties" />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <PropertyStats
        totalProperties={listings?.length || 0}
        totalRevenue={totalRevenue}
      />
      
      {renderTopProperties()}
      
      <View style={styles.allPropertiesHeader}>
        {renderAllPropertiesHeader()}
        <View style={styles.filtersContainer}>
          <FilterButton
            label="All"
            icon="grid-outline"
            isActive={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
          />
          <FilterButton
            label="Revenue"
            icon="trending-up"
            isActive={activeFilter === 'revenue'}
            onPress={() => setActiveFilter('revenue')}
          />
          <FilterButton
            label="Recent"
            icon="time-outline"
            isActive={activeFilter === 'recent'}
            onPress={() => setActiveFilter('recent')}
          />
        </View>
      </View>
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    // Reset the cached state while refreshing
    setRevenuesFromCache(false);
    
    // Refresh financial data
    loadFinancialData()
      .then(() => {
        // Save to cache after refresh
        saveRevenuesToCache();
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  if (loading && (!listings || listings.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ paddingTop: insets.top }} />
        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          isFocused={searchFocused}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading properties...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
      
      <Animated.View style={[
        styles.animatedHeader,
        { 
          height: headerHeight,
          opacity: headerOpacity,
          top: 0,
          backgroundColor: isDarkMode ? 'rgba(20, 20, 22, 0.95)' : 'rgba(250, 250, 250, 0.95)',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0,0,0,0.05)',
        }
      ]}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>My Properties</Text>
        </View>
      </Animated.View>
      
      <View style={{ height: 0 }} />
      
      <Animated.View style={styles.searchBarContainer}>
        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          isFocused={searchFocused}
        />
      </Animated.View>
      
      <Animated.FlatList
        data={sortedListings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={theme.text.secondary} />
            <Text style={[styles.emptyStateText, { color: theme.text.secondary }]}>No properties found</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={{ color: GOLD.primary }}>Clear search</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD.primary}
            colors={[GOLD.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    zIndex: 2,
  },
  searchContainerFocused: {
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '400',
  },
  searchBarContainer: {
    paddingTop: 0,
    paddingBottom: 0,
    transform: [{ translateY: 0 }],
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(200,200,200,0.2)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  listHeader: {
    paddingTop: 10,
  },
  allPropertiesHeader: {
    marginTop: 15,
    marginBottom: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 25,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterIcon: {
    marginRight: 5,
  },
  filterButtonActive: {
    backgroundColor: GOLD.light,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  touchable: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  emptyStateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: GOLD.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  
  categoryContainer: {
    display: 'none',
  },
  categoryTag: {
    display: 'none',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  categoryCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  
  propertyTypeTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  propertyTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  amenityTag: {
    backgroundColor: GOLD.light,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  amenityText: {
    fontSize: 10,
    fontWeight: '500',
    color: GOLD.primary,
  },
  
  allPropertiesHeaderContainer: {
    marginBottom: 12,
  },
  headerDecoration: {
    width: 40,
    height: 4,
    backgroundColor: GOLD.primary,
    borderRadius: 2,
    marginBottom: 12,
  },
  
  topPropertiesSection: {
    marginBottom: 20,
  },
  listingsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  listingsHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  topPropertiesContainer: {
    paddingRight: 16,
  },
  topPropertyCard: {
    width: 170,
    borderRadius: 18,
    marginLeft: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(200,200,200,0.2)',
  },
  topPropertyImageContainer: {
    height: 150,
    width: '100%',
    position: 'relative',
  },
  topPropertyImage: {
    height: '100%',
    width: '100%',
  },
  topPropertyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    backgroundGradient: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  },
  topPropertyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topPropertyBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  topPropertyInfo: {
    padding: 12,
  },
  topPropertyName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  topPropertyStats: {
    flexDirection: 'column',
  },
  topPropertyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  topPropertyStatWithMargin: {
    marginBottom: 5,
  },
  topPropertyStatValue: {
    fontSize: 12,
    marginLeft: 6,
  },
  topPropertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  listingLinks: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  listingLinkButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  listingLinkText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tipsCard: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  tipsContent: {
    padding: 18,
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GOLD.primary,
    marginTop: 12,
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  tipsButton: {
    backgroundColor: GOLD.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 6,
  },
  tipsButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ListingsScreen;
