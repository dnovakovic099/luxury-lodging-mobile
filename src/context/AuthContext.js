import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchListings, fetchReservations, fetchUsers } from '../services/api';

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

  useEffect(() => {
    if (userData?.userId) {
      loadListings();
    }
  }, [userData]);

  useEffect(() => {
    if (listings?.length > 0) {
      loadReservations(listings);
    }
  }, [listings]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const listingsData = await fetchListings(userData.userId);

      if (listingsData?.result) {
        setListings(listingsData.result);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReservations = async (currentListings) => {
    try {
      const reservationPromises = currentListings.map(listing => 
        fetchReservations({ listingId: listing.id })
      );

      const reservationsResponses = await Promise.all(reservationPromises);
      const allReservations = reservationsResponses
        .flatMap(response => response.result)
        .filter(Boolean);

      setReservations(allReservations);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  const signIn = async (data) => {
    try {
      setUserData({ userId: 882045 });
    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
  };

  const signOut = () => {
    setUserData(null);
    setListings(null);
    setReservations(null);
  };

  return (
    <AuthContext.Provider value={{
      userData,
      listings,
      reservations,
      signIn,
      signOut,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}