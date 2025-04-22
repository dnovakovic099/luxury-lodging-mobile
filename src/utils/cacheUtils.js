import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys for different data types
export const CACHE_KEYS = {
  UPCOMING_RESERVATIONS: 'cache_upcoming_reservations',
  RESERVATIONS: 'cache_reservations',
  CALENDAR: 'cache_calendar',
  MONTHLY_REVENUE: 'cache_monthly_revenue',
  LISTINGS: 'cache_listings',
};

// Maximum age of cache in milliseconds (24 hours)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Save data to cache with timestamp
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {string} [parameters] - Optional stringified parameters for parameterized caches
 */
export const saveToCache = async (key, data, parameters = '') => {
  try {
    const cacheKey = parameters ? `${key}_${parameters}` : key;
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    
    // Save the actual data
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
    // Also save metadata separately for easier checking of freshness
    const metaKey = parameters ? `${key}_meta_${parameters}` : `${key}_meta`;
    const metaData = {
      timestamp: Date.now(),
      isEmpty: !data || (Array.isArray(data) && data.length === 0) || 
               (typeof data === 'object' && Object.keys(data).length === 0)
    };
    
    await AsyncStorage.setItem(metaKey, JSON.stringify(metaData));
    
    console.log(`Data cached successfully: ${cacheKey}`);
  } catch (error) {
    console.error(`Error saving data to cache (${key}):`, error);
  }
};

/**
 * Load data from cache
 * @param {string} key - Cache key
 * @param {string} [parameters] - Optional stringified parameters for parameterized caches
 * @param {boolean} [ignoreExpiry=false] - Whether to ignore cache expiry
 * @returns {Object|null} - Cached data or null if not found/expired
 */
export const loadFromCache = async (key, parameters = '', ignoreExpiry = false) => {
  try {
    const cacheKey = parameters ? `${key}_${parameters}` : key;
    const cachedValue = await AsyncStorage.getItem(cacheKey);
    
    if (!cachedValue) return null;
    
    const { data, timestamp } = JSON.parse(cachedValue);
    const age = Date.now() - timestamp;
    
    // Return null if cache is expired and we're not ignoring expiry
    if (!ignoreExpiry && age > CACHE_MAX_AGE) {
      console.log(`Cache expired for ${cacheKey}`);
      return null;
    }
    
    // Don't log every cache access, only significant ones to reduce console noise
    if (key.includes('MONTHLY_REVENUE')) {
      console.log(`Loaded from cache: ${cacheKey}, age: ${Math.round(age / 1000 / 60)} minutes`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading from cache (${key}):`, error);
    return null;
  }
};

/**
 * Clear specific cache
 * @param {string} key - Cache key to clear
 */
export const clearCache = async (key) => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(k => k.startsWith(key));
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`Cleared ${keysToRemove.length} cache entries for ${key}`);
    }
  } catch (error) {
    console.error(`Error clearing cache (${key}):`, error);
  }
};

/**
 * Clear all caches
 */
export const clearAllCaches = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => 
      Object.values(CACHE_KEYS).some(cacheKey => key.startsWith(cacheKey))
    );
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared all ${cacheKeys.length} cache entries`);
    }
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
};

/**
 * Create parameter string from object
 * @param {Object} params - Parameters object
 * @returns {string} - Hash string representing parameters
 */
export const createParameterKey = (params) => {
  if (!params) return '';
  
  // Sort keys to ensure consistent hashing
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        acc[key] = params[key];
      }
      return acc;
    }, {});
    
  return JSON.stringify(sortedParams);
}; 