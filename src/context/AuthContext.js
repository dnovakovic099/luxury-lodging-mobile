import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import {authenticateUser, fetchListings, getReservationsWithFinancialData} from '../services/api';
import * as Keychain from 'react-native-keychain';
import {jwtDecode} from 'jwt-decode';
import NotificationService from '../services/NotificationService';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [listings, setListings] = useState(null);
  const [upcomingReservations, setUpcomingReservations] = useState(null);
  const [upcomingReservationsLoading, setUpcomingReservationsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Use refs to track what data we've loaded to prevent re-renders
  const authInitialized = useRef(false);
  const loadedListingsRef = useRef(false);
  const isLoadingRef = useRef(false);
  const upcomingReservationsFetchInProgress = useRef(false);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Initialize auth state once
  useEffect(() => {
    if (authInitialized.current) return;

    const initializeAuth = async () => {
      authInitialized.current = true;
      try {
        setIsLoading(true);
        const token = await getToken();
        
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        try {
          const decodedToken = decodeToken(token);
          if (decodedToken?.userId) {
            setUserData(decodedToken);
          } else {
            await removeToken();
          }
        } catch (error) {
          await removeToken();
        }
      } catch (error) {
        // Error handling
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Load user data when first mounted or auth state changes
  useEffect(() => {
    // Load listings when user data is available
    const fetchData = async () => {
      if (!userData?.userId) return;
      if (loadedListingsRef.current) return;
      
      loadedListingsRef.current = true;
      setIsLoading(true);
      try {
        const listingsData = await fetchListings(userData.haUserId);
        
        let listingsArray = [];
        if (listingsData?.result?.listings) {
          listingsArray = listingsData.result.listings;
        } else if (Array.isArray(listingsData?.result)) {
          listingsArray = listingsData.result;
        } else if (Array.isArray(listingsData)) {
          listingsArray = listingsData;
        }
        
        setListings(listingsArray);
      } catch (error) {
        setErrorMessage('Failed to load properties');
        loadedListingsRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [userData]);

  // Fetch only upcoming reservations (limit 3) for quick display on HomeScreen
  const fetchUpcomingReservations = async () => {
    if (upcomingReservationsFetchInProgress.current || !listings || listings.length === 0) {
      if (upcomingReservationsLoading) setUpcomingReservationsLoading(false);
      return;
    }
    
    upcomingReservationsFetchInProgress.current = true;
    setUpcomingReservationsLoading(true);
    
    try {
      // Format dates for API - yesterday and 60 days from today
      const today = new Date();
      
      // Set hours to beginning of day to avoid timezone issues
      today.setHours(0, 0, 0, 0);
      
      // Create yesterday date that's exactly 1 full day before today
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1); // Subtract 1 day to include today's reservations
      
      const sixtyDaysFromNow = new Date(today);
      sixtyDaysFromNow.setDate(today.getDate() + 60);
      
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Revert to using yesterday's date
      const fromDateStr = formatDate(yesterday);
      const toDateStr = formatDate(sixtyDaysFromNow);
      
      // Get all listing IDs for API calls
      const listingIds = listings.map(listing => parseInt(listing.id)).filter(id => !isNaN(id));
      
      // Create array of fetch promises for each listing
      const fetchPromises = listingIds.map(listingId => {
        const params = {
          listingId: listingId,
          fromDate: fromDateStr,
          toDate: toDateStr,
          dateType: 'arrivalDate',
          statuses: ['confirmed', 'new', 'modified'],
          includeOwnerStays: true,
          sortBy: 'arrivalDate',
          sortDirection: 'asc',
          limit: 1 // We only need the next upcoming reservation per listing
        };
        
        return getReservationsWithFinancialData(params)
          .then(result => {
            if (result?.reservations && Array.isArray(result.reservations) && result.reservations.length > 0) {
              return result.reservations;
            }
            return [];
          })
          .catch(error => {
            console.error(`Error fetching for listing ${listingId}:`, error);
            return [];
          });
      });
      
      // Wait for all requests to complete in parallel
      const resultsArray = await Promise.all(fetchPromises);
      
      // Flatten the array of arrays
      let allUpcomingReservations = resultsArray.flat();
      
      // Filter reservations by valid status
      allUpcomingReservations = allUpcomingReservations.filter(res => {
        const status = res?.status?.toLowerCase() || '';
        // Only include reservations with confirmed, new, or modified status
        return (status === 'confirmed' || status === 'new' || status === 'modified');
      });
      
      // Process the reservations to add listing names if missing
      allUpcomingReservations = allUpcomingReservations.map(res => {
        const listingId = res.listingId || res.listingMapId;
        const currentListing = listings.find(l => parseInt(l.id) === parseInt(listingId));
        const listingName = currentListing?.name || 'Unknown Property';
        
        // Extract and normalize financial data
        const ownerPayout = parseFloat(
          res.ownerPayout || 
          res.hostPayout || 
          res.airbnbExpectedPayoutAmount || 
          res.financialData?.ownerPayout || 
          res.financialData?.hostPayout || 
          0
        );
        
        return {
          ...res,
          listingId: listingId,
          listingMapId: listingId,
          listingName: res.listingName || listingName,
          property: res.property || { name: listingName },
          // Ensure financial data is always present and normalized
          ownerPayout: ownerPayout,
          hostPayout: parseFloat(res.hostPayout || 0),
          airbnbExpectedPayoutAmount: parseFloat(res.airbnbExpectedPayoutAmount || 0)
        };
      });
      
      // Filter to get only upcoming reservations
      const today2 = new Date();
      today2.setHours(0, 0, 0, 0); // Reset to beginning of day
      
      // Take only first 3
      const finalReservations = allUpcomingReservations.slice(0, 3);
      
      setUpcomingReservations(finalReservations);
    } catch (error) {
      console.error('Error fetching upcoming reservations:', error);
      setUpcomingReservations([]);
    } finally {
      upcomingReservationsFetchInProgress.current = false;
      setUpcomingReservationsLoading(false);
    }
  };
  
  // Load upcoming reservations when listings change
  useEffect(() => {
    if (listings && listings.length > 0) {
      fetchUpcomingReservations();
    }
  }, [listings]);

  // Refresh data function
  const refreshData = async () => {
    if (isLoading || !userData?.userId) {
      return false;
    }
    
    // Prevent multiple concurrent refreshes
    if (isLoadingRef.current) {
      return false;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      // Reset loaded flags to force a refetch
      loadedListingsRef.current = false;
      
      // Load listings
      const listingsData = await fetchListings(userData.haUserId);
      
      let listingsArray = [];
      if (listingsData?.result?.listings) {
        listingsArray = listingsData.result.listings;
      } else if (Array.isArray(listingsData?.result)) {
        listingsArray = listingsData.result;
      } else if (Array.isArray(listingsData)) {
        listingsArray = listingsData;
      }
      
      setListings(listingsArray);
      
      // Explicitly fetch upcoming reservations
      await fetchUpcomingReservations();
      
      return true;
    } catch (error) {
      setErrorMessage('Failed to refresh data');
      return false;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const signIn = async ({email, password}) => {
    setIsLoading(true);
    try {
      const user = await authenticateUser(email, password, setErrorMessage);
      if (user?.accessToken) {
        await storeToken(user.accessToken);
        const decodedToken = decodeToken(user.accessToken);
        setUserData(decodedToken);
        return true;
      }
      return false;
    } catch (error) {
      setErrorMessage(error.message || 'Sign in failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await removeToken();
      // Reset state
      setUserData(null);
      setListings(null);
      setUpcomingReservations(null);
      
      // Reset all reference flags so data will be fetched after next login
      loadedListingsRef.current = false;
      isLoadingRef.current = false;
      authInitialized.current = false;
      
      return true;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkToken = async () => {
    // Prevent duplicate check if already loading
    if (isLoadingRef.current) {
      return false;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    
    try {
      const token = await getToken();
      
      if (!token) {
        return false;
      }
      
      const decodedToken = decodeToken(token);
      if (decodedToken?.userId) {
        setUserData(decodedToken);
        return true;
      }
      
      await removeToken();
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const decodeToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded;
    } catch (error) {
      return null;
    }
  };

  const storeToken = async (token) => {
    try {
      await Keychain.setGenericPassword('authToken', token);
      return true;
    } catch (error) {
      return false;
    }
  };

  const getToken = async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      return credentials ? credentials.password : null;
    } catch (error) {
      return null;
    }
  };

  const removeToken = async () => {
    try {
      await Keychain.resetGenericPassword();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Send FCM token to server after user signs in
  useEffect(() => {
    console.log('[AuthContext] FCM useEffect triggered', {
      userData,
      userId: userData?.userId
    });
    if (userData && userData.userId) {
      const sendFcmToken = async () => {
        try {
          const notificationService = NotificationService.getInstance();
          // Request notification permission first
          const hasPermission = await notificationService.requestPermission();
          console.log('[AuthContext] Notification permission status:', hasPermission);
          
          if (hasPermission) {
            const userId = userData.userId;
            const token = await notificationService.getFCMToken(userId);
            if (token) {
              await notificationService.sendTokenToServer(token, userId);
            }
          } else {
            console.warn('[AuthContext] Notification permission not granted');
          }
        } catch (error) {
          console.error('[AuthContext] Error sending FCM token after sign-in:', error);
        }
      };
      sendFcmToken();
    }
  }, [userData]);

  return (
    <AuthContext.Provider value={{
      userData,
      listings,
      upcomingReservations,
      signIn,
      signOut,
      getToken,
      checkToken,
      removeToken,
      isLoading,
      errorMessage,
      refreshData,
      fetchUpcomingReservations,
      upcomingReservationsLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
