import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import {authenticateUser, fetchListings, getReservationsWithFinancialData, fetchUsers, getFinancialReport} from '../services/api';
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
  const authInitialized = useRef(false);
  
  // Use refs to track what data we've loaded to prevent re-renders
  const loadedListingsRef = useRef(false);
  const loadedReservationsRef = useRef(false);
  const isLoadingRef = useRef(false);

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
        console.log("Initializing auth state...");
        setIsLoading(true);
        const token = await getToken();
        
        if (!token) {
          console.log("No token found");
          setIsLoading(false);
          return;
        }
        
        console.log("Found token, validating");
        try {
          const decodedToken = decodeToken(token);
          if (decodedToken?.userId) {
            console.log("Token valid, setting user data");
            setUserData(decodedToken);
          } else {
            console.log("Invalid token, clearing");
            await removeToken();
          }
        } catch (error) {
          console.error("Token validation error:", error);
          await removeToken();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
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
      
      setIsLoading(true);
      try {
        console.log('Loading listings for user:', userData);
        const listingsData = await fetchListings(userData.haUserId);
        
        let listingsArray = [];
        if (listingsData?.result?.listings) {
          listingsArray = listingsData.result.listings;
        } else if (Array.isArray(listingsData?.result)) {
          listingsArray = listingsData.result;
        } else if (Array.isArray(listingsData)) {
          listingsArray = listingsData;
        }
        
        console.log(`Loaded ${listingsArray.length} properties`);
        setListings(listingsArray);
      } catch (error) {
        console.error('Error loading listings:', error);
        setErrorMessage('Failed to load properties');
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
      if (!listings || listings.length === 0) return;
      
      setIsLoading(true);
      try {
        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get a date 6 months in the future
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        
        console.log(`Loading reservations from ${todayStr} to ${futureDateStr}`);
        console.log(`For properties:`, listings.map(l => l.id));
        
        // Use the combined function that fetches reservations with financial data
        const listingIds = listings.map(listing => listing.id);
        const params = {
          listingMapIds: listingIds,
          fromDate: todayStr,
          toDate: futureDateStr,
          dateType: 'arrivalDate',
          status: 'confirmed'
        };
        
        console.log('Calling getReservationsWithFinancialData with params:', params);
        const result = await getReservationsWithFinancialData(params);
        console.log('Combined reservations data received:', result?.reservations?.length || 0, 'items');
        
        // Set the reservations directly from the result
        if (result?.reservations && Array.isArray(result.reservations)) {
          setReservations(result.reservations);
        } else {
          console.warn('Unexpected reservation data format:', result);
          setReservations([]);
        }
      } catch (error) {
        console.error('Error loading reservations:', error);
        setErrorMessage('Failed to load reservations');
        setReservations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReservationsData();
  }, [listings]);

  // Refresh data function
  const refreshData = async () => {
    console.log('Refreshing data...', userData);
    if (isLoading || !userData?.userId) {
      return false;
    }
    
    setIsLoading(true);
    try {
      console.log('Refreshing data...',);
      
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
      console.error('Error refreshing data:', error);
      setErrorMessage('Failed to refresh data');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async ({email, password}) => {
    setIsLoading(true);
    try {
      const user = await authenticateUser(email, password, setErrorMessage);
      console.log('Authenticated user:', user);
      if (user?.accessToken) {
        await storeToken(user.accessToken);
        const decodedToken = decodeToken(user.accessToken);
        setUserData(decodedToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during sign in:', error);
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
      setUserData(null);
      setListings(null);
      setReservations(null);
      return true;
    } catch (error) {
      console.error('Error during sign out:', error);
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
      console.log("Checking token...");
      const token = await getToken();
      
      if (!token) {
        console.log("No token found during check");
        return false;
      }
      
      const decodedToken = decodeToken(token);
      if (decodedToken?.userId) {
        console.log("Token valid during check, setting user data");
        setUserData(decodedToken);
        return true;
      }
      
      console.log("Invalid token during check");
      await removeToken();
      return false;
    } catch (error) {
      console.error('Error checking token:', error);
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
      console.error("Invalid token", error);
      return null;
    }
  };

  const storeToken = async (token) => {
    try {
      await Keychain.setGenericPassword('authToken', token);
      return true;
    } catch (error) {
      console.error('Could not store the token', error);
      return false;
    }
  };

  const getToken = async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('Could not load token', error);
      return null;
    }
  };

  const removeToken = async () => {
    try {
      await Keychain.resetGenericPassword();
      return true;
    } catch (error) {
      console.error('Could not delete token', error);
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
