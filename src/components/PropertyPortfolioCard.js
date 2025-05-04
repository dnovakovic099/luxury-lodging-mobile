import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 220; // Reduced image height
const DARK_GREEN = '#097969'; // Rich dark green color
const EXPENSE_RED = '#D32F2F'; // Slightly darker red for expenses

const PropertyPortfolioCard = ({ property, formatCurrency }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFinancialDetails, setShowFinancialDetails] = useState(false);
  const scrollRef = useRef(null);
  const cardWidth = SCREEN_WIDTH - 32; // Width accounting for margins
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Set default city if not provided
  const propertyWithDefaults = {
    ...property,
    city: property.city || property.location?.split(',')[0] || 'Lynchburg',
  };

  // Calculate metrics
  const launchCost = property.launchCost; // Use Launch Cost directly from property object
  const monthlyNetIncome = property.monthlyProfit; // Monthly net income
  const yearlyNetIncome = property.monthlyProfit * 12; // Calculate yearly net income
  
  // For the Cash Flow percentage, use ROI if available, otherwise calculate it
  const cashFlowPercentage = property.roi ? 
    Number(property.roi).toFixed(1) : 
    (launchCost > 0 ? ((yearlyNetIncome / launchCost) * 100).toFixed(1) : "0.0");
  
  // Calculate total monthly expenses
  const totalMonthlyExpenses = 
    propertyWithDefaults.monthlyCleaningCosts + 
    propertyWithDefaults.pmFee + 
    propertyWithDefaults.mortgagePayment + 
    propertyWithDefaults.monthlyExpenses;

  // Rotate the chevron icon when expanded/collapsed
  const toggleFinancialDetails = () => {
    const newValue = !showFinancialDetails;
    setShowFinancialDetails(newValue);
    Animated.timing(rotateAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffset / cardWidth);
    if (currentIndex !== activeImageIndex) {
      setActiveImageIndex(currentIndex);
    }
  };

  const goToNextImage = () => {
    if (activeImageIndex < propertyImages.length - 1) {
      scrollRef.current.scrollTo({
        x: (activeImageIndex + 1) * cardWidth,
        animated: true
      });
    }
  };

  const goToPrevImage = () => {
    if (activeImageIndex > 0) {
      scrollRef.current.scrollTo({
        x: (activeImageIndex - 1) * cardWidth,
        animated: true
      });
    }
  };

  // Always use the working image for both properties
  const safeImages = [
    'https://a0.muscache.com/im/pictures/4a5c629b-9c92-450e-8d8f-995875798838.jpg',
    'https://a0.muscache.com/im/pictures/e25a9b25-fa98-4160-bfd1-039287bf38b6.jpg',
    'https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/cc8f7f3c-17a3-486f-ab11-fe5e36c97bd7.jpeg',
  ];

  // Get property images or use safe fallback images
  const getPropertyImages = () => {
    console.log('===== PROPERTY IMAGE DEBUG =====');
    console.log('Property name:', property.name);
    
    // First try listingImages (from ListingsScreen format)
    if (property.listingImages && Array.isArray(property.listingImages) && property.listingImages.length > 0) {
      console.log('Using listingImages array with', property.listingImages.length, 'items');
      const urls = property.listingImages
        .filter(img => img)
        .map(img => img.url || img.thumbnail || (typeof img === 'string' ? img : null))
        .filter(url => url);
      
      if (urls.length > 0) {
        console.log('Extracted', urls.length, 'URLs from listingImages');
        return urls;
      }
    }
    
    // Then try standard images array
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      console.log('Using images array with', property.images.length, 'items');
      const extractedImages = property.images
        .filter(img => img)
        .map(img => {
          // Handle different image formats
          if (typeof img === 'string') return img;
          if (img.url) return img.url;
          if (img.thumbnail) return img.thumbnail;
          if (img.original) return img.original;
          return null;
        })
        .filter(url => url); // Remove any nulls
      
      console.log('Extracted', extractedImages.length, 'URLs from images array');
      
      if (extractedImages.length > 0) {
        return extractedImages;
      }
    }
    
    // Check if property has a single image or thumbnail
    if (property.image) {
      console.log('Using main image property as fallback');
      return [property.image];
    }
    
    if (property.thumbnail) {
      console.log('Using thumbnail as fallback');
      return [property.thumbnail];
    }
    
    console.log('Using safe images as fallback');
    return safeImages;
  };

  const propertyImages = getPropertyImages();

  return (
    <View style={styles.container}>
      {/* Property Image */}
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {propertyImages.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.propertyImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        {/* Image Indicators */}
        <View style={styles.paginationContainer}>
          {propertyImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeImageIndex && styles.paginationDotActive
              ]}
            />
          ))}
        </View>

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Largest Booking</Text>
            <Text style={styles.statValue}>{formatCurrency(13400)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Best Month</Text>
            <Text style={styles.statValue}>{formatCurrency(36349)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>City Rank</Text>
            <View style={styles.rankContainer}>
              <Text style={styles.rankValue}>#2</Text>
              <Text style={styles.rankSubtext}>in {property.city}</Text>
            </View>
          </View>
        </View>

        {/* Navigation Arrows */}
        {activeImageIndex > 0 && (
          <TouchableOpacity style={styles.navArrowLeft} onPress={goToPrevImage}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
        )}
        
        {activeImageIndex < propertyImages.length - 1 && (
          <TouchableOpacity style={styles.navArrowRight} onPress={goToNextImage}>
            <Ionicons name="chevron-forward" size={22} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Guest Favorite Badge (if applicable) */}
        {property.isGuestFavorite && (
          <View style={styles.favoriteBadge}>
            <Text style={styles.favoriteBadgeText}>Guest favorite</Text>
          </View>
        )}
      </View>

      {/* Property Info */}
      <View style={styles.infoContainer}>
        {/* Compact Header with Title, Location, and Rating */}
        <View style={styles.headerContainer}>
          <View style={styles.titleAndLocationContainer}>
            <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
            <Text style={styles.locationText} numberOfLines={1}>{property.location}</Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingValue}>{property.rating || "4.96"}</Text>
              <Ionicons name="star" size={12} color="#000" style={styles.starIcon} />
            </View>
            <Text style={styles.reviewCount}>
              {property.reviews || "229"} Reviews
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Financial Content Container */}
        <View style={[styles.financialContainer, showFinancialDetails && styles.financialContainerExpanded]}>
          {/* Financial Summary (Always Visible) - all 4 metrics on same line */}
          <View style={styles.financialSummary}>
            <View style={styles.financialMetric}>
              <Text style={styles.metricLabel}>Launch Cost</Text>
              <Text style={styles.metricValue}>{formatCurrency(launchCost)}</Text>
            </View>
            
            <View style={styles.metricDivider} />
            
            <View style={styles.financialMetric}>
              <Text style={styles.metricLabel}>Net Income</Text>
              <Text style={styles.metricValue}>{formatCurrency(yearlyNetIncome)}</Text>
            </View>
            
            <View style={styles.metricDivider} />
            
            <View style={styles.financialMetric}>
              <Text style={styles.metricLabel}>Cash Flow</Text>
              <Text style={styles.metricValue}>{cashFlowPercentage}%</Text>
            </View>
            
            {property.appreciationPercentage && Number(property.appreciationPercentage) > 0 && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.financialMetric}>
                  <Text style={styles.metricLabel}>Appreciation</Text>
                  <Text style={styles.metricValue}>{property.appreciationPercentage}%</Text>
                </View>
              </>
            )}
          </View>

          {/* Financial Overview Toggle - smaller and sleeker */}
          <TouchableOpacity 
            style={[
              styles.overviewToggle,
              showFinancialDetails && styles.overviewToggleExpanded
            ]} 
            onPress={toggleFinancialDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.overviewToggleText}>
              {showFinancialDetails ? "Hide" : "Show"} Financial Overview
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Ionicons name="chevron-down" size={14} color="#717171" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Collapsible Financial Details */}
        {showFinancialDetails && (
          <View style={styles.financialDetails}>
            {/* Monthly Revenue Section */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Monthly Revenue</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Average Nightly Rate</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(property.averageNightlyRate || 427)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Occupancy Rate</Text>
                  <Text style={styles.detailValue}>
                    {property.occupancyRate || 86}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gross Monthly Revenue</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(property.grossMonthlyRevenue || 11056)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Property Value Section */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Property Value</Text>
              
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purchase Price</Text>
                  <Text style={styles.detailValue}>{formatCurrency(propertyWithDefaults.purchasePrice)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Value</Text>
                  <Text style={styles.detailValue}>{formatCurrency(propertyWithDefaults.currentValue)}</Text>
                </View>
                
                <View style={styles.highlightBox}>
                  <Text style={styles.highlightLabel}>Appreciation</Text>
                  <Text style={styles.highlightValue}>{propertyWithDefaults.appreciationPercentage}%</Text>
                </View>
              </View>
            </View>
            
            {/* Monthly Financials Section */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Monthly Financials</Text>
              
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Revenue</Text>
                  <Text style={styles.positiveValue}>{formatCurrency(propertyWithDefaults.monthlyRevenue2024)}</Text>
                </View>
                
                <View style={styles.expenseGroup}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cleaning</Text>
                    <Text style={styles.negativeValue}>-{formatCurrency(propertyWithDefaults.monthlyCleaningCosts)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Property Management</Text>
                    <Text style={styles.negativeValue}>-{formatCurrency(propertyWithDefaults.pmFee)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mortgage</Text>
                    <Text style={styles.negativeValue}>-{formatCurrency(propertyWithDefaults.mortgagePayment)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Other Expenses</Text>
                    <Text style={styles.negativeValue}>-{formatCurrency(propertyWithDefaults.monthlyExpenses)}</Text>
                  </View>
                </View>
                
                <View style={styles.highlightBox}>
                  <Text style={styles.highlightLabel}>Net Cash Flow</Text>
                  <Text style={styles.highlightValue}>{formatCurrency(propertyWithDefaults.monthlyProfit)}</Text>
                </View>
              </View>
            </View>
            
            {/* Yearly Summary Section */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Yearly Summary</Text>
              
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Launch Cost</Text>
                  <Text style={styles.launchCostDetailValue}>{formatCurrency(launchCost)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Yearly Net Income</Text>
                  <Text style={styles.positiveValue}>{formatCurrency(yearlyNetIncome)}</Text>
                </View>
                
                <View style={styles.highlightBox}>
                  <Text style={styles.highlightLabel}>Return on Investment</Text>
                  <Text style={styles.highlightValue}>{cashFlowPercentage}%</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 0, // Remove horizontal margin
  },
  imageContainer: {
    height: 220,
    position: 'relative',
    width: '100%', // Ensure image container takes full width
  },
  propertyImage: {
    width: SCREEN_WIDTH - 32, // Account for parent container padding
    height: 220,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#FFF',
    width: 6,
    height: 6,
  },
  navArrowLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  favoriteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
  },
  infoContainer: {
    padding: 0, // Remove padding from container
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 12, // Add horizontal padding to the header
    paddingTop: 12, // Add top padding to the header
  },
  titleAndLocationContainer: {
    flex: 1,
    marginRight: 12,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#717171',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 3,
  },
  starIcon: {
    marginRight: 3,
  },
  reviewCount: {
    fontSize: 11,
    color: '#717171',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginVertical: 6,
    marginHorizontal: 0, // Remove horizontal margin
  },
  financialContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 0, // Remove border radius
    borderWidth: 1,
    borderColor: '#EBEBEB',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 6,
    marginHorizontal: 0, // Remove horizontal margin
  },
  financialContainerExpanded: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottom: 0,
  },
  financialSummary: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12, // Increased horizontal padding
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialMetric: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EBEBEB',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#717171',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },
  overviewToggle: {
    backgroundColor: '#EFEFEF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 0, // Remove border radius to match container
  },
  overviewToggleExpanded: {
    marginBottom: 0,
  },
  overviewToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  financialDetails: {
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#EBEBEB',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 6,
    marginHorizontal: 0, // Remove horizontal margin
  },
  detailSection: {
    marginBottom: 24,
    paddingHorizontal: 0, // Remove horizontal padding
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0976D',
    marginBottom: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(176, 151, 109, 0.2)',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailLabel: {
    fontSize: 13,
    color: '#717171',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  positiveValue: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_GREEN,
  },
  negativeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: EXPENSE_RED,
  },
  launchCostDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  expenseGroup: {
    backgroundColor: '#FAFAFA',
  },
  highlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F7F7F7',
  },
  highlightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  statsBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rankContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rankSubtext: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  rankBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B0976D',
    marginLeft: 4,
  },
});

export default PropertyPortfolioCard; 