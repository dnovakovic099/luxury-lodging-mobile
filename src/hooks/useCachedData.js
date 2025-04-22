import { useState, useEffect, useCallback } from 'react';
import { loadFromCache, saveToCache, createParameterKey } from '../utils/cacheUtils';

/**
 * Custom hook to implement stale-while-revalidate pattern
 * @param {string} cacheKey - Key for storing in AsyncStorage
 * @param {Function} fetchFunction - Async function to fetch fresh data
 * @param {Object} params - Parameters for fetch function and cache key
 * @param {boolean} autoFetch - Whether to fetch on mount
 * @param {Array} dependencies - Additional dependencies for the effect to prevent unnecessary fetches 
 * @param {number} cacheMaxAge - Max age for cache in milliseconds
 * @returns {Object} - { data, isLoading, error, refetch }
 */
const useCachedData = (
  cacheKey, 
  fetchFunction, 
  params = {}, 
  autoFetch = true, 
  dependencies = null,
  cacheMaxAge = 24 * 60 * 60 * 1000 // Default 24 hours
) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFreshData, setIsFreshData] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(0);
  const paramKey = createParameterKey(params);

  const fetchData = useCallback(async (showLoading = true) => {
    // Don't refetch if we already fetched within a short interval
    const now = Date.now();
    if (now - lastFetchTimestamp < 5000) { // 5 second throttle
      return data;
    }
    
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      setLastFetchTimestamp(now);
      
      // Execute the fetch function with params
      const freshData = await fetchFunction(params);
      
      // Update state with fresh data
      setData(freshData);
      setIsFreshData(true);
      
      // Save to cache for next time
      await saveToCache(cacheKey, freshData, paramKey);
      
      return freshData;
    } catch (err) {
      console.error(`Error fetching data for ${cacheKey}:`, err);
      setError(err);
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, fetchFunction, paramKey, lastFetchTimestamp, data, params]);

  const loadCachedAndFetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from cache first
      const cachedData = await loadFromCache(cacheKey, paramKey);
      
      if (cachedData) {
        // If we have cached data, show it immediately
        setData(cachedData);
        setIsFreshData(false);
        setIsLoading(false);
        
        // Check if cache is fresh enough
        const now = Date.now();
        const cacheMeta = await loadFromCache(`${cacheKey}_meta`, paramKey);
        const cacheTimestamp = cacheMeta?.timestamp || 0;
        
        // Only fetch if cache is too old
        if (now - cacheTimestamp > cacheMaxAge) {
          // Then fetch fresh data in the background
          fetchData(false).then((freshData) => {
            if (freshData) {
              setIsFreshData(true);
            }
          });
        }
      } else {
        // No cached data, do a normal fetch with loading indicator
        await fetchData(true);
      }
    } catch (err) {
      console.error(`Error in loadCachedAndFetch for ${cacheKey}:`, err);
      setError(err);
      setIsLoading(false);
    }
  }, [cacheKey, fetchData, paramKey, cacheMaxAge]);

  // Initial fetch on mount
  useEffect(() => {
    if (autoFetch) {
      loadCachedAndFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies ? [...dependencies] : [autoFetch, loadCachedAndFetch]);

  const refetch = useCallback((showLoading = true) => {
    return fetchData(showLoading);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isFreshData,
    error,
    refetch,
    loadCachedAndFetch
  };
};

export default useCachedData; 