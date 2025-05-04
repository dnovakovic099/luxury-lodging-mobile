import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropertyPortfolioCard from '../components/PropertyPortfolioCard';

const PortfolioScreen = ({ navigation }) => {
  // Sample properties data
  const properties = [
    {
      id: '1',
      name: 'Train Caboose & River Views',
      location: 'Lynchburg, Virginia',
      images: [
        'https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/39c9d4e7-78d0-4807-9f0d-3029d987d02a.jpeg',
        'https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/cc8f7f3c-17a3-486f-ab11-fe5e36c97bd7.jpeg',
        'https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/6308de8a-b7d6-4259-8c39-4881ffe2c299.jpeg',
      ],
      isGuestFavorite: true,
      rating: '4.96',
      reviews: '229',
      hostName: 'Amy',
      hostYears: '7',
      hostImage: 'https://a0.muscache.com/im/pictures/user/ca7c9885-6fcd-4842-a5f3-73a9dab7bfc7.jpg',
      purchasePrice: 2750000,
      currentValue: 3600000,
      appreciationPercentage: 30.9,
      monthlyRevenue2024: 38500,
      totalRevenue2024: 462000,
      monthlyCleaningCosts: 3800,
      pmFee: 7700,
      mortgagePayment: 12000,
      monthlyExpenses: 5500,
      monthlyProfit: 9500,
    },
    {
      id: '2',
      name: 'Oceanfront Luxury Villa',
      location: 'Malibu, CA',
      images: [
        'https://a0.muscache.com/im/pictures/e25a9b25-fa98-4160-bfd1-039287bf38b6.jpg',
        'https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/cc8f7f3c-17a3-486f-ab11-fe5e36c97bd7.jpeg',
        'https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/6308de8a-b7d6-4259-8c39-4881ffe2c299.jpeg',
      ],
      isGuestFavorite: true,
      rating: '4.92',
      reviews: '186',
      hostName: 'David',
      hostYears: '5',
      hostImage: 'https://a0.muscache.com/im/pictures/user/feec382b-78a9-441e-b6f8-0c19b5dad3cd.jpg',
      purchasePrice: 3850000,
      currentValue: 4500000,
      appreciationPercentage: 16.9,
      monthlyRevenue2024: 42000,
      totalRevenue2024: 504000,
      monthlyCleaningCosts: 4200,
      pmFee: 8400,
      mortgagePayment: 14000,
      monthlyExpenses: 6000,
      monthlyProfit: 9400,
    }
  ];

  // Format currency function
  const formatCurrency = (value) => {
    return '$' + value.toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Luxury Portfolio</Text>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={28} color="#222" />
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
            <Text style={[styles.filterText, styles.activeFilterText]}>All Properties</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Highest Profit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Best Appreciation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Recently Added</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsOverview}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{properties.length}</Text>
          <Text style={styles.statLabel}>Properties</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(18900)}</Text>
          <Text style={styles.statLabel}>Monthly Profit</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>23.9%</Text>
          <Text style={styles.statLabel}>Avg. ROI</Text>
        </View>
      </View>

      {/* Property List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {properties.map(property => (
          <PropertyPortfolioCard 
            key={property.id}
            property={property}
            formatCurrency={formatCurrency}
          />
        ))}
        
        {/* Add Property Button */}
        <TouchableOpacity style={styles.addPropertyButton}>
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addPropertyText}>Add New Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
  },
  profileButton: {
    padding: 4,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 30,
    backgroundColor: '#F7F7F7',
  },
  activeFilter: {
    backgroundColor: '#222',
  },
  filterText: {
    fontSize: 14,
    color: '#717171',
  },
  activeFilterText: {
    color: '#FFF',
    fontWeight: '500',
  },
  statsOverview: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#717171',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EBEBEB',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  addPropertyButton: {
    flexDirection: 'row',
    backgroundColor: '#FF385C',
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPropertyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PortfolioScreen; 