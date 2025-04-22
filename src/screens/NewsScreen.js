import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Animated,
  Image,
  Platform,
  Linking,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  ImageBackground,
  StatusBar,
  BlurView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import { getReservationsWithFinancialData } from '../services/api';
// After installing react-native-dotenv, you would use:
// import { GEMINI_API_KEY } from '@env';

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

// Define gold colors for consistency with the app's theme
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)',
  gradient: '#D4AF37',
  dark: '#8E712F'
};

// For development, you can hardcode the key here temporarily
// Replace with import from @env after setting up react-native-dotenv
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAl-qIvjTpvNY4_1Hh4SAywOJlcgY5A-xw';

// Function to generate a prompt based on category
const generatePrompt = (category) => {
  console.log(`Generating prompt for category: ${category}`);
  
  if (category === 'all') {
    return `Search specifically on Google News for 6 recent, verified news articles about short-term rentals, vacation properties, Airbnb, VRBO, and luxury vacation rental platforms from the past month.

            IMPORTANT: ONLY return articles from Google News that have confirmed working URLs. 
            
            For each article, provide: 
            1. The exact title as it appears on Google News
            2. The actual publication date (must be within the last month)
            3. A brief 2-3 sentence summary of the article
            4. The category it best fits (market trends, regulations, investment opportunities, or industry news)
            5. A relevance score (1-10) for luxury property owners
            6. The EXACT, unmodified URL from Google News - do not create or modify the URLs
            
            IMPORTANT: Format your response ONLY as a valid JSON array without any introduction or explanation. Start with "[" and end with "]".
            Each article object should have these properties:
            title, date, summary, category, relevanceScore, url and imageType (assign one of these based on article content: "trend", "regulation", "investment", "news", "luxury", "beach", "mountain", "city", "modern", "interior")`;
  } else {
    return `Search specifically on Google News for 6 recent, verified news articles about ${category} related to luxury short-term rentals and vacation properties from the past month.
            
            IMPORTANT: ONLY return articles from Google News that have confirmed working URLs.
            
            For each article, provide: 
            1. The exact title as it appears on Google News
            2. The actual publication date (must be within the last month)
            3. A brief 2-3 sentence summary of the article
            4. A relevance score (1-10) for luxury property owners
            5. The EXACT, unmodified URL from Google News - do not create or modify the URLs
            
            IMPORTANT: Format your response ONLY as a valid JSON array without any introduction or explanation. Start with "[" and end with "]".
            Each article object should have these properties:
            title, date, summary, category (which should be "${category}"), relevanceScore, url and imageType (assign one of these based on article content: "trend", "regulation", "investment", "news", "luxury", "beach", "mountain", "city", "modern", "interior")`;
  }
};

// Function to get locations from properties
const getLocations = () => {
  // This would normally pull from your application state or storage
  // For now returning a default array
  return ['Miami', 'Aspen', 'Palm Springs', 'Hamptons', 'Los Angeles'];
};

// Helper function to get image URL based on article type
const getImageForType = (type) => {
  switch (type?.toLowerCase()) {
    case 'trend':
      return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'regulation':
      return 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'investment':
      return 'https://images.unsplash.com/photo-1460794418188-1bb7dba2720d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'news':
      return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'luxury':
      return 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'beach':
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'mountain':
      return 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'city':
      return 'https://images.unsplash.com/photo-1444084316824-dc26d6657664?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'modern':
      return 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'interior':
      return 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'market trends':
      return 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'regulations':
      return 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'investment opportunities':
      return 'https://images.unsplash.com/photo-1604594849809-dfedbc827105?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    case 'industry news':
      return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
    default:
      // Generate a random image if type doesn't match any case
      const options = [
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1494526585095-c41cabfe98bd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      ];
      return options[Math.floor(Math.random() * options.length)];
  }
};

// Function to open URL
const openURL = (url) => {
  try {
    // Check if the URL is valid and has http/https
    let finalUrl = url;
    if (url && !url.startsWith('http')) {
      finalUrl = `https://${url}`;
    }
    
    // Avoid common URL patterns that might be errors
    const avoidPatterns = [
      'javascript:', 'mailto:', 'tel:', 'file:', 
      '{', '}', '[', ']', '(', ')',  // URLs with template syntax
      'example.com', 'domain.com', 'website.com', // Generic domains
    ];
    
    const hasAvoidPattern = avoidPatterns.some(pattern => finalUrl.includes(pattern));
    if (hasAvoidPattern) {
      console.log(`Avoiding potentially invalid URL: ${finalUrl}`);
      return;
    }
    
    // Validate URL format
    if (finalUrl && typeof finalUrl === 'string') {
      console.log(`Opening URL: ${finalUrl}`);
      Linking.canOpenURL(finalUrl)
        .then(supported => {
          if (supported) {
            Linking.openURL(finalUrl);
          } else {
            console.log(`Unable to open URL: ${finalUrl}`);
          }
        })
        .catch(err => console.error('Error opening URL:', err));
    }
  } catch (error) {
    console.error('Error in openURL function:', error);
  }
};

const AIReportScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { listings, user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedListingName, setSelectedListingName] = useState("Select a property");
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Dynamic header animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [90, 70],
    extrapolate: 'clamp',
  });
  
  const headerTitleSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [24, 20],
    extrapolate: 'clamp',
  });
  
  const headerPadding = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [16, 8],
    extrapolate: 'clamp',
  });
  
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [1, 0.8, 1],
    extrapolate: 'clamp',
  });
  
  const headerIconSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [24, 20],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // Set first listing as default if available
    if (listings && listings.length > 0 && !selectedListing) {
      setSelectedListing(listings[0].id);
      setSelectedListingName(listings[0].name || `Property #${listings[0].id}`);
    }
  }, [listings]);

  // Function to handle property selection
  const selectProperty = (property) => {
    setSelectedListing(property.id);
    setSelectedListingName(property.name || `Property #${property.id}`);
    setShowPropertyPicker(false);
  };

  // Function to fetch reservations for a listing with financial data
  const fetchReservations = async (listingId) => {
    try {
      console.log(`Fetching reservations for listing ID: ${listingId}`);
      
      // Set up params similar to ReservationsScreen
      const params = {
        listingMapIds: [listingId],
        // By default, get all reservations for the past year
        fromDate: moment().subtract(1, 'year').format('YYYY-MM-DD'),
        toDate: moment().add(3, 'months').format('YYYY-MM-DD'),
        dateType: 'arrivalDate',
        // Only include confirmed and completed reservations, exclude inquiries and cancelled
        statuses: ['confirmed', 'completed', 'modified', 'new']
      };
      
      // Use the same service function used in ReservationsScreen
      const result = await getReservationsWithFinancialData(params);
      
      if (!result?.reservations || !Array.isArray(result.reservations)) {
        console.log('No reservations found or invalid response format');
        return [];
      }
      
      // Transform reservations to ensure consistent format for analysis
      // Filter out any inquiries or cancelled bookings that might have slipped through
      return result.reservations
        .filter(res => {
          const status = (res.status || '').toLowerCase();
          // Exclude inquiries, cancelled, or declined reservations
          return !status.includes('inquiry') && 
                 !status.includes('cancel') && 
                 !status.includes('declined') &&
                 !status.includes('deleted');
        })
        .map(res => {
          // Get dates from reservation
          const arrivalDate = new Date(res.arrivalDate || res.checkInDate);
          const departureDate = new Date(res.departureDate || res.checkOutDate);
          
          // Calculate nights
          const nights = Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24)) || res.nights || 1;
          
          // Extract financial data for consistency
          const financialData = res.financialData || {};
          
          return {
            id: res.id || res.reservationId,
            guestName: res.guestName || `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() || 'Guest',
            checkIn: moment(arrivalDate).format('YYYY-MM-DD'),
            checkOut: moment(departureDate).format('YYYY-MM-DD'),
            nights: nights,
            guestCount: res.adults || res.numberOfGuests || 1,
            totalAmount: parseFloat(res.totalPrice || financialData.totalPaid || 0),
            status: res.status || 'completed',
            ownerPayout: parseFloat(res.ownerPayout || res.airbnbExpectedPayoutAmount || 0),
            baseRate: parseFloat(res.baseRate || financialData.baseRate || 0),
            cleaningFee: parseFloat(res.cleaningFee || financialData.cleaningFeeValue || 0),
            processingFee: parseFloat(
              financialData.PaymentProcessing || 
              financialData.paymentProcessing || 
              res.paymentProcessingFee || 
              res.processingFee || 
              0
            ),
            channelFee: parseFloat(
              res.channelFee || 
              financialData.channelFee || 
              res.hostChannelFee ||
              0
            ),
            managementFee: parseFloat(
              res.pmCommission || 
              res.managementFee || 
              financialData.pmCommission || 
              financialData.managementFee || 
              0
            ),
            channel: res.channelName || res.channel || 'direct',
            rating: parseFloat(res.rating || 0) || 5.0,
            feedback: res.feedback || res.guestComment || ''
          };
        });
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  };

  // Function to generate the prompt for AI
  const generatePrompt = (listingData, reservations, userInput) => {
    const listing = listings.find(l => l.id === listingData);
    const listingName = listing ? listing.name || 'Unnamed property' : 'Property';
    
    // Extract all the listing data for a more comprehensive analysis
    const listingDetails = listing ? {
      id: listing.id,
      name: listing.name || 'Unnamed property',
      location: `${listing.city || ''}, ${listing.state || ''}`,
      propertyType: listing.propertyType || 'Vacation rental',
      bedrooms: listing.bedrooms || 'N/A',
      bathrooms: listing.bathrooms || 'N/A',
      maxGuests: listing.maxGuests || listing.accommodates || 'N/A',
      amenities: listing.amenities || [],
      description: listing.description || '',
      pricePerNight: listing.baseRate || listing.avgNightlyRate || 'N/A',
      cleaningFee: listing.cleaningFee || 'N/A',
      minimumStay: listing.minimumStay || 'N/A',
      photos: (listing.photos && listing.photos.length) || 0,
      reviews: listing.reviewsCount || 0,
      rating: listing.rating || 'N/A',
      instantBookable: listing.instantBookable ? 'Yes' : 'No',
      cancellationPolicy: listing.cancellationPolicy || 'N/A',
      lastUpdated: listing.lastModified || listing.updated || 'N/A'
    } : null;
    
    // Calculate some metrics from reservation data
    let totalRevenue = 0;
    let totalOwnerPayout = 0;
    let totalNights = 0;
    let avgGuestCount = 0;
    let bookingsByChannel = {};
    let seasonalData = {};
    
    if (reservations && reservations.length > 0) {
      // Revenue calculations
      totalRevenue = reservations.reduce((sum, res) => sum + (res.totalAmount || 0), 0);
      totalOwnerPayout = reservations.reduce((sum, res) => sum + (res.ownerPayout || 0), 0);
      
      // Nights booked
      totalNights = reservations.reduce((sum, res) => sum + (res.nights || 0), 0);
      
      // Average guest count
      avgGuestCount = reservations.reduce((sum, res) => sum + (res.guestCount || 0), 0) / reservations.length;
      
      // Bookings by channel
      reservations.forEach(res => {
        const channel = (res.channel || 'unknown').toLowerCase();
        bookingsByChannel[channel] = (bookingsByChannel[channel] || 0) + 1;
      });
      
      // Seasonal booking data - group by month
      reservations.forEach(res => {
        const month = moment(res.checkIn).format('MMMM');
        seasonalData[month] = seasonalData[month] || { count: 0, revenue: 0, nights: 0 };
        seasonalData[month].count += 1;
        seasonalData[month].revenue += (res.totalAmount || 0);
        seasonalData[month].nights += (res.nights || 0);
      });
    }
    
    let prompt = `As a luxury property analysis AI, analyze the following reservation and property data for "${listingName}".
    
PROPERTY DETAILS:
${listingDetails ? 
`ID: ${listingDetails.id}
Name: ${listingDetails.name}
Location: ${listingDetails.location}
Type: ${listingDetails.propertyType}
Bedrooms: ${listingDetails.bedrooms}
Bathrooms: ${listingDetails.bathrooms}
Maximum Guests: ${listingDetails.maxGuests}
Base Rate: ${typeof listingDetails.pricePerNight === 'number' ? '$' + listingDetails.pricePerNight : listingDetails.pricePerNight}
Cleaning Fee: ${typeof listingDetails.cleaningFee === 'number' ? '$' + listingDetails.cleaningFee : listingDetails.cleaningFee}
Minimum Stay: ${listingDetails.minimumStay}
Instant Bookable: ${listingDetails.instantBookable}
Cancellation Policy: ${listingDetails.cancellationPolicy}
Number of Photos: ${listingDetails.photos}
Number of Reviews: ${listingDetails.reviews}
Rating: ${listingDetails.rating}
Last Updated: ${listingDetails.lastUpdated}
${listingDetails.description ? `Description: ${listingDetails.description.substring(0, 200)}${listingDetails.description.length > 200 ? '...' : ''}` : ''}
${listingDetails.amenities && listingDetails.amenities.length > 0 ? `Amenities: ${listingDetails.amenities.slice(0, 10).join(', ')}${listingDetails.amenities.length > 10 ? '...' : ''}` : ''}` 
: 'Property details not available'}

${reservations && reservations.length > 0 ? 
`SUMMARY METRICS:
Total Reservations: ${reservations.length}
Total Revenue: $${totalRevenue.toFixed(2)}
Total Owner Payout: $${totalOwnerPayout.toFixed(2)}
Total Nights Booked: ${totalNights}
Average Guest Count: ${avgGuestCount.toFixed(1)}

BOOKING CHANNELS:
${Object.entries(bookingsByChannel).map(([channel, count]) => `${channel}: ${count} bookings (${((count / reservations.length) * 100).toFixed(1)}%)`).join('\n')}

SEASONAL DATA:
${Object.entries(seasonalData).map(([month, data]) => `${month}: ${data.count} bookings, $${data.revenue.toFixed(2)} revenue, ${data.nights} nights`).join('\n')}` 
: ''}

RESERVATION DATA:
${reservations.map(res => `
- Guest: ${res.guestName}
  Dates: ${moment(res.checkIn).format('MMM D, YYYY')} to ${moment(res.checkOut).format('MMM D, YYYY')} (${res.nights} nights)
  Party size: ${res.guestCount} guests
  Amount: $${res.totalAmount}
  Owner Payout: $${res.ownerPayout}
  Status: ${res.status}
  Channel: ${res.channel}
  Rating: ${res.rating || 'N/A'}/5
  Feedback: "${res.feedback || 'None provided'}"
`).join('')}

Based on this data, please provide:
1. A summary of the reservation performance
2. Key insights about booking patterns, guest preferences, and revenue
3. Recommendations to improve booking rates and guest satisfaction
4. Suggestions for optimizing pricing based on seasonal trends
5. Analysis of channel performance and fees

${userInput ? `\nADDITIONAL ANALYSIS REQUESTED:\n${userInput}` : ''}

Format your response with clear headings and bullet points for readability.`;

    return prompt;
  };

  // Generate AI report
  const generateAIReport = async () => {
    if (!selectedListing) {
      setError('Please select a listing first');
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);
    
    try {
      // Fetch reservations for the selected listing
      const reservations = await fetchReservations(selectedListing);
      
      if (!reservations || reservations.length === 0) {
        setError('No reservation data available for this listing');
        setLoading(false);
        return;
      }
      
      console.log(`Fetched ${reservations.length} reservations for analysis`);
      
      // Debug API key (show only first/last 4 chars for security)
      const keyLength = API_KEY.length;
      const maskedKey = keyLength > 8 
        ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(keyLength - 4)}`
        : '(key too short or not set)';
      console.log('Using API key (masked):', maskedKey);
      
      console.log('Initializing Gemini model with model name: gemini-1.5-flash');
      const genAI = new GoogleGenerativeAI(API_KEY);
      console.log('GoogleGenerativeAI instance created');
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "You are a luxury property analysis AI that helps owners understand their reservation data and optimize their vacation rental business. You provide insightful, data-driven analysis and actionable recommendations.",
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 16,
          maxOutputTokens: 4096,
        }
      });
      
      // Generate prompt with listing, reservations and user input
      const prompt = generatePrompt(selectedListing, reservations, userPrompt);
      
      // Log full prompt for debugging
      console.log('========== FULL PROMPT SENT TO GEMINI ==========');
      console.log(prompt);
      console.log('===============================================');
      
      console.log('Sending request to Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('Received result from Gemini API');
      
      const response = await result.response;
      console.log('Got response object');
      
      const text = response.text();
      console.log('Response text obtained, length:', text.length);
      
      setReportData(text);
      
      // Animate content in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Collapse filters after report generation
      setShowFilters(false);
      
    } catch (error) {
      console.error('Error generating AI report:', error);
      
      // Set appropriate error message for user
      if (error.message.includes('Gemini') || error.message.includes('not found')) {
        setError(`AI service error: ${error.message}`);
      } else if (error.message.includes('network') || error.name === 'TypeError') {
        setError(`Network error: ${error.message}. Check your internet connection.`);
      } else {
        setError(`Unable to generate report: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Format AI response with premium modern styling
  const formatReport = (text) => {
    if (!text) return null;
    
    // Remove all asterisks from the text before processing
    text = text.replace(/\*\*/g, '');
    text = text.replace(/\*/g, '');
    
    // Parse sections similar to before
    const sections = [];
    let currentSection = { title: '', content: [] };
    let inSection = false;
    
    text.split('\n').forEach((line, index) => {
      if (line.startsWith('# ') || 
          line.startsWith('## ') || 
          /^[A-Z][A-Za-z\s]+:/.test(line) ||
          line.match(/^(Summary|Key Insights|Recommendations|Analysis|Suggestions|Conclusion)/i)) {
        
        if (inSection && currentSection.title) {
          sections.push({...currentSection});
        }
        
        const title = line.replace(/^#+ /, '').replace(/:$/, '');
        currentSection = { 
          title: title, 
          content: [],
          icon: getSectionIcon(title),
          type: getSectionType(title)
        };
        inSection = true;
      } 
      else if (inSection) {
        if (line.trim() === '' && currentSection.content.length === 0) {
          return;
        }
        currentSection.content.push(line);
      }
    });
    
    if (inSection && currentSection.title) {
      sections.push({...currentSection});
    }
    
    // Extract key metrics for visualization
    const keyMetrics = extractKeyMetrics(text);
    
    return (
      <View style={styles.premiumReportContainer}>
        {/* Summary Card with Key Metrics */}
        {keyMetrics && renderMetricsCard(keyMetrics)}
        
        {/* Content Sections */}
        {sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.premiumSection}>
              <View style={styles.headerIconContainer}>
                <Icon name={section.icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.premiumSectionTitle}>{section.title}</Text>
            
            <View style={styles.premiumSectionContent}>
              {/* Section Content With Advanced Styling */}
              {renderSectionContent(section.content, section.type)}
            </View>
          </View>
        ))}
      </View>
    );
  };
  
  // Helper function to render different content types with advanced styling
  const renderSectionContent = (contentLines, sectionType) => {
    return contentLines.map((line, lineIndex) => {
      // Bullet points with custom styling based on section type
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.replace(/^[\s-*•]+/, '').trim();
        
        // Check if this bullet contains a key insight or recommendation (for highlighting)
        const isHighlighted = bulletText.toLowerCase().includes('key') || 
                              bulletText.toLowerCase().includes('recommend') ||
                              bulletText.toLowerCase().includes('important');
        
        return (
          <View 
            key={`line-${lineIndex}`} 
            style={[
              styles.premiumBulletItem,
              isHighlighted && styles.highlightedBulletItem
            ]}
          >
            <View style={[
              styles.premiumBulletPoint,
              isHighlighted && styles.highlightedBulletPoint,
              {backgroundColor: getColorForType(sectionType)}
            ]} />
            <Text style={[
              styles.premiumBulletText,
              isHighlighted && styles.highlightedBulletText
            ]}>
              {bulletText}
            </Text>
          </View>
        );
      } 
      // Metrics and statistics with card styling
      else if (line.includes('%') || /\$\d+/.test(line) || /\d+\s+nights/.test(line)) {
        return (
          <View key={`line-${lineIndex}`} style={styles.premiumMetricItem}>
              <Text style={styles.premiumMetricText}>{formatMetricLine(line)}</Text>
          </View>
        );
      }
      // Numbered items with modern styling
      else if (/^\d+\.\s+/.test(line)) {
        const number = line.match(/^\d+/)[0];
        const text = line.replace(/^\d+\.\s+/, '');
        
        return (
          <View key={`line-${lineIndex}`} style={styles.premiumNumberedItem}>
            <View style={[styles.numberBubble, {backgroundColor: getColorForType(sectionType)}]}>
              <Text style={styles.numberText}>{number}</Text>
            </View>
            <Text style={styles.premiumNumberedText}>{text}</Text>
          </View>
        );
      }
      // Section subheadings with accent styling
      else if (line.match(/^([A-Z][A-Za-z\s]+):/) || line.trim().endsWith(':')) {
        return (
          <View key={`line-${lineIndex}`} style={styles.premiumSubheadingContainer}>
            <View style={[styles.subheadingAccent, {backgroundColor: getColorForType(sectionType)}]} />
            <Text style={styles.premiumSubheading}>
              {line}
            </Text>
          </View>
        );
      }
      // Regular paragraph with improved typography
      else if (line.trim() !== '') {
        return (
          <Text key={`line-${lineIndex}`} style={styles.premiumParagraph}>
            {line}
          </Text>
        );
      }
      // Spacer for empty lines
      return <View key={`line-${lineIndex}`} style={styles.premiumLineSpacing} />;
    });
  };
  
  // Helper to extract key metrics for visualization
  const extractKeyMetrics = (text) => {
    const metrics = {
      totalRevenue: null,
      avgNightlyRate: null,
      occupancyRate: null,
      avgRating: null,
      totalBookings: null
    };
    
    // Look for revenue numbers
    const revenueMatch = text.match(/\$([0-9,]+(\.\d+)?)\s+(in total revenue|revenue|in bookings|total bookings value)/i);
    if (revenueMatch) {
      metrics.totalRevenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
    }
    
    // Look for average nightly rate
    const rateMatch = text.match(/\$([0-9,]+(\.\d+)?)\s+per night/i) || 
                     text.match(/average( nightly)? rate of \$([0-9,]+(\.\d+)?)/i);
    if (rateMatch) {
      metrics.avgNightlyRate = parseFloat((rateMatch[2] || rateMatch[1]).replace(/,/g, ''));
    }
    
    // Look for occupancy rate
    const occupancyMatch = text.match(/(\d+)%\s+occupancy/i) || 
                          text.match(/occupancy rate of (\d+)%/i);
    if (occupancyMatch) {
      metrics.occupancyRate = parseInt(occupancyMatch[1]);
    }
    
    // Look for average rating
    const ratingMatch = text.match(/(\d+(\.\d+)?)\s*\/\s*5 rating/i) ||
                       text.match(/average rating of (\d+(\.\d+)?)/i);
    if (ratingMatch) {
      metrics.avgRating = parseFloat(ratingMatch[1]);
    }
    
    // Look for total bookings
    const bookingsMatch = text.match(/(\d+)\s+bookings/i) ||
                         text.match(/total of (\d+) reservations/i);
    if (bookingsMatch) {
      metrics.totalBookings = parseInt(bookingsMatch[1]);
    }
    
    return (metrics.totalRevenue || metrics.avgNightlyRate || metrics.occupancyRate) ? metrics : null;
  };
  
  // Render the metrics card with visualizations
  const renderMetricsCard = (metrics) => {
    return (
      <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Performance Overview</Text>
        
        <View style={styles.metricsContent}>
          <View style={styles.metricsRow}>
            {metrics.totalRevenue && (
              <View style={styles.metricBox}>
                <Icon name="cash-outline" size={24} color={GOLD.primary} style={styles.metricIcon} />
                <Text style={styles.metricValue}>${metrics.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Total Revenue</Text>
              </View>
            )}
            
            {metrics.avgNightlyRate && (
              <View style={styles.metricBox}>
                <Icon name="pricetag-outline" size={24} color={GOLD.primary} style={styles.metricIcon} />
                <Text style={styles.metricValue}>${metrics.avgNightlyRate.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Avg. Nightly Rate</Text>
              </View>
            )}
          </View>
          
          <View style={styles.metricsRow}>
            {metrics.occupancyRate && (
              <View style={styles.metricBox}>
                <Icon name="calendar-outline" size={24} color={GOLD.primary} style={styles.metricIcon} />
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, {width: `${metrics.occupancyRate}%`}]} />
                </View>
                <Text style={styles.metricValue}>{metrics.occupancyRate}%</Text>
                <Text style={styles.metricLabel}>Occupancy Rate</Text>
              </View>
            )}
            
            {metrics.avgRating && (
              <View style={styles.metricBox}>
                <Icon name="star-outline" size={24} color={GOLD.primary} style={styles.metricIcon} />
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Icon 
                      key={`star-${star}`}
                      name={star <= Math.round(metrics.avgRating) ? "star" : "star-outline"} 
                      size={16} 
                      color={GOLD.primary} 
                      style={styles.starIcon}
                    />
                  ))}
                </View>
                <Text style={styles.metricValue}>{metrics.avgRating.toFixed(1)}/5</Text>
                <Text style={styles.metricLabel}>Average Rating</Text>
              </View>
            )}
            
            {metrics.totalBookings && (
              <View style={styles.metricBox}>
                <Icon name="people-outline" size={24} color={GOLD.primary} style={styles.metricIcon} />
                <Text style={styles.metricValue}>{metrics.totalBookings}</Text>
                <Text style={styles.metricLabel}>Total Bookings</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  // Format metric lines for better readability
  const formatMetricLine = (line) => {
    // Highlight dollar amounts
    line = line.replace(/\$\d+(\.\d+)?/g, match => `${match}`);
    // Highlight percentages
    line = line.replace(/\d+%/g, match => `${match}`);
    return line;
  };
  
  // Helper function to get gradient colors for section types
  const getGradientForType = (type) => {
    switch(type) {
      case 'revenue':
        return ['#B6944C', '#D4AF37'];
      case 'insights':
        return ['#4C7BB6', '#37A9D4'];
      case 'recommendations':
        return ['#4CB687', '#37D49B'];
      case 'guest':
        return ['#B64C7B', '#D437A9'];
      case 'channel':
        return ['#4C4CB6', '#8A37D4'];
      default:
        return ['#B6944C', '#D4AF37'];
    }
  };
  
  // Helper function to get colors for elements based on section type
  const getColorForType = (type) => {
    switch(type) {
      case 'revenue':
        return GOLD.primary;
      case 'insights':
        return '#37A9D4';
      case 'recommendations':
        return '#37D49B';
      case 'guest':
        return '#D437A9';
      case 'channel':
        return '#8A37D4';
      default:
        return GOLD.primary;
    }
  };
  
  // Helper function to determine section type based on title
  const getSectionType = (title) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('revenue') || titleLower.includes('financial') || titleLower.includes('pricing')) {
      return 'revenue';
    }
    else if (titleLower.includes('insight') || titleLower.includes('finding') || titleLower.includes('analysis')) {
      return 'insights';
    }
    else if (titleLower.includes('recommendation') || titleLower.includes('suggestion') || 
             titleLower.includes('improvement') || titleLower.includes('optimize')) {
      return 'recommendations';
    }
    else if (titleLower.includes('guest') || titleLower.includes('feedback') || titleLower.includes('review')) {
      return 'guest';
    }
    else if (titleLower.includes('channel') || titleLower.includes('platform') || titleLower.includes('booking source')) {
      return 'channel';
    }
    else {
      return 'default';
    }
  };
  
  // Helper function to assign icons to sections based on their title
  const getSectionIcon = (title) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('summary') || titleLower.includes('overview')) {
      return 'document-text-outline';
    }
    else if (titleLower.includes('insight') || titleLower.includes('finding')) {
      return 'bulb-outline';
    }
    else if (titleLower.includes('revenue') || titleLower.includes('financial')) {
      return 'cash-outline';
    }
    else if (titleLower.includes('recommendation') || titleLower.includes('suggestion')) {
      return 'checkbox-outline';
    }
    else if (titleLower.includes('pricing') || titleLower.includes('rate')) {
      return 'pricetag-outline';
    }
    else if (titleLower.includes('guest') || titleLower.includes('feedback')) {
      return 'people-outline';
    }
    else if (titleLower.includes('channel') || titleLower.includes('platform')) {
      return 'globe-outline';
    }
    else if (titleLower.includes('season') || titleLower.includes('pattern')) {
      return 'calendar-outline';
    }
    else if (titleLower.includes('occupancy') || titleLower.includes('booking')) {
      return 'bed-outline';
    }
    else if (titleLower.includes('conclusion')) {
      return 'checkmark-circle-outline';
    }
    else {
      return 'analytics-outline';
    }
  };
  
  // Render property item for the picker (redesigned)
  const renderPropertyItem = ({ item }) => {
    const isSelected = selectedListing === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.propertyItem,
          isSelected && styles.selectedPropertyItem,
          { 
            backgroundColor: isSelected ? 'rgba(182, 148, 76, 0.1)' : theme.surface,
            borderColor: isSelected ? GOLD.primary : 'transparent',
            borderLeftWidth: isSelected ? 3 : 0
          }
        ]}
        onPress={() => selectProperty(item)}
      >
        <Text 
          style={[
            styles.propertyItemText, 
            isSelected && styles.selectedPropertyItemText,
            { color: isSelected ? GOLD.primary : theme.text.primary }
          ]}
        >
          {item.name || `Property #${item.id}`}
        </Text>
        {isSelected && (
          <Icon name="checkmark" size={20} color={GOLD.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        {/* Enhanced Dynamic Header */}
        <Animated.View
          style={[
            styles.dynamicHeader,
            {
              height: headerHeight,
              backgroundColor: theme.background,
              paddingTop: insets.top,
              paddingBottom: headerPadding,
              paddingHorizontal: 20,
              borderBottomWidth: 0.5,
              borderBottomColor: 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          <Animated.View style={styles.headerContent}>
            <Animated.Text 
              style={[
                styles.dynamicHeaderTitle,
                { 
                  color: theme.text.primary,
                  fontSize: headerTitleSize,
                  opacity: headerTitleOpacity
                }
              ]}
            >
              AI Property Insights
            </Animated.Text>
            
            <Animated.View
              style={[
                styles.trendIconContainer,
                { 
                  opacity: headerTitleOpacity,
                  transform: [{ scale: headerTitleOpacity }]
                }
              ]}
            >
              <Icon name="trending-up" size={24} color={GOLD.primary} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
        
        {/* Collapsible Input Section */}
        {(showFilters || !reportData) && (
          <View style={[styles.inputSection, {backgroundColor: theme.background}]}>
            <View style={styles.inputRow}>
              <Text style={[styles.sectionLabel, {color: theme.text.secondary}]}>Property</Text>
              
              {/* Slimmer Dropdown */}
              <TouchableOpacity 
                style={[styles.propertySelector, {
                  backgroundColor: theme.surface,
                  borderColor: GOLD.light,
                }]} 
                onPress={() => setShowPropertyPicker(true)}
              >
                <Text style={[styles.selectorText, {color: theme.text.primary}]}>
                  {selectedListingName}
                </Text>
                <Icon name="chevron-down" size={18} color={GOLD.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.promptContainer}>
              <Text style={[styles.sectionLabel, {color: theme.text.secondary}]}>
                Additional analysis (optional)
              </Text>
              
              <TextInput
                style={[
                  styles.promptInput, 
                  {
                    backgroundColor: theme.surface, 
                    color: theme.text.primary,
                    borderColor: 'rgba(0,0,0,0.05)'
                  }
                ]}
                placeholder="e.g., Analyze weekend vs weekday performance"
                placeholderTextColor={theme.text.placeholder}
                value={userPrompt}
                onChangeText={setUserPrompt}
                multiline
              />
            </View>
            
            <TouchableOpacity
              style={[styles.runButton]}
              onPress={generateAIReport}
              disabled={loading || !selectedListing}
            >
              <View style={[styles.buttonGradient, {backgroundColor: GOLD.primary}]}>
                <Text style={styles.runButtonText}>
                  {loading ? 'Generating Report...' : 'Generate AI Report'}
                </Text>
                {!loading && <Icon name="analytics-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />}
              </View>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Results Section */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GOLD.primary} />
            <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
              Analyzing property data and generating insights...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={42} color={theme.text.error} />
            <Text style={[styles.errorText, { color: theme.text.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: GOLD.primary }]}
              onPress={generateAIReport}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : reportData ? (
          <Animated.View style={[styles.reportContainer, { opacity: fadeAnim }]}>
            {!showFilters && (
              <TouchableOpacity 
                style={styles.filterToggle}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Icon name="options-outline" size={16} color={GOLD.primary} />
                <Text style={styles.filterToggleText}>Show Filters</Text>
              </TouchableOpacity>
            )}
            <ScrollView 
              style={styles.reportScrollView}
              contentContainerStyle={styles.reportContent}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              {formatReport(reportData)}
            </ScrollView>
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
              <Icon name="analytics" size={70} color={GOLD.primary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text.primary }]}>
                AI Property Analysis
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.text.secondary }]}>
                Select a property and generate a detailed report with insights and recommendations based on your reservation data.
              </Text>
          </View>
        )}
      </KeyboardAvoidingView>
      
      {/* Modern Property Picker Modal */}
      <Modal
        visible={showPropertyPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPropertyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modernModalContent, {backgroundColor: theme.surface}]}>
            <View style={styles.modalHeaderBar}>
              <View style={styles.modalDragHandle} />
            </View>
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text.primary}]}>Select Property</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowPropertyPicker(false)}
              >
                <Icon name="close" size={22} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={listings}
              renderItem={renderPropertyItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.propertyList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              ListEmptyComponent={
                <Text style={[styles.emptyListText, {color: theme.text.secondary}]}>
                  No properties available
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  // New Dynamic Header Styles
  dynamicHeader: {
    justifyContent: 'flex-end',
    zIndex: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dynamicHeaderTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trendIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(182, 148, 76, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Input Section
  inputSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 5,
  },
  inputRow: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  // Property Selector
  propertySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  promptContainer: {
    marginBottom: 20,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  runButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: GOLD.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  // Filter toggle
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(182, 148, 76, 0.05)',
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: GOLD.primary,
    marginLeft: 6,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modern Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modernModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '60%',
  },
  modalHeaderBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyList: {
    paddingHorizontal: 20,
  },
  propertyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedPropertyItem: {
    borderLeftWidth: 3,
  },
  propertyItemText: {
    fontSize: 16,
  },
  selectedPropertyItemText: {
    fontWeight: '600',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 3,
  },
  emptyListText: {
    textAlign: 'center',
    padding: 20,
  },
  
  // Report Container
  reportContainer: {
    flex: 1,
  },
  reportScrollView: {
    flexGrow: 1,
  },
  reportContent: {
    paddingBottom: 30,
  },
  
  // Metrics Card
  metricsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsTitle: {
    color: GOLD.primary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 12,
  },
  metricsContent: {
    padding: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metricBox: {
    alignItems: 'center',
    padding: 10,
    minWidth: width / 3,
  },
  metricIcon: {
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginVertical: 3,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginVertical: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: GOLD.primary,
    borderRadius: 3,
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  
  // Section Styles
  premiumReportContainer: {
    paddingBottom: 30,
  },
  premiumSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GOLD.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginBottom: 8,
  },
  premiumSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  premiumSectionContent: {
    paddingHorizontal: 16,
  },
  
  // Content Elements
  premiumSubheadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  subheadingAccent: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 8,
  },
  premiumSubheading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  premiumParagraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    color: '#333',
  },
  premiumBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  highlightedBulletItem: {
    backgroundColor: 'rgba(182, 148, 76, 0.05)',
    padding: 10,
    paddingLeft: 8,
    borderRadius: 8,
    marginHorizontal: -8,
  },
  premiumBulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
    backgroundColor: GOLD.primary,
  },
  highlightedBulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: GOLD.primary,
  },
  premiumBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  highlightedBulletText: {
    fontWeight: '500',
  },
  premiumMetricItem: {
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  premiumMetricText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  premiumNumberedItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  numberBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  numberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  premiumNumberedText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    fontWeight: '500',
  },
  premiumLineSpacing: {
    height: 8,
  },
});

export default AIReportScreen;
