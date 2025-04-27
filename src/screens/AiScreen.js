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
import RNFS from 'react-native-fs';
import { getReservationsWithFinancialData } from '../services/api';
// After installing react-native-dotenv, you would use:
// import { GEMINI_API_KEY } from '@env';

// IMPORTANT: This implementation now includes proper image processing for Gemini:
// - We use react-native-fs to download images and convert them to base64
// - Images are displayed in a carousel for user reference
// - The same images are sent to Gemini's multimodal API for analysis
//
// Make sure to link react-native-fs properly by following these steps:
// 1. For iOS: cd ios && pod install
// 2. For Android: No additional steps needed

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

// Clean up fetchImageAsBase64 function to be more concise
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    console.log(`Fetching image from URL: ${imageUrl}`);
    
    // Create a unique temporary file path
    const tempFilePath = `${RNFS.CachesDirectoryPath}/${new Date().getTime()}_${Math.floor(Math.random() * 1000)}.jpg`;
    
    // Download the image to the temporary file
    const downloadResult = await RNFS.downloadFile({
      fromUrl: imageUrl,
      toFile: tempFilePath,
      background: false,
      cacheable: true,
    }).promise;
    
    if (downloadResult.statusCode !== 200 && downloadResult.statusCode !== undefined) {
      throw new Error(`Failed to download image, status code: ${downloadResult.statusCode}`);
    }
    
    // Read the file as base64
    const base64Data = await RNFS.readFile(tempFilePath, 'base64');
    
    // Clean up the temporary file
    await RNFS.unlink(tempFilePath);
    
    return base64Data;
  } catch (error) {
    console.error(`Error processing image from ${imageUrl}:`, error);
    throw error;
  }
};

const AiScreen = ({ navigation }) => {
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
  
  // New states for the listing optimization feature
  const [analysisType, setAnalysisType] = useState('reservation'); // 'reservation' or 'listing'
  const [imagesCarouselVisible, setImagesCarouselVisible] = useState(false);
  
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
    
    // Show images carousel if analysis type is listing
    if (analysisType === 'listing') {
      setImagesCarouselVisible(true);
    }
  };

  // Function to toggle analysis type
  const toggleAnalysisType = (type) => {
    setAnalysisType(type);
    
    // Show images carousel if switching to listing analysis
    if (type === 'listing') {
      setImagesCarouselVisible(true);
    } else {
      setImagesCarouselVisible(false);
    }
  };
  
  // Function to render the images carousel
  const renderImagesCarousel = () => {
    const listing = listings.find(l => l.id === selectedListing);
    if (!listing || !listing.listingImages || listing.listingImages.length === 0) {
      return (
        <View style={styles.noImagesContainer}>
          <Icon name="image-outline" size={40} color={theme.text.secondary} />
          <Text style={[styles.noImagesText, {color: theme.text.secondary}]}>
            No images available for this property
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.carouselContainer}>
        <Text style={[styles.carouselTitle, {color: theme.text.secondary}]}>
          Property Images
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          pagingEnabled
        >
          {listing.listingImages.map((image, index) => (
            <View key={`image-${index}`} style={styles.carouselImageContainer}>
              <Image
                source={{ uri: image.url }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
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
    
    // Calculate metrics from reservation data
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
${listing ? JSON.stringify(listing, null, 2) : 'Property details not available'}

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
      const listing = listings.find(l => l.id === selectedListing);
      
      // Initialize Gemini API
      console.log('Initializing Gemini model with model name: gemini-1.5-flash');
      const genAI = new GoogleGenerativeAI(API_KEY);
      console.log('GoogleGenerativeAI instance created');
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: analysisType === 'listing' 
          ? "You are a luxury property optimization AI that helps owners improve their property listings. You analyze property images and data to provide actionable recommendations for enhancing appeal and bookability."
          : analysisType === 'realestate'
          ? "You are a real estate market analysis AI that provides detailed market insights, trends, and property valuation data. You analyze location data, comparable properties, and neighborhood metrics to deliver comprehensive market intelligence."
          : "You are a luxury property analysis AI that helps owners understand their reservation data and optimize their vacation rental business. You provide insightful, data-driven analysis and actionable recommendations.",
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
      
      let result;
      
      if (analysisType === 'listing') {
        // For listing optimization
        if (!listing.listingImages || listing.listingImages.length === 0) {
          setError('No images available for this listing');
          setLoading(false);
          return;
        }
        
        // Create prompt for listing optimization
        const listingPrompt = `Role: You are an elite short-term rental (STR) strategist specializing in maximizing listing performance through image optimization.
Task: Analyze the provided property images and deliver a highly actionable, guest psychology-driven evaluation.
Focus: Drive improvements in search click-through rate, booking conversion rate, guest emotional engagement, and price justification — without needing property description context.

Structure your analysis under the following clear sections:
🖼️ 1. Hero Image & First Impressions
- Is the hero image immediately compelling and differentiated in the booking platform feed?
- How effectively do the first 3 images capture attention and communicate value?
- Suggestions for improving first impression strength.

🎯 2. Guest Emotional Activation
- How successfully do the images trigger emotional buying drivers (relaxation, family bonding, adventure, luxury, escapism, etc.)?
- Which emotional themes are missing or underutilized?
- Scenes or emotional "moments" that could be added to increase emotional resonance.

📈 3. Booking Conversion Power
- How effectively do the images build guest trust (professionalism, cleanliness, quality)?
- Are there any confusing, low-energy, or underwhelming photo sequences that could lower booking intent?
- Recommendations to strengthen flow and storytelling to push guests toward booking.

🏠 4. Amenity Highlighting & Value Reinforcement
- Are all critical booking decision factors (gathering spaces, views, outdoor areas, entertainment, luxury touches) showcased clearly?
- Which amenities or features need better emphasis?
- Concrete ideas to visually reinforce nightly rate value.

🏆 5. Market Differentiation & Target Guest Alignment
- How well does the property visually differentiate itself from comparable options?
- Is the target guest type (family getaway, large group, romantic retreat, etc.) clear based on the image sequence?
- If unclear, suggest repositioning ideas through imagery.

🧹 6. Missed Opportunities & Gaps
- Key emotional, functional, or visual gaps in the current photo set.
- Prioritized list of missed opportunities ranked by expected impact on booking likelihood.

💡 7. Specific High-ROI Improvements
- Staging, re-shooting, or sequencing actions that would likely produce the highest increase in CTR or booking conversions.
- Specific recommended scenes (e.g., cozy firepit night, group meal setup, lakeside sunrise coffee moment).

🍂 8. Seasonal or Thematic Enhancement Opportunities
- Ideas for future seasonal or themed shoots (summer, fall, winter, spring) to maintain listing freshness and relevance.

PROPERTY DETAILS:
${JSON.stringify(listing, null, 2)}

${userPrompt ? `Additional focus areas: ${userPrompt}` : ''}

Format your analysis with clear section headers and bullet points for maximum clarity and actionability. Focus on the guest perspective and provide specific, implementable recommendations.`;

        try {
          console.log('Preparing images for Gemini analysis...');
          
          // Prepare content parts array with the text prompt as the first item
          const contentParts = [
            { text: listingPrompt }
          ];
          
          // Create image parts from listing image URLs
          // We'll use a maximum of 5 images to avoid exceeding token limits
          const imagesToProcess = Math.min(listing.listingImages.length, 5);
          console.log(`Processing ${imagesToProcess} images for Gemini analysis`);
          
          // Process images in parallel
          const imagePromises = [];
          for (let i = 0; i < imagesToProcess; i++) {
            const imageUrl = listing.listingImages[i].url;
            if (imageUrl) {
              console.log(`Processing image ${i+1}: ${imageUrl}`);
              // Add promise to array
              imagePromises.push(
                fetchImageAsBase64(imageUrl)
                  .then(base64Data => ({
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Data
                    }
                  }))
                  .catch(err => {
                    console.error(`Failed to process image ${i+1}:`, err);
                    return null; // Return null for failed images
                  })
              );
            }
          }
          
          // Wait for all image processing to complete
          const imageResults = await Promise.all(imagePromises);
          
          // Filter out any null results (failed images) and add to content parts
          imageResults.filter(Boolean).forEach(imagePart => {
            contentParts.push(imagePart);
          });
          
          // Count successful images
          const successfulImageCount = contentParts.length - 1;
          console.log(`Successfully processed ${successfulImageCount} images for Gemini analysis`);
          
          // Only proceed with multimodal if we have images
          if (successfulImageCount > 0) {
            console.log('Sending multimodal request to Gemini API with images...');
            result = await model.generateContent(contentParts);
          } else {
            // Fallback to text-only if no images were successfully processed
            console.log('No images were successfully processed. Falling back to text-only analysis.');
            
            // Update prompt to mention image processing failure
            const fallbackPrompt = `${listingPrompt}\n\nNote: The system attempted to analyze images but couldn't process them successfully. This analysis is based solely on the property details provided.`;
            
            result = await model.generateContent(fallbackPrompt);
          }
          
        } catch (error) {
          console.error("Error processing images for Gemini:", error);
          
          // Create a more descriptive error message for debugging
          const errorDetails = error.toString();
          const isImageFormatError = errorDetails.includes('image is not valid') || 
                                    errorDetails.includes('400') || 
                                    errorDetails.includes('Invalid argument');
          
          if (isImageFormatError) {
            console.log('Gemini rejected the image format. Falling back to text-only analysis.');
            
            // Fallback prompt mentioning the image issue
            const fallbackPrompt = `${listingPrompt}\n\nNote: The system attempted to analyze images but Gemini rejected the image format. This analysis is based solely on the property details provided.`;
            
            // Try again with text-only
            result = await model.generateContent(fallbackPrompt);
          } else {
            // For other errors, rethrow to be handled by the outer try-catch
            throw error;
          }
        }
      } else if (analysisType === 'realestate') {
        // For real estate market analysis
        if (!listing || !listing.address) {
          setError('No address available for this property');
          setLoading(false);
          return;
        }
        
        // Create prompt for real estate market analysis
        const realEstatePrompt = `
        Role: You are a real estate investment and short-term rental (STR) strategy expert with access to market data.
        
        Task: Analyze the property below as both a real estate investment and a vacation rental opportunity.
        
        Property Details:
        ${JSON.stringify({
          // Include all available listing details
          address: listing.address || 'Address not provided',
          city: listing.city || (listing.address ? listing.address.split(',')[1]?.trim() : ''),
          state: listing.state || (listing.address ? listing.address.split(',')[2]?.trim().split(' ')[0] : ''),
          zip: listing.zipCode || (listing.address ? listing.address.match(/\d{5}(?:-\d{4})?/) : ''),
          bedrooms: listing.bedrooms || 'Not specified',
          bathrooms: listing.bathrooms || 'Not specified',
          propertyType: listing.propertyType || 'Vacation Rental',
          squareFeet: listing.squareFeet || listing.square_feet || listing.area || 'Not specified',
          yearBuilt: listing.yearBuilt || listing.year_built || 'Not specified',
          propertyFeatures: listing.features || listing.amenities || [],
          maxGuests: listing.maxGuests || listing.maxOccupancy || listing.sleeps || 'Not specified',
          beds: listing.beds || listing.bedCount || 'Not specified',
          pricing: listing.pricing || listing.baseRate || listing.averagePrice || 'Not specified',
          neighborhood: listing.neighborhood || 'Not specified',
          latitude: listing.latitude || (listing.location ? listing.location.lat : null) || 'Not specified',
          longitude: listing.longitude || (listing.location ? listing.location.lng : null) || 'Not specified',
          name: listing.name || 'Not specified',
          description: listing.description ? listing.description.substring(0, 300) + '...' : 'Not provided',
        }, null, 2)}
        
        Please structure your analysis in two parts:
        
        🏡 Part 1: General Real Estate Analysis
        • Neighborhood and surrounding area analysis (perceived desirability, safety, demand drivers)
        • Estimated real estate value trends for this location (appreciating, stable, or declining)
        • Suitability of this property size (${listing.bedrooms || '?'} bed/${listing.bathrooms || '?'} bath) for the local market
        • Property value indicators for similar properties in the area
        • Long-term investment potential (traditional rental, appreciation)
        
        🏖️ Part 2: Short-Term Rental (STR) Opportunity Analysis
        • Likely guest profile based on property size (${listing.bedrooms || '?'} bed/${listing.bathrooms || '?'} bath) and location
        • Estimated STR demand patterns (seasonality vs year-round potential)
        • Key advantages this property offers as a vacation rental
        • Potential challenges or risks (regulations, competition, market saturation)
        • Recommendations to maximize STR revenue (pricing strategy, amenity additions, positioning)
        • Performance optimization suggestions (guest experience, listing improvements)
        
        ${userPrompt ? `Additional areas of interest: ${userPrompt}` : ''}
        
        Important notes:
        • If you don't have specific data for certain aspects, provide general insights based on similar markets or properties
        • Focus on practical, revenue-driven analysis rather than theoretical observations
        • If exact STR regulations aren't known, provide typical regulatory considerations for similar areas
        
        Format your analysis with clear headings and bullet points for readability.`;
        
        console.log('Sending comprehensive real estate and STR investment analysis request to Gemini API...');
        result = await model.generateContent(realEstatePrompt);
      } else {
        // For reservation analysis, use existing implementation
        const reservations = await fetchReservations(selectedListing);
        
        if (!reservations || reservations.length === 0) {
          setError('No reservation data available for this listing');
          setLoading(false);
          return;
        }
        
        console.log(`Fetched ${reservations.length} reservations for analysis`);
        
        // Generate prompt with listing, reservations and user input
        const prompt = generatePrompt(selectedListing, reservations, userPrompt);
        
        // Log full prompt for debugging
        console.log('========== FULL PROMPT SENT TO GEMINI ==========');
        console.log(prompt);
        console.log('===============================================');
        
        console.log('Sending request to Gemini API...');
        result = await model.generateContent(prompt);
      }
      
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
  
  // NEW REPORT DISPLAY CODE
  // Create a completely redesigned report view
  const renderNewReport = (text) => {
    if (!text) return null;
    
    try {
      // Process the text to extract sections and content
      const sections = [];
      let currentSection = null;
      let currentContent = [];
      
      // Split text into lines for processing
      const lines = text.split('\n');
      
      // Process each line
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (trimmedLine === '') {
          return;
        }
        
        // Check if this line is a section header (uses emoji, numbers, or all caps words as indicators)
        // Updated regex to detect section headers including with ** markers
        const isSectionHeader = /^[🖼️📈🎯🏠🏆🧹💡🍂]?\s*\d*\.?\s*[A-Z][A-Za-z\s&\-]+(:)?/m.test(trimmedLine) || 
                               /^(Summary|Key Insights|Recommendations|Analysis|Suggestions|Conclusion)/i.test(trimmedLine) ||
                               /^\*\*.*\*\*$/.test(trimmedLine); // Match lines surrounded by **
        
        if (isSectionHeader) {
          // Save previous section if it exists
          if (currentSection && currentContent.length > 0) {
            sections.push({
              title: currentSection,
              content: [...currentContent]
            });
          }
          
          // Clean up title: remove ** markers, numbers, emoji, etc.
          let cleanedTitle = trimmedLine
            .replace(/^\*\*|\*\*$/g, '') // Remove ** at start/end
            .replace(/^[🖼️📈🎯🏠🏆🧹💡🍂]\s*/, '') // Remove emoji
            .replace(/^\d+\.\s*/, '') // Remove numbering
            .replace(/:$/, ''); // Remove trailing colon
            
          // Start new section
          currentSection = cleanedTitle;
          currentContent = [];
        } else if (currentSection) {
          // Clean up content lines - remove ** markers if present
          currentContent.push(trimmedLine.replace(/\*\*/g, ''));
        }
      });
      
      // Add final section
      if (currentSection && currentContent.length > 0) {
        sections.push({
          title: currentSection,
          content: [...currentContent]
        });
      }
      
      // If no sections were found, create a single section with the entire text
      if (sections.length === 0) {
        sections.push({
          title: 'Analysis',
          content: lines.filter(line => line.trim() !== '')
        });
      }
      
      // Extract key metrics if any
      const keyMetrics = extractMetricsFromText(text);
      
      return (
        <View style={newStyles.reportContainer}>
          {/* Metrics summary */}
          {keyMetrics && renderNewMetricsView(keyMetrics)}
          
          {/* Content sections */}
          {sections.map((section, index) => (
            <View key={`section-${index}`} style={newStyles.sectionCard}>
              <Text style={newStyles.sectionTitle}>{section.title}</Text>
              <View style={newStyles.sectionContent}>
                {processContentForDisplay(section.content)}
              </View>
            </View>
          ))}
        </View>
      );
    } catch (error) {
      console.error('Error rendering report:', error);
      // Fallback to simple text display
      return (
        <View style={newStyles.reportContainer}>
          <View style={newStyles.sectionCard}>
            <Text style={newStyles.sectionTitle}>Analysis</Text>
            <Text style={newStyles.paragraph}>{text}</Text>
          </View>
        </View>
      );
    }
  };
  
  // Process content for better display
  const processContentForDisplay = (contentLines) => {
    // Organize content into blocks (paragraphs, lists, etc.)
    const contentBlocks = [];
    let currentBlock = { type: 'paragraph', content: [] };
    
    contentLines.forEach(line => {
      // Clean up line, remove ** markers
      let cleanedLine = line.replace(/\*\*/g, '');
      
      // Check if line is a bullet point
      if (cleanedLine.startsWith('- ') || cleanedLine.startsWith('* ') || cleanedLine.startsWith('• ')) {
        // If we were building a different type of block, save it and start a new bullet list
        if (currentBlock.type !== 'bullet' && currentBlock.content.length > 0) {
          contentBlocks.push({...currentBlock});
          currentBlock = { type: 'bullet', content: [] };
        } else if (currentBlock.type !== 'bullet') {
          currentBlock.type = 'bullet';
        }
        
        // Add bullet content without the marker
        currentBlock.content.push(cleanedLine.replace(/^[\s-*•]+/, '').trim());
      }
      // Check if line is a numbered point
      else if (cleanedLine.match(/^\d+\.\s/)) {
        if (currentBlock.type !== 'numbered' && currentBlock.content.length > 0) {
          contentBlocks.push({...currentBlock});
          currentBlock = { type: 'numbered', content: [] };
        } else if (currentBlock.type !== 'numbered') {
          currentBlock.type = 'numbered';
        }
        
        // Save the number and content
        const match = cleanedLine.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          currentBlock.content.push({
            number: match[1],
            text: match[2]
          });
        }
      }
      // Check if it could be a subheading (ends with a colon)
      else if (cleanedLine.endsWith(':') && cleanedLine.length < 50) {
        if (currentBlock.content.length > 0) {
          contentBlocks.push({...currentBlock});
        }
        contentBlocks.push({ type: 'subheading', content: [cleanedLine] });
        currentBlock = { type: 'paragraph', content: [] };
      }
      // Otherwise, treat as paragraph text
      else {
        if (currentBlock.type !== 'paragraph' && currentBlock.content.length > 0) {
          contentBlocks.push({...currentBlock});
          currentBlock = { type: 'paragraph', content: [] };
        }
        currentBlock.content.push(cleanedLine);
      }
    });
    
    // Add the last block if not empty
    if (currentBlock.content.length > 0) {
      contentBlocks.push({...currentBlock});
    }
    
    // Render the content blocks
    return contentBlocks.map((block, index) => {
      switch (block.type) {
        case 'bullet':
          return (
            <View key={`block-${index}`} style={newStyles.bulletList}>
              {block.content.map((item, i) => (
                <View key={`bullet-${i}`} style={newStyles.bulletItem}>
                  <View style={newStyles.bulletPoint} />
                  <Text style={newStyles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
          
        case 'numbered':
          return (
            <View key={`block-${index}`} style={newStyles.numberedList}>
              {block.content.map((item, i) => (
                <View key={`numbered-${i}`} style={newStyles.numberedItem}>
                  <View style={newStyles.numberCircle}>
                    <Text style={newStyles.numberText}>{item.number}</Text>
                  </View>
                  <Text style={newStyles.numberedItemText}>{item.text}</Text>
                </View>
              ))}
            </View>
          );
          
        case 'subheading':
          return (
            <Text key={`block-${index}`} style={newStyles.subheading}>
              {block.content[0]}
            </Text>
          );
          
        case 'paragraph':
        default:
          return (
            <View key={`block-${index}`} style={newStyles.paragraphBlock}>
              {block.content.map((line, i) => (
                <Text key={`line-${i}`} style={newStyles.paragraph}>{line}</Text>
              ))}
            </View>
          );
      }
    });
  };
  
  // Helper to extract metrics from the text for visualization
  const extractMetricsFromText = (text) => {
    let metrics = {};
    
    // Check for total revenue
    const revenueMatch = text.match(/\$([0-9,]+(\.\d+)?)\s+(in total revenue|revenue|in bookings|total bookings value)/i);
    if (revenueMatch) {
      metrics.revenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
    }
    
    // Check for occupancy rate
    const occupancyMatch = text.match(/(\d+)%\s+occupancy/i) || text.match(/occupancy rate of (\d+)%/i);
    if (occupancyMatch) {
      metrics.occupancy = parseInt(occupancyMatch[1]);
    }
    
    // Check for average nightly rate
    const rateMatch = text.match(/\$([0-9,]+(\.\d+)?)\s+per night/i) || 
                      text.match(/average( nightly)? rate of \$([0-9,]+(\.\d+)?)/i);
    if (rateMatch) {
      metrics.nightlyRate = parseFloat((rateMatch[2] || rateMatch[1]).replace(/,/g, ''));
    }
    
    // Check for number of bookings
    const bookingsMatch = text.match(/(\d+)\s+bookings/i) || text.match(/total of (\d+) (reservations|bookings)/i);
    if (bookingsMatch) {
      metrics.bookings = parseInt(bookingsMatch[1]);
    }
    
    // Check for average rating
    const ratingMatch = text.match(/(\d+(\.\d+)?)\s*\/\s*5 rating/i) || text.match(/average rating of (\d+(\.\d+)?)/i);
    if (ratingMatch) {
      metrics.rating = parseFloat(ratingMatch[1]);
    }
    
    return Object.keys(metrics).length > 0 ? metrics : null;
  };
  
  // Render modern metrics view
  const renderNewMetricsView = (metrics) => {
    return (
      <View style={newStyles.metricsCard}>
        <Text style={newStyles.metricsTitle}>Key Performance</Text>
        
        <View style={newStyles.metricsGrid}>
          {metrics.revenue && (
            <View style={newStyles.metricItem}>
              <Icon name="cash-outline" size={20} color={GOLD.primary} />
              <Text style={newStyles.metricValue}>${metrics.revenue.toLocaleString()}</Text>
              <Text style={newStyles.metricLabel}>Revenue</Text>
            </View>
          )}
          
          {metrics.occupancy && (
            <View style={newStyles.metricItem}>
              <Icon name="calendar-outline" size={20} color={GOLD.primary} />
              <Text style={newStyles.metricValue}>{metrics.occupancy}%</Text>
              <Text style={newStyles.metricLabel}>Occupancy</Text>
            </View>
          )}
          
          {metrics.nightlyRate && (
            <View style={newStyles.metricItem}>
              <Icon name="pricetag-outline" size={20} color={GOLD.primary} />
              <Text style={newStyles.metricValue}>${metrics.nightlyRate}</Text>
              <Text style={newStyles.metricLabel}>Nightly Rate</Text>
            </View>
          )}
          
          {metrics.bookings && (
            <View style={newStyles.metricItem}>
              <Icon name="people-outline" size={20} color={GOLD.primary} />
              <Text style={newStyles.metricValue}>{metrics.bookings}</Text>
              <Text style={newStyles.metricLabel}>Bookings</Text>
            </View>
          )}
          
          {metrics.rating && (
            <View style={newStyles.metricItem}>
              <Icon name="star-outline" size={20} color={GOLD.primary} />
              <Text style={newStyles.metricValue}>{metrics.rating.toFixed(1)}</Text>
              <Text style={newStyles.metricLabel}>Rating</Text>
            </View>
          )}
        </View>
      </View>
    );
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
            {/* Analysis Type Toggle */}
            <View style={[styles.analysisTypeContainer, {
              marginBottom: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
            }]}>
              <TouchableOpacity
                style={[
                  styles.analysisTypeButton,
                  analysisType === 'reservation' && styles.analysisTypeButtonActive,
                  { 
                    backgroundColor: analysisType === 'reservation' ? GOLD.light : theme.surface,
                    height: 32, // Reduced height
                    paddingHorizontal: 6, // Even smaller padding
                    width: '31%', // Fixed width percentage
                    marginRight: 4,
                  }
                ]}
                onPress={() => toggleAnalysisType('reservation')}
              >
                <Icon 
                  name="analytics-outline" 
                  size={12} // Smaller icon
                  color={analysisType === 'reservation' ? GOLD.primary : theme.text.secondary} 
                />
                <Text 
                  style={[
                    styles.analysisTypeText,
                    { 
                      color: analysisType === 'reservation' ? GOLD.primary : theme.text.secondary,
                      fontWeight: analysisType === 'reservation' ? '600' : '400',
                      fontSize: 11, // Even smaller text
                      marginLeft: 3, // Less spacing
                    }
                  ]}
                >
                  Reservations
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.analysisTypeButton,
                  analysisType === 'listing' && styles.analysisTypeButtonActive,
                  { 
                    backgroundColor: analysisType === 'listing' ? GOLD.light : theme.surface,
                    height: 32, // Reduced height
                    paddingHorizontal: 6, // Even smaller padding
                    width: '28%', // Fixed width percentage
                    marginRight: 4,
                  }
                ]}
                onPress={() => toggleAnalysisType('listing')}
              >
                <Icon 
                  name="image-outline" 
                  size={12} // Smaller icon
                  color={analysisType === 'listing' ? GOLD.primary : theme.text.secondary} 
                />
                <Text 
                  style={[
                    styles.analysisTypeText,
                    { 
                      color: analysisType === 'listing' ? GOLD.primary : theme.text.secondary,
                      fontWeight: analysisType === 'listing' ? '600' : '400',
                      fontSize: 11, // Even smaller text
                      marginLeft: 3, // Less spacing
                    }
                  ]}
                >
                  Listing
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.analysisTypeButton,
                  analysisType === 'realestate' && styles.analysisTypeButtonActive,
                  { 
                    backgroundColor: analysisType === 'realestate' ? GOLD.light : theme.surface,
                    height: 32, // Reduced height
                    paddingHorizontal: 6, // Even smaller padding
                    width: '35%', // Fixed width percentage - larger for "Real Estate"
                  }
                ]}
                onPress={() => toggleAnalysisType('realestate')}
              >
                <Icon 
                  name="home-outline" 
                  size={12} // Smaller icon
                  color={analysisType === 'realestate' ? GOLD.primary : theme.text.secondary} 
                />
                <Text 
                  style={[
                    styles.analysisTypeText,
                    { 
                      color: analysisType === 'realestate' ? GOLD.primary : theme.text.secondary,
                      fontWeight: analysisType === 'realestate' ? '600' : '400',
                      fontSize: 11, // Even smaller text
                      marginLeft: 3, // Less spacing
                    }
                  ]}
                >
                  Real Estate
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputRow, {marginBottom: 10}]}>
              <Text style={[styles.sectionLabel, {
                color: theme.text.secondary,
                fontSize: 12, // Smaller label
                marginBottom: 4, // Less bottom margin
              }]}>Property</Text>
              
              <TouchableOpacity 
                style={[styles.propertySelector, {
                  backgroundColor: theme.surface,
                  borderColor: GOLD.light,
                  height: 36, // Further reduced height
                  paddingHorizontal: 12, // Smaller horizontal padding
                }]} 
                onPress={() => setShowPropertyPicker(true)}
              >
                <Text style={[styles.selectorText, {
                  color: theme.text.primary,
                  fontSize: 13, // Even smaller font size
                }]}>
                  {selectedListingName}
                </Text>
                <Icon name="chevron-down" size={12} color={GOLD.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Image Carousel for Listing Optimization */}
            {analysisType === 'listing' && imagesCarouselVisible && renderImagesCarousel()}
            
            <View style={styles.promptContainer}>
              <Text style={[styles.sectionLabel, {
                color: theme.text.secondary,
                fontSize: 13, // Smaller label
                marginBottom: 6, // Reduced bottom margin
              }]}>
                {analysisType === 'listing' 
                  ? 'Specific areas to focus on (optional)'
                  : analysisType === 'realestate'
                  ? 'Specific market details to analyze (optional)'
                  : 'Additional analysis (optional)'}
              </Text>
              
              <TextInput
                style={[
                  styles.promptInput, 
                  {
                    backgroundColor: theme.surface, 
                    color: theme.text.primary,
                    borderColor: 'rgba(0,0,0,0.05)',
                    minHeight: 70, // Reduced height
                    paddingVertical: 10, // Smaller padding
                    paddingHorizontal: 14, // Smaller padding
                    fontSize: 14, // Smaller font
                  }
                ]}
                placeholder={analysisType === 'listing' 
                  ? "e.g., Focus on bedroom staging, exterior appeal"
                  : analysisType === 'realestate'
                  ? "e.g., Analyze market trends, local amenities"
                  : "e.g., Analyze weekend vs weekday performance"}
                placeholderTextColor={theme.text.placeholder}
                value={userPrompt}
                onChangeText={setUserPrompt}
                multiline
              />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.runButton, {
                  height: 34, // Even smaller height
                  borderRadius: 17,
                  marginBottom: 5,
                }]}
                onPress={generateAIReport}
                disabled={loading || !selectedListing}
              >
                <View style={[styles.buttonGradient, {
                  backgroundColor: GOLD.primary,
                  paddingVertical: 8, // Smaller vertical padding
                  paddingHorizontal: 16, // Smaller horizontal padding
                }]}>
                  <Text style={[styles.smallerButtonText, {fontSize: 13}]}>
                    {loading ? 'Generating...' : analysisType === 'listing' 
                      ? 'Generate Optimization' 
                      : analysisType === 'realestate'
                      ? 'Generate Market Analysis'
                      : 'Generate Report'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {reportData && (
                <TouchableOpacity
                  style={[styles.hideButton, {
                    paddingVertical: 6, // Smaller padding
                    paddingHorizontal: 12,
                  }]}
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={[styles.hideButtonText, {fontSize: 12}]}>Hide Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        {/* Results Section - REDESIGNED */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GOLD.primary} />
            <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
              {analysisType === 'listing' 
                ? 'Processing images and analyzing listing data...' 
                : analysisType === 'realestate'
                ? 'Analyzing market data and generating insights...'
                : 'Analyzing property data and generating insights...'}
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
                style={newStyles.filterToggle}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Icon name="options-outline" size={16} color={GOLD.primary} />
                <Text style={newStyles.filterToggleText}>Adjust Analysis</Text>
              </TouchableOpacity>
            )}
            <ScrollView 
              style={newStyles.reportScrollView}
              contentContainerStyle={newStyles.reportScrollContent}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              {renderNewReport(reportData)}
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

// Add the new styles for the redesigned report
const newStyles = StyleSheet.create({
  // Report container and structure
  reportContainer: {
    paddingTop: 8,
  },
  reportScrollView: {
    flex: 1,
  },
  reportScrollContent: {
    paddingBottom: 30,
  },
  
  // Filter toggle
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 10,
    backgroundColor: 'rgba(182, 148, 76, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182, 148, 76, 0.3)',
  },
  filterToggleText: {
    fontSize: 13,
    marginLeft: 8,
    color: GOLD.primary,
    fontWeight: '500',
  },
  
  // Section cards
  sectionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700', // Make bolder
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 8,
  },
  sectionContent: {
    paddingTop: 4,
  },
  
  // Metrics card
  metricsCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: GOLD.primary,
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GOLD.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
  
  // Content elements
  paragraphBlock: {
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    marginBottom: 8,
  },
  bulletList: {
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD.primary,
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  numberedList: {
    marginBottom: 16,
  },
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  numberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  numberedItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
});

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
    height: 55,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  promptContainer: {
    marginBottom: 22,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 95,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  runButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: GOLD.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    marginTop: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  // Filter toggle
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(182, 148, 76, 0.08)',
    borderRadius: 25,
    alignSelf: 'center',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: GOLD.primary,
    marginLeft: 8,
    letterSpacing: 0.2,
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
    paddingHorizontal: 5,
    paddingBottom: 30,
  },
  
  // Metrics Card
  metricsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  metricsTitle: {
    color: GOLD.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
    letterSpacing: 0.3,
  },
  metricsContent: {
    padding: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  metricBox: {
    alignItems: 'center',
    padding: 12,
    minWidth: width / 3,
  },
  metricIcon: {
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginVertical: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: GOLD.primary,
    borderRadius: 3,
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
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
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GOLD.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  premiumSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    letterSpacing: 0.3,
  },
  premiumSectionContent: {
    paddingHorizontal: 18,
    paddingTop: 5,
  },
  
  // Content Elements
  premiumSubheadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  subheadingAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  premiumSubheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    letterSpacing: 0.2,
  },
  premiumParagraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    color: '#333',
    letterSpacing: 0.2,
  },
  premiumBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingLeft: 4,
  },
  highlightedBulletItem: {
    backgroundColor: 'rgba(182, 148, 76, 0.07)',
    padding: 14,
    paddingLeft: 12,
    borderRadius: 10,
    marginHorizontal: -8,
    marginVertical: 6,
  },
  premiumBulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: 12,
    backgroundColor: GOLD.primary,
  },
  highlightedBulletPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    backgroundColor: GOLD.primary,
  },
  premiumBulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    letterSpacing: 0.2,
  },
  highlightedBulletText: {
    fontWeight: '600',
  },
  premiumMetricText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 24,
  },
  premiumNumberedItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  numberBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  premiumNumberedText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  premiumLineSpacing: {
    height: 12,
  },
  
  // Additional styles
  introSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  introParagraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 18,
  },
  sectionEmoji: {
    fontSize: 22,
  },
  bulletListContainer: {
    marginBottom: 18,
  },
  numberedListContainer: {
    marginBottom: 18,
  },
  paragraphContainer: {
    marginBottom: 14,
  },
  // Analysis Type Toggle
  analysisTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  analysisTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  analysisTypeButtonActive: {
    borderWidth: 1,
    borderColor: GOLD.primary,
  },
  analysisTypeText: {
    marginLeft: 6,
  },
  // Carousel styles
  carouselContainer: {
    marginBottom: 16,
  },
  carouselTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  carouselContent: {
    paddingHorizontal: 4,
  },
  carouselImageContainer: {
    width: width * 0.3,
    height: width * 0.2,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  noImagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  noImagesText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Smaller button styles
  smallerButton: {
    width: '65%',
    height: 40,
    borderRadius: 20,
  },
  smallerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  hideButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  hideButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});

export default AiScreen;
