import React, { createContext, useState, useContext, useEffect } from 'react';
import {authenticateUser, fetchListings, fetchReservations, fetchUsers} from '../services/api';
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

  useEffect(() => {
    if (userData?.userId) {
      loadListings();
    }
  }, [userData]);

  useEffect(() => {

  }, [errorMessage]);

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

  const signIn = async ({email, password}) => {
    try {
      authenticateUser(email, password, setUserData, setErrorMessage).then(user => {
        console.log('us, ',user)
        storeToken(user.accessToken);
        const decodedToken = user.accessToken && decodeToken(user.accessToken);
        setUserData(decodedToken);
      })
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

  const checkToken = async () => {
    const token = await getToken();
    console.log('token',token);
    const decodedToken = token !== null && await decodeToken(token);
    console.log('decodedToken:', decodedToken);
    if (decodedToken.userId) {
      setUserData(decodedToken);
      console.log('User is authenticated');
    } else {
      console.log('User is not authenticated');
    }
  };

  const decodeToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      console.log("Decoded Token:", decoded);
      return decoded;
    } catch (error) {
      console.error("Invalid token", error);
      return null;
    }
  };

  const storeToken = async (token) => {
    try {
      await Keychain.setGenericPassword('authToken', token);
    } catch (error) {
      console.error('Could not store the token', error);
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
    } catch (error) {
      console.error('Could not delete token', error);
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}
