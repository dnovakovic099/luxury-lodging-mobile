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
  const [upcomingReservations, setUpcomingReservations] = useState(null);
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
      console.log(`[AUTH DEBUG] Skipping fetchUpcomingReservations - inProgress: ${upcomingReservationsFetchInProgress.current}, listings: ${listings?.length || 0}`);
      return;
    }
    
    console.log(`[AUTH DEBUG] ======== START UPCOMING RESERVATIONS FETCH ========`);
    upcomingReservationsFetchInProgress.current = true;
    
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
      const listingIds = listings.map(listing => parseInt(listing.id)).filter(id => !isNaN(id));
      console.log(`[AUTH DEBUG] Available listings (${listingIds.length}): ${JSON.stringify(listings.map(l => ({id: l.id, name: l.name})))}`);
      
      // Create an array to hold all upcoming reservations
      let allUpcomingReservations = [];
      
      // Attempting individual listing fetch first, which seems more reliable
      console.log(`[AUTH DEBUG] Fetching reservations for each listing individually...`);
      
      for (const listingId of listingIds) {
        const listing = listings.find(l => parseInt(l.id) === listingId);
        console.log(`[AUTH DEBUG] Processing listing: ${listing?.name || 'Unknown'} (ID: ${listingId})`);
        
        const singleListingParams = {
          listingId: listingId, // Use listingId instead of listingMapIds for single listing
          fromDate: todayStr,
          toDate: futureDateStr,
          dateType: 'arrivalDate',
          statuses: ['confirmed', 'new', 'modified'],
          includeOwnerStays: true,
          sortBy: 'arrivalDate',
          sortDirection: 'asc',
          limit: 1 // Set limit to 1 to fetch only the next upcoming reservation
        };
        
        try {
          console.log(`[AUTH DEBUG] API call for listing ${listingId} with params:`, JSON.stringify(singleListingParams));
          const singleResult = await getReservationsWithFinancialData(singleListingParams);
          
          console.log(`[AUTH DEBUG] API response structure for listing ${listingId}:`, 
            Object.keys(singleResult || {}).join(', '), 
            `reservations: ${Array.isArray(singleResult?.reservations) ? singleResult.reservations.length : 'none'}`
          );
          
          if (singleResult?.reservations && Array.isArray(singleResult.reservations)) {
            const reservationsCount = singleResult.reservations.length;
            console.log(`[AUTH DEBUG] Received ${reservationsCount} reservations for listing ${listingId} (${listing?.name || 'Unknown'})`);
            
            if (reservationsCount > 0) {
              console.log(`[AUTH DEBUG] Sample reservation for ${listingId}:`, JSON.stringify({
                id: singleResult.reservations[0].id,
                property: singleResult.reservations[0].listingName || singleResult.reservations[0].property?.name,
                arrival: singleResult.reservations[0].arrivalDate || singleResult.reservations[0].checkIn
              }));
            }
            
            // Find the listing name
            const listingName = listing?.name || 'Unknown Property';
            
            // Add listing metadata to each reservation if missing
            const enhancedReservations = singleResult.reservations.map(res => {
              const enhanced = {
                ...res,
                listingId: res.listingId || listingId,
                listingMapId: res.listingMapId || listingId,
                listingName: res.listingName || listingName,
                property: res.property || { name: listingName }
              };
              
              // Log to confirm the enhancement worked
              if (!res.listingName && enhanced.listingName) {
                console.log(`[AUTH DEBUG] Enhanced reservation ${res.id} with listingName: ${enhanced.listingName}`);
              }
              
              return enhanced;
            });
            
            allUpcomingReservations.push(...enhancedReservations);
          }
        } catch (error) {
          console.error(`[AUTH DEBUG] Error fetching reservations for listing ${listingId}:`, error);
        }
      }
      
      console.log(`[AUTH DEBUG] Total reservations collected from individual fetches: ${allUpcomingReservations.length}`);
      
      // If we didn't get any reservations from individual fetches, try the bulk fetch
      if (allUpcomingReservations.length === 0) {
        console.log(`[AUTH DEBUG] No reservations from individual fetches, trying bulk fetch...`);
        
        const bulkParams = {
          listingMapIds: listingIds,
          fromDate: todayStr,
          toDate: futureDateStr,
          dateType: 'arrivalDate',
          statuses: ['confirmed', 'new', 'modified'],
          includeOwnerStays: true,
          sortBy: 'arrivalDate',
          sortDirection: 'asc',
          limit: listingIds.length // Set limit to match the number of listings
        };
        
        console.log(`[AUTH DEBUG] Attempting bulk fetch with params:`, JSON.stringify(bulkParams));
        const bulkResult = await getReservationsWithFinancialData(bulkParams);
        
        console.log(`[AUTH DEBUG] Bulk API response:`, 
          Object.keys(bulkResult || {}).join(', '), 
          `reservations: ${Array.isArray(bulkResult?.reservations) ? bulkResult.reservations.length : 'none'}`
        );
        
        if (bulkResult?.reservations && Array.isArray(bulkResult.reservations) && bulkResult.reservations.length > 0) {
          console.log(`[AUTH DEBUG] Bulk fetch succeeded with ${bulkResult.reservations.length} reservations`);
          
          // Check listing distribution in bulk results
          const bulkListingIds = [...new Set(bulkResult.reservations.map(r => r.listingId || r.listingMapId))];
          console.log(`[AUTH DEBUG] Listings in bulk results (${bulkListingIds.length}): ${bulkListingIds.join(', ')}`);
          
          allUpcomingReservations = bulkResult.reservations;
        }
      }
      
      // Filter to get only upcoming reservations
      const today2 = new Date();
      today2.setHours(0, 0, 0, 0); // Reset to beginning of day
      
      console.log(`[AUTH DEBUG] Filtering ${allUpcomingReservations.length} reservations for upcoming dates...`);
      
      const upcomingReservations = allUpcomingReservations
        .filter(res => {
          try {
            const checkInDate = res.checkIn || res.arrivalDate;
            if (!checkInDate) return false;
            
            const arrivalDate = new Date(checkInDate);
            const isUpcoming = arrivalDate >= today2;
            
            if (!isUpcoming) {
              console.log(`[AUTH DEBUG] Filtering out past reservation: ${res.id} with date ${checkInDate}`);
            }
            
            return isUpcoming;
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.checkIn || a.arrivalDate);
          const dateB = new Date(b.checkIn || b.arrivalDate);
          return dateA - dateB;
        });
      
      console.log(`[AUTH DEBUG] After date filtering: ${upcomingReservations.length} upcoming reservations`);
      
      // Take only first 3
      const finalReservations = upcomingReservations.slice(0, 3);
      console.log(`[AUTH DEBUG] Final upcoming reservations count: ${finalReservations.length}`);
      
      // Log unique listings in the final result
      if (finalReservations.length > 0) {
        const uniqueListingIds = [...new Set(finalReservations.map(r => r.listingId || r.listingMapId))];
        const uniqueListingNames = [...new Set(finalReservations.map(r => r.listingName || r.property?.name))];
        
        console.log(`[AUTH DEBUG] Unique listing IDs in final reservations: ${uniqueListingIds.join(', ')}`);
        console.log(`[AUTH DEBUG] Unique listing NAMES in final reservations: ${uniqueListingNames.join(', ')}`);
        
        // Log details about each reservation
        finalReservations.forEach((res, idx) => {
          console.log(`[AUTH DEBUG] Final reservation ${idx+1}:`, JSON.stringify({
            id: res.id,
            listingId: res.listingId,
            listingName: res.listingName || res.property?.name,
            arrivalDate: res.checkIn || res.arrivalDate,
            guest: res.guest?.name
          }));
        });
      }
      
      console.log(`[AUTH DEBUG] Setting upcomingReservations state with ${finalReservations.length} reservations`);
      setUpcomingReservations(finalReservations);
      console.log(`[AUTH DEBUG] ======== END UPCOMING RESERVATIONS FETCH ========`);
    } catch (error) {
      console.error('[AUTH DEBUG] Error fetching upcoming reservations:', error);
      setUpcomingReservations([]);
    } finally {
      upcomingReservationsFetchInProgress.current = false;
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}
