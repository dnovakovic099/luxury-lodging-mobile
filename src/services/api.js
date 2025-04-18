// services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Server URL configuration - using the same port as the owner-portal server
const SERVER_BASE_URL = Platform.select({
  ios: 'https://luxurylodgingpm.co/owner-portal-api', // For iOS simulator
  android: 'https://luxurylodgingpm.co/owner-portal-api', // For Android emulator
  default: 'https://luxurylodgingpm.co/owner-portal-api', // Production fallback
});

// Authentication server URL
const API_SERVER_URL = 'https://luxurylodgingpm.co/owner-portal-api';
let accessToken = null;

/**
 * Common function to make authenticated requests to the server
 */
const makeServerRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const token = accessToken;
    const headers = {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      'Cache-control': 'no-cache',
    };

    const options = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    // The server.js file shows that API routes are prefixed with /api
    const url = `${SERVER_BASE_URL}/api${endpoint}`;
    console.log(`Making ${method} request to: ${url}`);
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Add the signal to our fetch options
      options.signal = controller.signal;
      
      const response = await fetch(url, options);

      console.log('Response:', response, url);
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      // Check for non-JSON responses - could indicate HTML error page
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (!isJson) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200) + '...');
        throw new Error(`Server returned non-JSON response: ${response.status}`);
      }
      
      if (response.status === 401) {
        console.log('Authentication expired');
        throw new Error('Your session has expired. Please login again.');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`Server error: ${response.status} - ${errorBody.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.error(`Request timeout for ${endpoint} after 30 seconds`);
        throw new Error('Request timed out. Please try again later.');
      }
      throw err;
    }
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Authenticate user with email and password
 */
export const authenticateUser = async (email, password, setErrorMessage) => {
  try {
    // Auth endpoint is /api/auth/login from auth.js router
    console.log('Authenticating user:',`${SERVER_BASE_URL}/api/auth/login`);
    const response = await fetch(`${SERVER_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Response:', response);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Authentication successful:', data);
      accessToken = data.token;
      return {
        email: email,
        accessToken: data.token,
      };
    } else {
      setErrorMessage('Authentication failed', response);
      throw new Error('Authentication failed');
    }
  } catch (error) {
    setErrorMessage(error.message || 'Authentication error occurred');
    console.error('Auth error:', error);
    throw error;
  }
};

/**
 * Get all listings for a user
 */
export const fetchListings = async (userId) => {
  try {
    // From api.js file, the endpoint is /listings with userId query param
    console.log('Fetching listings for user:', userId);
    const data = await makeServerRequest(`/listings?userId=${userId}`);
    return data;
  } catch (error) {
    console.error('Error fetching listings:', error);
    return { result: [] };
  }
};

/**
 * Fetch basic reservations - This gets the reservation list without financial data
 */
export const fetchReservations = async (params = {}) => {
  try {
    console.log('Fetching basic reservations with params:', params);
    
    // Map params to match Hostaway API expectations
    const apiParams = { ...params };
    
    // Convert listingMapIds to listingId if provided
    if (params.listingMapIds) {
      // API expects listingId, not listingMapIds
      // If multiple listingIds are provided, we'll need to make multiple requests
      // or implement a comma-separated string depending on what the API supports
      if (Array.isArray(params.listingMapIds) && params.listingMapIds.length === 1) {
        apiParams.listingId = params.listingMapIds[0];
      } else if (!Array.isArray(params.listingMapIds)) {
        apiParams.listingId = params.listingMapIds;
      }
      // Remove the original listingMapIds
      delete apiParams.listingMapIds;
    }
    
    // Map date parameters to match API expectations
    if (params.fromDate) {
      apiParams.arrivalStartDate = params.fromDate;
      delete apiParams.fromDate;
    }
    
    if (params.toDate) {
      apiParams.arrivalEndDate = params.toDate;
      delete apiParams.toDate;
    }
    
    // Remove dateType as it's not needed for this endpoint
    delete apiParams.dateType;
    
    // Build query string
    const queryParams = Object.entries(apiParams)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}=${value.join(',')}`;
        }
        return `${key}=${encodeURIComponent(value)}`;
      })
      .join('&');
      
    const url = `/reservations${queryParams ? `?${queryParams}` : ''}`;
    const response = await makeServerRequest(url);
    
    // Handle various possible response structures
    let reservations = [];
    let meta = { 
      total: 0, 
      limit: params.limit || 10, 
      offset: params.offset || 0, 
      hasMore: false 
    };
    
    if (response.result?.reservations) {
      reservations = response.result.reservations;
      meta = response.result.meta || meta;
    } else if (Array.isArray(response.result)) {
      reservations = response.result;
      meta.total = response.count || reservations.length;
    } else if (Array.isArray(response)) {
      reservations = response;
      meta.total = reservations.length;
    }
    
    console.log(`Fetched ${reservations.length} basic reservations`);
    
    // Always return in the expected format
    return { 
      reservations, 
      meta 
    };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { 
      reservations: [], 
      meta: { 
        total: 0, 
        limit: params.limit || 10, 
        offset: params.offset || 0, 
        hasMore: false 
      } 
    };
  }
};

/**
 * Get consolidated financial report - separate from basic reservation data
 * @param {Object} params - Query parameters for financial data
 * @returns {Promise<Object>} Financial report data
 */
export const getFinancialReport = async (params = {}) => {
  try {
    console.log('Fetching financial report with params:', params);
    
    // Prepare the request body for the consolidated financial report endpoint
    const requestBody = {
      statuses: ['confirmed', 'new', 'modified', 'ownerStay'] // Include all valid statuses
    };
    
    // Map the params to the expected format for the financial report endpoint
    if (params.listingMapIds) {
      // Financial API might expect different parameter for listings
      // We'll keep the original name but ensure it's in the right format
      requestBody.listingMapIds = Array.isArray(params.listingMapIds) 
        ? params.listingMapIds 
        : [params.listingMapIds];
    }
    
    // Map date parameters appropriately for financial endpoint
    if (params.fromDate) requestBody.fromDate = params.fromDate;
    if (params.toDate) requestBody.toDate = params.toDate;
    
    // Include dateType if specified (arrivalDate, departureDate, etc.)
    if (params.dateType) requestBody.dateType = params.dateType;
    
    // Include any additional parameters that might be needed for financial endpoint
    if (params.limit) requestBody.limit = params.limit;
    if (params.offset) requestBody.offset = params.offset;
    
    console.log('Financial report request body:', requestBody);
    
    // Make the consolidated financial report request
    const response = await makeServerRequest('/finance/report/consolidated', 'POST', requestBody);
    
    console.log('Financial report response type:', typeof response);
    console.log('Financial report response keys:', response ? Object.keys(response) : 'no response');
    
    // Log sample of data to see the structure
    if (response?.result?.rows && response.result.rows.length > 0) {
      console.log('Financial report sample row:', JSON.stringify(response.result.rows[0], null, 2));
      console.log('Financial report columns:', response.result.columns);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching financial report:', error);
    return { 
      result: {
        rows: [],
        columns: [] 
      }
    };
  }
};

/**
 * Enhanced function that combines reservation data with financial data
 * @param {Object} params - Parameters for both endpoints
 * @returns {Promise<Object>} Combined reservation and financial data
 */
const pendingRequests = {};

export const getReservationsWithFinancialData = async (params = {}) => {
  try {
    // Generate a request key based on the parameters
    const requestKey = JSON.stringify(params);
    
    // Check if there's already a pending request with the same parameters
    if (pendingRequests[requestKey]) {
      console.log('Duplicate request detected, returning cached promise');
      return pendingRequests[requestKey];
    }
    
    // Create a new promise for this request
    const promise = (async () => {
      let allReservations = [];
      let meta = { 
        total: 0, 
        limit: params.limit || 10, 
        offset: params.offset || 0, 
        hasMore: false 
      };
      
      try {
        // Handle multiple listings more efficiently - use a batch approach
        if (params.listingMapIds && Array.isArray(params.listingMapIds) && params.listingMapIds.length > 0) {
          console.log(`Fetching reservations for ${params.listingMapIds.length} listings`);
          
          // For larger numbers of listings, use a single request with comma-separated IDs
          // This will be more efficient than making individual requests
          if (params.listingMapIds.length <= 5) {
            // For a small number of listings, fetch individually for better reliability
            for (const listingId of params.listingMapIds) {
              const listingParams = { ...params, listingMapIds: listingId };
              const singleListingResult = await fetchReservations(listingParams);
              
              if (singleListingResult.reservations && singleListingResult.reservations.length > 0) {
                allReservations = [...allReservations, ...singleListingResult.reservations];
              }
            }
          } else {
            // Use a single batch request for efficiency with many listings
            const batchParams = { ...params };
            // API might support comma-separated IDs
            // If this doesn't work, revert to individual requests
            const reservationsData = await fetchReservations(batchParams);
            allReservations = reservationsData.reservations || [];
            meta = reservationsData.meta || meta;
          }
          
          console.log(`Total reservations from all listings: ${allReservations.length}`);
          
          // Update meta information
          meta.total = allReservations.length;
        } else {
          // If we're dealing with a single listing or no listing specified, just use fetchReservations directly
          const reservationsData = await fetchReservations(params);
          allReservations = reservationsData.reservations || [];
          meta = reservationsData.meta || meta;
        }
        
        // If we have no reservations, just return the empty result
        if (allReservations.length === 0) {
          console.log('No basic reservations found, returning empty result');
          return { reservations: [], meta };
        }
        
        // Step 2: Get financial report with the same parameters
        const financialData = await getFinancialReport(params);
        
        console.log('Processing financial data for', allReservations.length, 'reservations');
        
        // Step 3: Process the financial data into a more usable format
        const financialMap = {};
        
        if (financialData?.result?.rows && financialData.result.columns) {
          const columns = financialData.result.columns;
          
          // Process each row of financial data
          financialData.result.rows.forEach(row => {
            const processedRow = {};
            
            // Map column values to their names
            columns.forEach((column, index) => {
              if (column.name) {
                processedRow[column.name] = row[index];
              }
            });
            
            // IMPORTANT: Use the internal numeric ID for matching, NOT the string reservationId
            // This is critical because reservations are matched by their numeric ID
            const numericId = processedRow.id;
            
            if (numericId) {
              // Store in our financial map using the NUMERIC ID as key
              financialMap[String(numericId)] = processedRow;
            }
            
            // Also store using the string reservationId as a fallback
            if (processedRow.reservationId) {
              financialMap[processedRow.reservationId] = processedRow;
            }
          });
        }
        
        console.log('Financial map created with', Object.keys(financialMap).length, 'entries');
        
        // Step 4: Merge the financial data with the reservation data
        const enhancedReservations = allReservations.map(reservation => {
          // Get the reservation ID - could be in different fields
          const reservationId = reservation.id || reservation.reservationId;
          
          if (!reservationId) {
            return {
              ...reservation,
              ownerPayout: 0,
              financialData: null
            };
          }
          
          // Find the matching financial data using numeric ID
          const financialInfo = financialMap[String(reservationId)];
          
          // Merge the data if found
          if (financialInfo) {
            return {
              ...reservation,
              // Add the entire financial data object
              financialData: financialInfo,
              // Also add critical fields directly to the reservation for easier access
              ownerPayout: parseFloat(financialInfo.ownerPayout || financialInfo.ownerAmount || 0),
              baseRate: parseFloat(financialInfo.baseRate || reservation.baseRate || 0),
              cleaningFee: parseFloat(financialInfo.cleaningFee || financialInfo.cleaningFeeValue || reservation.cleaningFee || 0)
            };
          }
          
          // Return the original reservation with default values if no financial data found
          return {
            ...reservation,
            ownerPayout: 0, // Default to 0 if no financial data
            financialData: null
          };
        });
        
        // Count how many reservations have financial data
        const withFinancialData = enhancedReservations.filter(res => res.financialData !== null).length;
        console.log(`Enhanced ${enhancedReservations.length} reservations, ${withFinancialData} with financial data`);
        
        // Return in the expected format
        return {
          reservations: enhancedReservations,
          meta: {
            ...meta,
            total: enhancedReservations.length
          }
        };
      } finally {
        // Remove this request from the pending requests
        delete pendingRequests[requestKey];
      }
    })();
    
    // Store the promise so we can reuse it for duplicate requests
    pendingRequests[requestKey] = promise;
    
    // Return the promise
    return promise;
  } catch (error) {
    console.error('Error fetching reservations with financial data:', error);
    return { 
      reservations: [], 
      meta: { 
        total: 0, 
        limit: params.limit || 10, 
        offset: params.offset || 0, 
        hasMore: false 
      } 
    };
  }
};

/**
 * Get individual reservation details
 */
export const getReservationById = async (id) => {
  try {
    // From api.js, this endpoint is /reservations/:id
    return await makeServerRequest(`/reservations/${id}`);
  } catch (error) {
    console.error(`Error fetching reservation ${id}:`, error);
    return { result: null };
  }
};

/**
 * Get calendar data
 */
export const getCalendarData = async (listingId, startDate, endDate) => {
  try {
    // From api.js, this endpoint is /calendar with query params
    return await makeServerRequest(`/calendar?listingId=${listingId}&startDate=${startDate}&endDate=${endDate}`);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return { result: [] };
  }
};

// These functions are kept as stubs for backward compatibility

export const uploadMessage = async (message, token) => {
  console.warn('uploadMessage: This endpoint is not available');
  return { success: false };
};

export const fetchUsers = async () => {
  console.warn('fetchUsers: This endpoint is not available');
  return { result: [] };
};

export const requestRevenueCalculation = async (message) => {
  console.warn('requestRevenueCalculation: This endpoint is not available');
  return { result: null };
};
