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
        await response.text();
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
    const response = await fetch(`${SERVER_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      accessToken = data.token;
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
    // Always ensure we have a high limit
    const apiParams = { 
      ...params,
      limit: 10000 // Always use a high limit to get all reservations
    };
    
    if (params.listingMapIds) {
      // API only accepts a single listingId
      if (Array.isArray(params.listingMapIds) && params.listingMapIds.length > 0) {
        // Take only the first ID from the array
        apiParams.listingId = params.listingMapIds[0];
        if (params.listingMapIds.length > 1) {
          console.log(`WARNING: API only supports querying one listing at a time. Only using first ID: ${apiParams.listingId}`);
        }
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
    
    console.log(`Making API request with params:`, JSON.stringify(apiParams));
    
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
    
    console.log(`Fetched ${reservations.length} reservations from API call`);
    
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
        limit: 10000, 
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
    
    if (params.listingMapIds) {
      requestBody.listingMapIds = Array.isArray(params.listingMapIds) 
        ? params.listingMapIds 
        : [params.listingMapIds];
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
    
    console.log(`Fetching financial report with limit: ${requestBody.limit}, ReservationIDs: ${requestBody.reservationIds ? requestBody.reservationIds.length : 'none'}`);
    
    const response = await makeServerRequest('/finance/report/consolidated', 'POST', requestBody);
    console.log(`Financial report returned ${response?.result?.rows?.length || 0} rows`);
    
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
      console.log('Request already in progress, returning pending request');
      return pendingRequests[requestKey];
    }
    
    const promise = (async () => {
      // Always ensure we use a high limit
      const enhancedParams = { 
        ...params,
        limit: 10000  // Always use a high limit
      };
      
      console.log(`Getting reservations with financial data, limit: ${enhancedParams.limit}`);
      
      let allReservations = [];
      let meta = { 
        total: 0, 
        limit: enhancedParams.limit, 
        offset: enhancedParams.offset || 0, 
        hasMore: false 
      };
      
      try {
        // Get all reservations in a single API call instead of multiple calls
        console.log(`Fetching all reservations with params:`, JSON.stringify(enhancedParams));
        const reservationsData = await fetchReservations(enhancedParams);
        allReservations = reservationsData.reservations || [];
        meta = reservationsData.meta || meta;
        
        console.log(`Reservations returned: ${allReservations.length}`);
        
        if (allReservations.length === 0) {
          console.log('No reservations found, returning empty result');
          return { reservations: [], meta };
        }
        
        // Process financial data
        let allFinancialMap = {};
        let totalRowsProcessed = 0;
        
        // Extract the listing IDs from the parameters
        const listingMapIds = enhancedParams.listingMapIds;
        
        if (listingMapIds && Array.isArray(listingMapIds) && listingMapIds.length > 0) {
          console.log(`Processing ${listingMapIds.length} listings one by one for financial data`);
          
          // Process each listing separately
          for (let i = 0; i < listingMapIds.length; i++) {
            const listingId = listingMapIds[i];
            console.log(`Processing financial data for listing ${i+1}/${listingMapIds.length}: ID ${listingId}`);
            
            // Filter reservations for this listing
            const listingReservations = allReservations.filter(res => 
              res.listingId === listingId || 
              res.listingMapId === listingId ||
              res.listing?.id === listingId
            );
            
            if (listingReservations.length === 0) {
              console.log(`No reservations found for listing ${listingId}, skipping`);
              continue;
            }
            
            console.log(`Found ${listingReservations.length} reservations for listing ${listingId}`);
            
            // Get all reservation IDs for this listing
            const listingReservationIds = listingReservations
              .map(res => res.id || res.reservationId)
              .filter(id => id);
              
            if (listingReservationIds.length === 0) {
              console.log(`No valid reservation IDs for listing ${listingId}, skipping`);
              continue;
            }
            
            // Fetch financial data for this listing only
            const listingFinancialParams = { 
              ...enhancedParams,
              listingMapIds: [listingId],
              reservationIds: listingReservationIds,
              limit: 10000 
            };
            
            console.log(`Fetching financial data for listing ${listingId} with ${listingReservationIds.length} reservations`);
            
            const financialData = await getFinancialReport(listingFinancialParams);
            const rowsCount = financialData?.result?.rows?.length || 0;
            console.log(`Financial data received for listing ${listingId}: ${rowsCount} rows`);
            totalRowsProcessed += rowsCount;
            
            // Process financial data for this listing
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
                }
                
                if (processedRow.reservationId) {
                  allFinancialMap[processedRow.reservationId] = processedRow;
                }
              });
            }
          }
        } else {
          console.log("No listing IDs provided, using reservation IDs only");
          
          // Get all reservation IDs
          const allReservationIds = allReservations
            .map(res => res.id || res.reservationId)
            .filter(id => id);
            
          // Fetch financial data with ALL reservation IDs at once
          const financialParams = { 
            ...enhancedParams,
            reservationIds: allReservationIds,
            limit: 10000 
          };
          
          console.log(`Fetching financial data for ${allReservationIds.length} reservations`);
          
          const financialData = await getFinancialReport(financialParams);
          console.log(`Financial data received for ${financialData?.result?.rows?.length || 0} rows`);
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
              }
              
              if (processedRow.reservationId) {
                allFinancialMap[processedRow.reservationId] = processedRow;
              }
            });
          }
        }
        
        console.log(`Total financial rows processed across all listings: ${totalRowsProcessed}`);
        console.log(`Financial map contains data for ${Object.keys(allFinancialMap).length} reservations`);
        
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
        
        // Count how many reservations actually have financial data
        const withFinancialData = processedReservations.filter(res => res.financialData !== null).length;
        console.log(`Total reservations: ${processedReservations.length}, with financial data: ${withFinancialData}`);
        
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
    console.error('Error in getReservationsWithFinancialData:', error);
    return { 
      reservations: [], 
      meta: { 
        total: 0, 
        limit: 10000, 
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
    
    if (params.listingMapIds) {
      requestBody.listingMapIds = Array.isArray(params.listingMapIds) 
        ? params.listingMapIds 
        : [params.listingMapIds];
    }
    
    // Log whether we're getting future revenue or total
    const isFutureRevenue = !!params.fromDate;
    console.log(`${isFutureRevenue ? 'FUTURE REVENUE' : 'TOTAL REVENUE'} API call with fromDate: ${params.fromDate || 'none'}`);
    
    if (params.fromDate) requestBody.fromDate = params.fromDate;
    if (params.toDate) requestBody.toDate = params.toDate;
    if (params.dateType) requestBody.dateType = params.dateType;
    
    console.log(`Fetching listing financials with params:`, JSON.stringify(requestBody));
    
    const response = await makeServerRequest('/finance/report/listingFinancials', 'POST', requestBody);
    
    console.log(`Listing financials raw response received, processing...`);
    
    // Check if we have rows and columns to process
    if (response?.result?.rows && response.result.columns) {
      console.log(`Found ${response.result.rows.length} rows and ${response.result.columns.length} columns to process`);
      
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
      
      console.log(`${isFutureRevenue ? 'FUTURE' : 'TOTAL'} calculated ownerPayout: ${totalOwnerPayout} from ${processedRows.length} rows`);
      
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
      console.log(`No rows/columns format detected in response, returning raw result`);
      
      // If not in columns/rows format, return as is
      return response;
    }
  } catch (error) {
    console.error('Error fetching listing financials:', error);
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
    console.log(`Today's date: ${today.toISOString()}`);
    
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
      const fromDateStr = formatDateForApi(startDate);
      const toDateStr = formatDateForApi(endDate);
      
      // Get month name for label - ensure we use same format as current month in HomeScreen
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      console.log(`Fetching revenue for month ${i + 1}/${months}: ${monthName} (${fromDateStr} to ${toDateStr})`);
      
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
      
      console.log(`Month ${monthName}: $${revenue} ${i === 0 ? '(current month)' : ''}`);
    }
    
    // Format data for chart
    const labels = results.map(item => item.month);
    const data = results.map(item => item.revenue);
    const total = data.reduce((sum, val) => sum + val, 0);
    
    // Find current month for future revenue calculation
    const currentMonthIndex = results.findIndex(item => item.isCurrentMonth);
    
    console.log('Monthly revenue data prepared:', {
      labels,
      data,
      total,
      currentMonth: results[currentMonthIndex]?.month || 'unknown'
    });
    
    return {
      labels,
      data,
      total,
      currentMonthIndex: currentMonthIndex
    };
  } catch (error) {
    console.error('Error fetching monthly revenue data:', error);
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
    console.log(`Getting future revenue starting from: ${today.toISOString()}`);
    
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
      const fromDateStr = formatDateForApi(startDate);
      const toDateStr = formatDateForApi(endDate);
      
      // Get month name for label
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      console.log(`Fetching FUTURE revenue for month ${i + 1}/${months}: ${monthName} (${fromDateStr} to ${toDateStr})`);
      
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
      
      console.log(`Future Month ${monthName}: $${revenue} ${i === 0 ? '(current month)' : ''}`);
    }
    
    // Format data for chart
    const labels = results.map(item => item.month);
    const data = results.map(item => item.revenue);
    const total = data.reduce((sum, val) => sum + val, 0);
    
    console.log('Future revenue data prepared:', {
      labels,
      data,
      total
    });
    
    return {
      labels,
      data,
      total,
      currentMonthIndex: 0 // Current month is always first
    };
  } catch (error) {
    console.error('Error fetching future revenue data:', error);
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
