import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Camera, Paintbrush, Package, Users, Star, Sparkles, TrendingUp, DollarSign, Zap } from 'lucide-react-native';
import { theme as defaultTheme } from '../theme';

import PropertyPicker from '../components/PropertyPicker';
import RevenueCard from '../components/RevenueCard';
import GradeIndicator from '../components/GradeIndicator';
import PropertyPortfolioCard from '../components/PropertyPortfolioCard';
import { useAuth } from '../context/AuthContext';
import { useConsultation } from '../context/ConsultationContext';
import { useTheme } from '../context/ThemeContext';
import fundData from '../assets/fund_1_data.json';


const DARK_GREEN = '#097969';

const EarnMoreScreen = () => {
  const { message, sendMessage, setMessage, isLoading, complete } = useConsultation();
  const { listings } = useAuth();
  const { theme } = useTheme();
  const [selectedProperty, setSelectedProperty] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('fund'); // 'fund' or 'properties'
  const [fundProperties, setFundProperties] = useState([]);

  // Use the listings from AuthContext instead of fetching again
  useEffect(() => {
    if (listings && listings.length > 0 && !selectedProperty) {
      // Set the first property as the default selected one
      setSelectedProperty(listings[0].id);
    }
  }, [listings, selectedProperty]);

  // Process fund data to match with listings images
  useEffect(() => {
    if (!fundData || !listings) return;
    
    // Filter out entries with null Property names
    const validProperties = fundData.filter(item => item.Property && item.Location);
    
    // Map fund data to the format needed by PropertyPortfolioCard
    const processedProperties = validProperties.map(item => {
      // Match using internalListingName
      const matchingListing = listings?.find(listing => 
        listing.internalListingName && item.Property && 
        listing.internalListingName.toLowerCase().includes(item.Property.toLowerCase())
      );
      
      // Extract and process any images from the matching listing
      let propertyImages = [];
      
      if (matchingListing) {
        // First check for listingImages like in ListingsScreen
        if (matchingListing.listingImages && matchingListing.listingImages.length > 0) {
          // Extract URLs from listingImages objects
          propertyImages = matchingListing.listingImages.map(img => img.url || img.thumbnail || img).filter(Boolean);
        }
        // Fallback to images array
        else if (matchingListing.images && matchingListing.images.length > 0) {
          propertyImages = matchingListing.images;
        }
        
        // Ensure we have at least one image
        if (propertyImages.length === 0) {
          // Try to get a single image
          if (matchingListing.image) {
            propertyImages = [matchingListing.image];
          } else if (matchingListing.thumbnail) {
            propertyImages = [matchingListing.thumbnail];
          }
        }
      }
      
      // Parse values from strings to numbers - using the correct fields from JSON
      const purchasePrice = parseFloat(item["Purchase Price"]?.replace(/[$,]/g, '') || 0);
      const currentValue = parseFloat(item["Current Value (Zestimate - Value Add Not Included)"]?.replace(/[$,]/g, '') || 0);
      const launchCost = parseFloat(item["Launch Cost"]?.replace(/[$,]/g, '') || 0);
      const monthlyRevenue = parseFloat(item["Monthly Revenue"]?.replace(/[$,]/g, '') || 0);
      const monthlyCleaningCosts = parseFloat(item["Cleaning"]?.replace(/[$,]/g, '') || 0);
      const pmFee = parseFloat(item["PM"]?.replace(/[$,]/g, '') || 0);
      const mortgagePayment = parseFloat(item["Mortgage"]?.replace(/[$,]/g, '') || 0);
      const monthlyExpenses = parseFloat(item["Utilities and Maintance"]?.replace(/[$,]/g, '') || 0);
      const monthlyProfit = parseFloat(item["Net"]?.replace(/[$,]/g, '') || 0);
      
      // Calculate yearly net income as Net * 12
      const yearlyNetIncome = monthlyProfit * 12;
      
      // Calculate ROI as yearly Net Income / Launch Cost
      const calculatedRoi = launchCost > 0 ? (yearlyNetIncome / launchCost * 100).toFixed(1) : 0;
      
      // Use calculated ROI or get it from the JSON data if available
      const roi = item["ROI"] ? parseFloat(item["ROI"]?.replace(/[%$,]/g, '') || 0) : parseFloat(calculatedRoi);
      
      // Calculate appreciation percentage
      const appreciationPercentage = purchasePrice > 0 
        ? ((currentValue - purchasePrice) / purchasePrice * 100).toFixed(1)
        : 0;
      
      return {
        id: item.Property,
        name: item.Property,
        // Add the display name from the matching listing if available
        displayName: matchingListing?.name || item.Property,
        location: item.Location,
        rating: item.Rating || "4.96",
        reviews: item.Reviews || "229",
        isGuestFavorite: true,
        // Use processed images
        images: propertyImages,
        listingImages: matchingListing?.listingImages || [],
        image: propertyImages[0] || null,
        thumbnail: propertyImages[0] || null,
        city: item.Location.split(',')[0].trim(),
        
        // Add original listing reference for accessing its properties
        originalListing: matchingListing,
        
        // Add URL properties directly if available
        airbnbListingUrl: matchingListing?.airbnbListingUrl,
        vrboListingUrl: matchingListing?.vrboListingUrl,
        externalUrls: matchingListing?.externalUrls,
        
        // Financial data - now using direct values from the JSON
        purchasePrice,
        currentValue,
        launchCost, // Using direct Launch Cost from JSON
        monthlyRevenue2024: monthlyRevenue,
        monthlyCleaningCosts,
        pmFee,
        mortgagePayment,
        monthlyExpenses,
        monthlyProfit,
        yearlyNetIncome,
        appreciationPercentage,
        roi,
      };
    });
    
    setFundProperties(processedProperties);
  }, [fundData, listings]);

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  // Format currency function
  const formatCurrency = (value) => {
    if (!value) return '$0';
    
    // If value is a string with dollar sign, convert to number
    let numValue = value;
    if (typeof value === 'string') {
      numValue = parseFloat(value.replace(/[$,]/g, ''));
    }
    
    // Handle NaN or invalid values
    if (isNaN(numValue)) return '$0';
    
    // Format large numbers to be more compact
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(2)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(0)}K`;
    }
    
    return numValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const grades = [
    {
      label: 'Photography',
      grade: 35,
      icon: Camera,
      details: 'Only 8 photos available. Professional photography could increase bookings by 35%',
      stats: 'Coverage: 8/30 recommended shots',
      improvement: '+65% potential improvement',
      aiRecommendation: 'AI analysis suggests focusing on exterior twilight shots'
    },
    {
      label: 'Design',
      grade: 72,
      icon: Paintbrush,
      details: 'Modern updates needed in kitchen and bathrooms',
      stats: 'Modern design score: 72/100',
      improvement: '+28% potential improvement',
      aiRecommendation: 'Similar properties see 15% higher bookings with updated kitchens'
    },
    {
      label: 'Amenities',
      grade: 90,
      icon: Package,
      details: 'Adding a hot tub could increase annual revenue by $20,000',
      stats: '18/20 premium amenities',
      improvement: '+10% potential improvement',
      aiRecommendation: 'Market analysis shows high demand for outdoor features'
    },
    {
      label: 'Sleeping Count',
      grade: 45,
      icon: Users,
      details: 'Current: 8 guests | Potential: 15 guests',
      stats: 'Utilizing 45% of space capacity',
      improvement: '+55% potential improvement',
      aiRecommendation: 'Space optimization could add 2 more sleeping areas'
    },
    {
      label: 'Reviews',
      grade: 95,
      icon: Star,
      details: '4.92 average from 128 reviews. Top 2% in your market',
      stats: '128 reviews, 95% positive',
      improvement: 'Maintaining excellence',
      aiRecommendation: 'Sentiment analysis shows strong praise for location'
    },
  ];

  // Portfolio sample data
  const portfolioProperties = [
    {
      id: '1',
      name: 'Train Caboose & River Views',
      location: 'Lynchburg, Virginia',
      images: [
        'https://a0.muscache.com/im/pictures/e25a9b25-fa98-4160-bfd1-039287bf38b6.jpg',
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

  const renderFundTab = () => {
    // Calculate fund totals
    const fundSize = fundProperties.reduce((sum, prop) => sum + (prop.launchCost || 0), 0);
    
    // Total annual Net Income (sum of all monthly profits * 12)
    const totalYearlyNetIncome = fundProperties.reduce((sum, prop) => sum + (prop.yearlyNetIncome || 0), 0);
    
    // Calculate ROI for the fund (Total Yearly Net Income / Fund Size)
    const fundROI = fundSize > 0 ? ((totalYearlyNetIncome / fundSize) * 100).toFixed(1) : '0.0';
    
    // Sort properties by net income (descending)
    const sortedProperties = [...fundProperties].sort((a, b) => {
      const aNetIncome = a.yearlyNetIncome || 0;
      const bNetIncome = b.yearlyNetIncome || 0;
      return bNetIncome - aNetIncome; // Descending order (highest to lowest)
    });
    
    return (
      <ScrollView style={styles.fundScrollView}>
        {/* Fund header stats - Compact design */}
        <View style={styles.fundStats}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fundProperties.length}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(fundSize)}</Text>
              <Text style={styles.statLabel}>Fund Size</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(totalYearlyNetIncome)}</Text>
              <Text style={styles.statLabel}>Net Income</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.roiValue]}>{fundROI}%</Text>
              <Text style={styles.statLabel}>ROI</Text>
            </View>
          </View>
        </View>
        
        {/* Property cards - now using sorted properties */}
        {sortedProperties.map((property, index) => (
          <PropertyPortfolioCard 
            key={`${property.id || property.name}-${index}`}
            property={property}
            formatCurrency={formatCurrency}
          />
        ))}
      </ScrollView>
    );
  };

  const renderPropertiesTab = () => (
    <ScrollView style={styles.propertiesTabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pickerWrapper}>
        <PropertyPicker
          selectedProperty={selectedProperty}
          onValueChange={handlePropertyChange}
          properties={listings || []}
          loading={!listings}
          error={error}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.metricsContainer}>
          <RevenueCard
            title="Monthly Revenue"
            current="4,500"
            potential="6,200"
            market="5,800"
            marketColor="#4B5563"
          />
          <View style={styles.metricSpacing} />
          <RevenueCard
            title="Cleaning Fee"
            current="150"
            potential="125"
            market="175"
            marketColor="#4B5563"
          />
        </View>

        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="flash" size={16} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>AI Recommendations</Text>
              <View style={[styles.sectionBadge, { backgroundColor: `${theme.primary}12` }]}>
                <Text style={[styles.sectionBadgeText, { color: theme.primary }]}>5 insights</Text>
              </View>
            </View>
          </View>

          <View style={styles.gradesContainer}>
            {grades.map((item, index) => (
              <GradeIndicator key={index} {...item} />
            ))}
          </View>
        </View>
        <View style={[styles.messageContainer, { 
          backgroundColor: theme.surface,
          borderColor: theme.borderColor
        }]}>
          <TextInput
            style={[styles.input, { color: theme.text.primary }]}
            onChangeText={setMessage}
            value={message}
            placeholderTextColor={theme.text.secondary}
            placeholder="Write your message here..."
            multiline
          />
        </View>

        {complete && <Text style={[styles.completeText, { color: theme.success }]}>Message sent successfully</Text>}

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.consultButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.8}
            onPress={() => sendMessage()}>
            <View style={styles.consultButtonContent}>
              <Icon name="trending-up" size={18} color="white" />
              <Text style={styles.consultButtonText}>
                Request Revenue Consultation
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {Platform.OS === 'ios' && <View style={styles.bottomPadding} />}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'fund' && styles.activeTab,
            activeTab === 'fund' && { borderBottomColor: '#B0976D' }
          ]} 
          onPress={() => setActiveTab('fund')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="wallet-outline" 
              size={20} 
              color={activeTab === 'fund' ? '#B0976D' : theme.text.secondary} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'fund' ? { color: '#B0976D' } : { color: theme.text.secondary }
              ]}
            >
              Fund
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'properties' && styles.activeTab,
            activeTab === 'properties' && { borderBottomColor: '#B0976D' }
          ]} 
          onPress={() => setActiveTab('properties')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="home-outline" 
              size={20} 
              color={activeTab === 'properties' ? '#B0976D' : theme.text.secondary} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'properties' ? { color: '#B0976D' } : { color: theme.text.secondary }
              ]}
            >
              My Properties
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Content based on active tab */}
      {activeTab === 'fund' ? renderFundTab() : renderPropertiesTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pickerWrapper: {
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 16,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricSpacing: {
    height: 12,
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
  },
  gradesContainer: {
    gap: 8,
  },
  actionSection: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
    paddingBottom: 120,
  },
  consultButton: {
    borderRadius: 12,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: defaultTheme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  consultButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  consultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
    marginTop: 16,
  },
  input: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
    padding: 0,
    textAlignVertical: 'top',
  },
  completeText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
    alignSelf: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  // Portfolio Tab Styles
  fundTabContainer: {
    flex: 1,
  },
  portfolioHeader: {
    display: 'none', // Hide the header completely
  },
  portfolioHeaderTitle: {
    display: 'none', // Hide the title completely
  },
  statsOverview: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FAFAFA',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  cashFlowValue: {
    color: DARK_GREEN,
  },
  roiValue: {
    color: DARK_GREEN,
  },
  statLabel: {
    fontSize: 10,
    color: '#717171',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EBEBEB',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  addPropertyButton: {
    display: 'none', // Hide the Add Property button
  },
  addPropertyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  propertiesTabContent: {
    flex: 1,
  },
  fundScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  fundStats: {
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10,
    color: '#717171',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#EBEBEB',
    marginHorizontal: 1,
  },
  roiValue: {
    color: DARK_GREEN,
  },
  fundHeader: {
    display: 'none', // Hide the header completely
  },
  fundHeaderTitle: {
    display: 'none', // Hide the title completely
  },
  sortIndicator: {
    display: 'none',
  },
  sortIcon: {
    marginRight: 6,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555555',
  },
});

export default EarnMoreScreen;
