import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Linking,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme as defaultTheme } from '../theme';
import { moneyFormatter } from '../utils/revenueUtils';
import { useTheme } from '../context/ThemeContext';

// Define gold colors for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  overlay: 'rgba(182, 148, 76, 0.08)',
};

const { width } = Dimensions.get('window');

const PropertyCard = ({ property, revenue, onPress }) => {
  const { theme, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const formatRevenue = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  // Calculate randomized rating for visual appeal
  const rating = (4.5 + Math.random() * 0.5).toFixed(1);

  const cardShadow = isDarkMode ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  };

  const handleLinkClick = async (type) => {
    console.log('Property object:', property);
    
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

  return (
    <AnimatedPressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.container,
        cardShadow,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor: theme.surface,
        },
      ]}
    >
      <View style={styles.imageContainer}>
        <Animated.Image 
          source={{ uri: property.listingImages[0]?.url || 'https://via.placeholder.com/300' }}
          style={[styles.image, { opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={handleImageLoad}
        />
        {!imageLoaded && (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={30} color={isDarkMode ? '#444' : '#ddd'} />
          </View>
        )}
        
        <View style={styles.overlay}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
        
        <View style={styles.imageGradient} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>{property.name}</Text>
          <View style={[styles.ratingContainer, { backgroundColor: GOLD.light }]}>
            <Ionicons name="star" size={12} color={GOLD.primary} />
            <Text style={[styles.rating, { color: GOLD.primary }]}>{rating}</Text>
          </View>
        </View>
        
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={12} color={theme.text.secondary} />
          <Text style={[styles.location, { color: theme.text.secondary }]} numberOfLines={1}>
            {property.address || 'Location Information Unavailable'}
          </Text>
        </View>

        <View style={[styles.revenueContainer, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.revenueRow}>
            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="cash-outline" size={12} color={GOLD.primary} />
              </View>
              <View>
                <Text style={[styles.revenueValue, { color: GOLD.primary }]}>
                  {moneyFormatter(revenue)}
                </Text>
                <Text style={[styles.revenueLabel, { color: theme.text.secondary }]}>Total Revenue</Text>
              </View>
            </View>
            
            <View style={styles.listingLinks}>
              <TouchableOpacity 
                style={[styles.listingLinkButton, { backgroundColor: 'rgba(255,90,95,0.1)' }]}
                onPress={() => handleLinkClick('airbnb')}
              >
                <Text style={[styles.listingLinkText, { color: '#FF5A5F' }]}>Airbnb</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.listingLinkButton, { backgroundColor: 'rgba(61,103,255,0.1)' }]}
                onPress={() => handleLinkClick('vrbo')}
              >
                <Text style={[styles.listingLinkText, { color: '#3D67FF' }]}>VRBO</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.propertyMetrics}>
            {property.bedroomCount && (
              <View style={styles.metricItem}>
                <Ionicons name="bed-outline" size={12} color={theme.text.secondary} style={styles.inlineIcon} />
                <Text style={[styles.metricText, { color: theme.text.secondary }]}>
                  {property.bedroomCount} {property.bedroomCount === 1 ? 'Bedroom' : 'Bedrooms'}
                </Text>
              </View>
            )}
            
            {property.bathroomCount && (
              <View style={styles.metricItem}>
                <Ionicons name="water-outline" size={12} color={theme.text.secondary} style={styles.inlineIcon} />
                <Text style={[styles.metricText, { color: theme.text.secondary }]}>
                  {property.bathroomCount} {property.bathroomCount === 1 ? 'Bathroom' : 'Bathrooms'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'transparent',
    backgroundGradient: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  },
  overlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  location: {
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  rating: {
    fontSize: 11,
    marginLeft: 3,
    fontWeight: '600',
  },
  revenueContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GOLD.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  revenueValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  revenueLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  inlineIcon: {
    marginRight: 5,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listingLinks: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  listingLinkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 6,
  },
  listingLinkText: {
    fontSize: 11,
    fontWeight: '600',
  },
  propertyMetrics: {
    marginTop: 4,
  },
});

export default PropertyCard;