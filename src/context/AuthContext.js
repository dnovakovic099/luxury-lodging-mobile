import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import {authenticateUser, fetchListings, getReservationsWithFinancialData} from '../services/api';
import * as Keychain from 'react-native-keychain';
import {jwtDecode} from 'jwt-decode';

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
  const [reservations, setReservations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Use refs to track what data we've loaded to prevent re-renders
  const authInitialized = useRef(false);
  const loadedListingsRef = useRef(false);
  const loadedReservationsRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastReservationFetchTime = useRef(0);
  const reservationFetchInProgress = useRef(false);

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

  // Load reservations when listings change
  useEffect(() => {
    // Only load reservations when listings are available
    const fetchReservationsData = async () => {
      if (reservationFetchInProgress.current || !listings || listings.length === 0) {
        return;
      }
      
      reservationFetchInProgress.current = true;
      setIsLoading(true);
      
      try {
        const today = new Date();
        const sixMonthsFromNow = new Date(today);
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        const todayStr = formatDate(today);
        const futureDateStr = formatDate(sixMonthsFromNow);
        
        // Get all listing IDs
        const listingIds = listings.map(listing => listing.id);
        const params = {
          listingMapIds: listingIds,
          fromDate: todayStr,
          toDate: futureDateStr,
          dateType: 'arrivalDate',
          status: 'confirmed',
          limit: 10000  // Explicitly set a high limit
        };
        
        console.log(`AuthContext: Fetching reservations with params:`, JSON.stringify(params));
        const result = await getReservationsWithFinancialData(params);
        
        console.log(`AuthContext: Reservations returned: ${result?.reservations?.length || 0}`);
        
        // Set the reservations directly from the result
        if (result?.reservations && Array.isArray(result.reservations)) {
          setReservations(result.reservations);
        } else {
          setReservations([]);
        }
      } catch (error) {
        console.error('Error fetching reservations in AuthContext:', error);
        setErrorMessage('Failed to load reservations');
        setReservations([]);
        loadedReservationsRef.current = false;
      } finally {
        setIsLoading(false);
        reservationFetchInProgress.current = false;
      }
    };
    
    fetchReservationsData();
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
      loadedReservationsRef.current = false;
      
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
      
      // After listings are set, the listings useEffect will trigger and load reservations
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
      setReservations(null);
      
      // Reset all reference flags so data will be fetched after next login
      loadedListingsRef.current = false;
      loadedReservationsRef.current = false;
      isLoadingRef.current = false;
      lastReservationFetchTime.current = 0;
      reservationFetchInProgress.current = false;
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

  return (
    <AuthContext.Provider value={{
      userData,
      listings,
      reservations,
      signIn,
      signOut,
      getToken,
      checkToken,
      removeToken,
      isLoading,
      errorMessage,
      refreshData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
