import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropertyCard from '../components/PropertyCard';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';
import { theme } from '../theme';
import { fetchListings, getReservationsWithFinancialData } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StatBadge = ({ icon, value, label }) => (
  <View style={styles.statBadge}>
    <Ionicons name={icon} size={16} color={theme.colors.primary} />
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const SearchBar = ({ value, onChangeText }) => (
  <View style={styles.searchContainer}>
    <View style={styles.searchBar}>
      <Ionicons name="search" size={18} color={theme.colors.text.secondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search properties..."
        placeholderTextColor={theme.colors.text.secondary}
        style={styles.searchInput}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

const ListingsScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const { listings, reservations: authReservations } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertyRevenues, setPropertyRevenues] = useState({});

  const filteredListings = listings?.filter(listing =>
    listing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

  // Load financial data from the API
  useEffect(() => {
    if (listings && listings.length > 0) {
      loadFinancialData();
    } else {
      setLoading(false);
    }
  }, [listings]);

  const loadFinancialData = async () => {
    if (!listings || !listings.length) {
      console.log('No listings available, skipping financial data fetch');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get all listing IDs
      const listingIds = listings.map(listing => listing.id);
      
      // Parameters for all reservations (no date limits)
      const allReservationsParams = {
        listingMapIds: listingIds,
        dateType: 'arrivalDate',
        status: 'confirmed'
      };
      
      console.log('Fetching all-time reservations with params:', allReservationsParams);
      const allReservationsResult = await getReservationsWithFinancialData(allReservationsParams);
      
      // Get valid reservations
      const validReservations = (allReservationsResult?.reservations || []).filter(res => 
        VALID_STATUSES.includes(res.status)
      );
      
      console.log(`Received ${validReservations.length} valid reservations with financial data`);
      setReservations(validReservations);
      
      // Calculate total revenue by property
      const revenueByProperty = {};
      
      validReservations.forEach(reservation => {
        const propertyId = reservation.listingMapId;
        if (!propertyId) return;
        
        if (!revenueByProperty[propertyId]) {
          revenueByProperty[propertyId] = 0;
        }
        
        // Use the ownerPayout field populated by getReservationsWithFinancialData
        const ownerPayout = parseFloat(reservation.ownerPayout || 0);
        
        if (!isNaN(ownerPayout) && ownerPayout > 0) {
          revenueByProperty[propertyId] += ownerPayout;
        }
      });
      
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

  const renderHeader = () => (
    <View style={styles.header}>
      {/* <View style={styles.statsRow}>
        <StatBadge
          icon="home-outline"
          value={listings.length}
          label="Properties"
        />
        <StatBadge
          icon="cash-outline"
          value="$48.5k"
          label="Revenue"
        />
      </View> */}
    </View>
  );

  const renderItem = ({ item, index }) => (
    <Animated.View
      entering={Animated.spring({
        delay: index * 50,
        from: {
          opacity: 0,
          transform: [{ translateY: 20 }],
        },
        to: {
          opacity: 1,
          transform: [{ translateY: 0 }],
        },
      })}
    >
      <TouchableOpacity
        activeOpacity={0.2}
        onPress={() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('ListingDetail', {
              property: item,
              totalRevenue: getPropertyRevenue(item.id)
            });
          } else {
            console.log('Navigation not available');
          }
        }}
        style={styles.touchable}
      >
        <PropertyCard
          property={item}
          revenue={getPropertyRevenue(item.id)}
          onPress={() => navigation.navigate('ListingDetail', { 
            property: item,
            totalRevenue: getPropertyRevenue(item.id)
          })}
        />
      </TouchableOpacity>
    </Animated.View>
  );

  const onRefresh = React.useCallback(() => {
    loadFinancialData();
  }, []);

  if (loading && (!listings || listings.length === 0)) {
    return (
      <View style={styles.container}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <Animated.FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={theme.colors.text.secondary} />
              <Text style={styles.emptyStateText}>No properties found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    // paddingTop: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    marginTop: 40
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.text.primary,
    ...theme.typography.body,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 10,
    paddingTop: 0
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
    paddingTop: 0,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    gap: 6,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  statLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  skeletonContainer: {
    padding: theme.spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text.secondary,
  },
});

export default ListingsScreen;
