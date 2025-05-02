// services/api.js
import { Platform } from 'react-native';

// Server URL configuration
const SERVER_BASE_URL = Platform.select({
  ios: 'https://luxurylodgingpm.co/owner-portal-api',
  android: 'https://luxurylodgingpm.co/owner-portal-api',
  default: 'https://luxurylodgingpm.co/owner-portal-api',
});

let accessToken = null;

/**
 * Set the access token for subsequent requests
 */
export const setAccessToken = (token) => {
  accessToken = token;
};

/**
 * Common function to make authenticated requests to the server
 * @param {string} endpoint - The API endpoint to call
 * @param {string} method - The HTTP method to use
 * @param {any} body - The request body
 */
export const makeServerRequest = async (endpoint, method = 'GET', body = null) => {
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

    const url = `${SERVER_BASE_URL}/api${endpoint}`;
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      options.signal = controller.signal;
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (!isJson) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${response.status}`);
      }
      
      if (response.status === 401) {
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
        throw new Error('Request timed out. Please try again later.');
      }
      throw err;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Authenticate user with email and password
 */
export const authenticateUser = async (email, password, setErrorMessage) => {
  try {
    const url = `${SERVER_BASE_URL}/api/auth/login`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setAccessToken(data.token);
      return {
        email: email,
        accessToken: data.token,
      };
    } else {
      setErrorMessage('Authentication failed');
      throw new Error('Authentication failed');
    }
  } catch (error) {
    setErrorMessage(error.message || 'Authentication error occurred');
    throw error;
  }
};

/**
 * Get all listings for a user
 */
export const fetchListings = async (userId) => {
  try {
    const data = await makeServerRequest(`/listings?userId=${userId}`);
    return data;
  } catch (error) {
    return { result: [] };
  }
};

/**
 * Fetch basic reservations - This gets the reservation list without financial data
 */
export const fetchReservations = async (params = {}) => {
  try {
    // Use the provided limit or default to a high limit
    const apiParams = { 
      ...params,
      limit: params.limit || 10000, // Use provided limit or default to 10000
      sortOrder: params.sortBy || 'arrivalDate', // Default sort by arrival date
      sortDirection: 'ASC', // Sort in ascending order (oldest first)
    };
    
    if (params.listingMapIds) {
      // API only accepts a single listingId
      if (Array.isArray(params.listingMapIds) && params.listingMapIds.length > 0) {
        // Take only the first ID from the array
        apiParams.listingId = params.listingMapIds[0];
      } else if (!Array.isArray(params.listingMapIds)) {
        // Not an array, use as is
        apiParams.listingId = params.listingMapIds;
      }
      // Remove the original parameter to avoid confusion
      delete apiParams.listingMapIds;
    }
    
    if (params.fromDate) {
      apiParams.arrivalStartDate = params.fromDate;
      delete apiParams.fromDate;
    }
    
    if (params.toDate) {
      apiParams.arrivalEndDate = params.toDate;
      delete apiParams.toDate;
    }
    
    // Convert statuses array to comma-separated string if present
    if (params.statuses && Array.isArray(params.statuses)) {
      apiParams.status = params.statuses.join(',');
      delete apiParams.statuses;
    }
    
    delete apiParams.dateType;
    
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
    
    let reservations = [];
    let meta = { 
      total: 0, 
      limit: apiParams.limit, 
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

    // Explicitly reverse the reservations array when sorting by date
    if (apiParams.sortOrder === 'arrivalDate' || apiParams.sortOrder === 'checkInDate') {
      reservations = reservations.reverse();
    }

    return { 
      reservations, 
      meta 
    };
  } catch (error) {
    return { 
      reservations: [], 
      meta: { 
        total: 0, 
        limit: params.limit || 10000, 
        offset: params.offset || 0, 
        hasMore: false 
      } 
    };
  }
};

/**
 * Get consolidated financial report - separate from basic reservation data
 */
export const getFinancialReport = async (params = {}) => {
  try {
    const requestBody = {
      statuses: ['confirmed', 'new', 'modified', 'ownerStay'],
      limit: 10000
    };
    
    // Handle listingMapIds parameter
    if (params.listingMapIds) {
      requestBody.listingMapIds = Array.isArray(params.listingMapIds) 
        ? params.listingMapIds 
        : [params.listingMapIds];
    } else if (params.listingId) {
      // Convert listingId to listingMapIds if needed
      requestBody.listingMapIds = [params.listingId];
    }
    
    if (params.fromDate) requestBody.fromDate = params.fromDate;
    if (params.toDate) requestBody.toDate = params.toDate;
    if (params.dateType) requestBody.dateType = params.dateType;
    if (params.limit) requestBody.limit = params.limit;
    if (params.offset) requestBody.offset = params.offset;
    
    // If we have specific reservation IDs, use those for a more targeted query
    if (params.reservationIds && Array.isArray(params.reservationIds)) {
      requestBody.reservationIds = params.reservationIds;
    }
    
    const response = await makeServerRequest('/finance/report/consolidated', 'POST', requestBody);

    return response;
  } catch (error) {
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
 */
const pendingRequests = {};

export const getReservationsWithFinancialData = async (params = {}) => {
  try {
    const requestKey = JSON.stringify(params);
    
    if (pendingRequests[requestKey]) {
      return pendingRequests[requestKey];
    }
    
    const promise = (async () => {
      // Use the provided limit or default to high limit
      const enhancedParams = { 
        ...params,
        limit: params.limit || 10000  // Use provided limit or default to 10000
      };
      
      let allReservations = [];
      let meta = { 
        total: 0, 
        limit: enhancedParams.limit, 
        offset: enhancedParams.offset || 0, 
        hasMore: false 
      };
      
      try {
        // Get reservations with the specified limit
        const reservationsData = await fetchReservations(enhancedParams);
        allReservations = reservationsData.reservations || [];
        meta = reservationsData.meta || meta;
        
        if (allReservations.length === 0) {
          return { reservations: [], meta };
        }

        // Process financial data
        let allFinancialMap = {};
        let totalRowsProcessed = 0;
        
        // Extract listing map IDs from reservations if not provided in params
        let listingMapIds = enhancedParams.listingMapIds;
        if (!listingMapIds) {
          // Try to get listing IDs from the reservations
          const extractedListingIds = [...new Set(allReservations
            .map(res => res.listingMapId || res.listingId || (res.listing ? res.listing.id : null))
            .filter(id => id))];
            
          if (extractedListingIds.length > 0) {
            listingMapIds = extractedListingIds;
          } else if (enhancedParams.listingId) {
            // Fallback to listingId if provided
            listingMapIds = [enhancedParams.listingId];
          }
        }

        // Get all reservation IDs
        const allReservationIds = allReservations
          .map(res => res.id || res.reservationId)
          .filter(id => id);
          
        // Fetch financial data with ALL reservation IDs at once
        const financialParams = { 
          ...enhancedParams,
          reservationIds: allReservationIds,
          limit: 10000 // Always use high limit for financial data
        };
        
        // Always use listingMapIds and remove listingId
        if (listingMapIds) {
          financialParams.listingMapIds = Array.isArray(listingMapIds) ? listingMapIds : [listingMapIds];
        }
        // Always delete listingId to prevent conflicts
        delete financialParams.listingId;
        
        const financialData = await getFinancialReport(financialParams);
        totalRowsProcessed += (financialData?.result?.rows?.length || 0);
        
        // Process financial data
        if (financialData?.result?.rows && financialData.result.columns) {
          const columns = financialData.result.columns;
          
          financialData.result.rows.forEach(row => {
            const processedRow = {};
            
            columns.forEach((column, index) => {
              if (column.name) {
                processedRow[column.name] = row[index];
              }
            });
            
            const numericId = processedRow.id;
            
            if (numericId) {
              allFinancialMap[String(numericId)] = processedRow;
              // Check for alternative formats that might be causing the issue
              if (typeof numericId === 'number') {
                allFinancialMap[numericId] = processedRow;
              }
            }
            
            if (processedRow.reservationId) {
              allFinancialMap[processedRow.reservationId] = processedRow;
              // Also store with String conversion to be safe
              allFinancialMap[String(processedRow.reservationId)] = processedRow;
            }
          });
        }
        
        // Map financial data to all reservations
        const processedReservations = allReservations.map(reservation => {
          const reservationId = reservation.id || reservation.reservationId;
          
          if (!reservationId) {
            return {
              ...reservation,
              ownerPayout: 0,
              financialData: null
            };
          }
          
          const financialInfo = allFinancialMap[String(reservationId)];
          
          if (financialInfo) {
            return {
              ...reservation,
              financialData: financialInfo,
              ownerPayout: parseFloat(financialInfo.ownerPayout || financialInfo.ownerAmount || 0),
              baseRate: parseFloat(financialInfo.baseRate || reservation.baseRate || 0),
              cleaningFee: parseFloat(financialInfo.cleaningFee || financialInfo.cleaningFeeValue || reservation.cleaningFee || 0)
            };
          }
          
          return {
            ...reservation,
            ownerPayout: 0,
            financialData: null
          };
        });
        
        return {
          reservations: processedReservations,
          meta: {
            ...meta,
            total: processedReservations.length
          }
        };
      } finally {
        delete pendingRequests[requestKey];
      }
    })();
    
    pendingRequests[requestKey] = promise;
    return promise;
  } catch (error) {
    return { 
      reservations: [], 
      meta: { 
        total: 0, 
        limit: params.limit || 10000, 
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
    return await makeServerRequest(`/reservations/${id}`);
  } catch (error) {
    return { result: null };
  }
};

/**
 * Get calendar data
 */
export const getCalendarData = async (listingId, startDate, endDate) => {
  try {
    return await makeServerRequest(`/calendar?listingId=${listingId}&startDate=${startDate}&endDate=${endDate}`);
  } catch (error) {
    return { result: [] };
  }
};

/**
 * Get listing financials report - simplified revenue totals
 */
export const getListingFinancials = async (params = {}) => {
  try {
    const requestBody = {
      statuses: ['confirmed', 'new', 'modified', 'ownerStay'],
      limit: 10000
    };
    
    // Handle listingMapIds parameter
    if (params.listingMapIds) {
      requestBody.listingMapIds = Array.isArray(params.listingMapIds) 
        ? params.listingMapIds 
        : [params.listingMapIds];
    } else if (params.listingId) {
      // Convert listingId to listingMapIds if needed
      requestBody.listingMapIds = [params.listingId];
    }
    
    const isFutureRevenue = !!params.fromDate;
    
    if (params.fromDate) requestBody.fromDate = params.fromDate;
    if (params.toDate) requestBody.toDate = params.toDate;
    if (params.dateType) requestBody.dateType = params.dateType;
    
    const response = await makeServerRequest('/finance/report/listingFinancials', 'POST', requestBody);
    
    // Check if we have rows and columns to process
    if (response?.result?.rows && response.result.columns) {
      // Process columns and rows similar to getReservationsWithFinancialData
      const columns = response.result.columns;
      let totalOwnerPayout = 0;
      let processedRows = [];
      
      // Process each row
      response.result.rows.forEach(row => {
        const processedRow = {};
        
        // Map column names to values
        columns.forEach((column, index) => {
          if (column.name) {
            processedRow[column.name] = row[index];
          }
        });
        
        // Add to total owner payout
        const rowOwnerPayout = parseFloat(processedRow.ownerPayout || processedRow.ownerAmount || 0);
        if (!isNaN(rowOwnerPayout)) {
          totalOwnerPayout += rowOwnerPayout;
        }
        
        processedRows.push(processedRow);
      });
      
      // Return processed data with clear distinction between total and future revenue
      return { 
        result: {
          ownerPayout: totalOwnerPayout,
          totalRevenue: isFutureRevenue ? 0 : totalOwnerPayout, // Only set totalRevenue for all-time calls
          futureRevenue: isFutureRevenue ? totalOwnerPayout : 0, // Only set futureRevenue for future calls
          sharingRevenue: 0,
          processedRows: processedRows,
          isFutureRevenue: isFutureRevenue  // Flag to help debugging
        } 
      };
    } else {
      // If not in columns/rows format, return as is
      return response;
    }
  } catch (error) {
    return { 
      result: {
        ownerPayout: 0,
        totalRevenue: 0,
        futureRevenue: 0,
        sharingRevenue: 0
      }
    };
  }
};

export const requestRevenueCalculation = async (message) => {
  try {
    return await makeServerRequest('/calculations/revenue', 'POST', { message });
  } catch (error) {
    return { result: null };
  }
};

/**
 * Get monthly revenue data for charts directly from API
 */
export const getMonthlyRevenueData = async (listingIds, months = 6) => {
  try {
    const results = [];
    const today = new Date();
    
    // Get revenue for each of the past N months
    for (let i = 0; i < months; i++) {
      // Calculate start and end date for this month
      const startDate = new Date();
      startDate.setMonth(today.getMonth() - i);
      startDate.setDate(1); // First day of month
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of month
      endDate.setHours(23, 59, 59, 999);
      
      // Format dates for API
      const fromDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // Get month name for label - ensure we use same format as current month in HomeScreen
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      // Call API to get revenue for this month
      const monthRevenue = await getListingFinancials({
        listingMapIds: listingIds,
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      });
      
      // Extract revenue value
      const revenue = monthRevenue?.result?.ownerPayout || 0;
      
      // Store result
      results.unshift({
        month: monthName,
        revenue: revenue,
        date: startDate,
        isCurrentMonth: i === 0
      });
    }
    
    // Format data for chart
    const labels = results.map(item => item.month);
    const data = results.map(item => item.revenue);
    const total = data.reduce((sum, val) => sum + val, 0);
    
    // Find current month for future revenue calculation
    const currentMonthIndex = results.findIndex(item => item.isCurrentMonth);
    
    return {
      labels,
      data,
      total,
      currentMonthIndex: currentMonthIndex
    };
  } catch (error) {
    return {
      labels: [],
      data: [],
      total: 0,
      currentMonthIndex: -1
    };
  }
};

/**
 * Get future monthly revenue data for the next N months
 */
export const getFutureRevenueData = async (listingIds, months = 6) => {
  try {
    const results = [];
    const today = new Date();
    
    // Get revenue for each of the next N months
    for (let i = 0; i < months; i++) {
      // Calculate start and end date for this month
      const startDate = new Date();
      startDate.setMonth(today.getMonth() + i); // Future months
      startDate.setDate(1); // First day of month
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of month
      endDate.setHours(23, 59, 59, 999);
      
      // Format dates for API
      const fromDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // Get month name for label
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      // Call API to get revenue for this month
      const monthRevenue = await getListingFinancials({
        listingMapIds: listingIds,
        fromDate: fromDateStr,
        toDate: toDateStr,
        dateType: 'arrivalDate',
        statuses: ['confirmed', 'new', 'modified', 'ownerStay']
      });
      
      // Extract revenue value
      const revenue = monthRevenue?.result?.ownerPayout || 0;
      
      // Store result
      results.push({
        month: monthName,
        revenue: revenue,
        date: startDate,
        isCurrentMonth: i === 0
      });
    }
    
    // Format data for chart
    const labels = results.map(item => item.month);
    const data = results.map(item => item.revenue);
    const total = data.reduce((sum, val) => sum + val, 0);
    
    return {
      labels,
      data,
      total,
      currentMonthIndex: 0 // Current month is always first
    };
  } catch (error) {
    return {
      labels: [],
      data: [],
      total: 0,
      currentMonthIndex: 0
    };
  }
};

// Helper function to format date for API
const formatDateForApi = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
