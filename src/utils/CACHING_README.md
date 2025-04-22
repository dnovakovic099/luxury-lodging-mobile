# Caching System Documentation

## Overview

This caching system implements a "stale-while-revalidate" pattern to improve application loading times. When a user opens the app, previously cached data is immediately displayed while fresh data is fetched in the background. This approach significantly improves perceived performance and provides a better user experience, especially on slower networks.

## Core Components

### 1. `cacheUtils.js`

This utility file provides the core functionality for caching:

- `saveToCache`: Saves data to AsyncStorage with a timestamp
- `loadFromCache`: Loads cached data and checks whether it's expired
- `clearCache`: Clears specific cached data
- `clearAllCaches`: Clears all app-related cached data
- `createParameterKey`: Creates consistent hash keys for parameterized requests

### 2. `useCachedData.js` Hook

A custom React hook that implements the stale-while-revalidate pattern:

- Loads cached data first
- Shows cached data to the user immediately
- Fetches fresh data in the background
- Updates UI with fresh data when available
- Tracks loading states and provides refetch functionality

## Implementation Status

The following data is now cached with stale-while-revalidate pattern:

1. **Upcoming Reservations**: Home screen reservations (cached in AuthContext)
2. **Property Listings**: All available properties (cached in AuthContext)
3. **Reservations**: Full reservations list with filtering (using useCachedData hook)
4. **Calendar**: Calendar view reservations (using useCachedData hook)
5. **Financial Data**: Revenue charts, total revenue, future revenue (using useCachedData hook)

## How It Works

### Initial Load Sequence

1. App checks for cached data first (from previous sessions)
2. If cached data exists, it's immediately displayed to the user 
3. In the background, fresh data is fetched from the API
4. Once fresh data arrives, the UI is seamlessly updated
5. The fresh data is cached for the next session

### Screen Navigation

When navigating between screens, the app:
1. First shows cached data from the initial load
2. Quietly refreshes data in the background (no loading indicators)
3. Updates the display when fresh data arrives

### Data Refresh

When the user explicitly refreshes (by pull-to-refresh):
1. A loading indicator is shown
2. Fresh data is fetched from all relevant APIs
3. The UI updates with the fresh data
4. New data is cached for future use

## Cache Keys

All cache keys are defined in `CACHE_KEYS` constant in `cacheUtils.js`:

```javascript
export const CACHE_KEYS = {
  UPCOMING_RESERVATIONS: 'cache_upcoming_reservations',
  RESERVATIONS: 'cache_reservations',
  CALENDAR: 'cache_calendar',
  MONTHLY_REVENUE: 'cache_monthly_revenue',
  LISTINGS: 'cache_listings',
};
```

## Cache Expiry

By default, cache expires after 24 hours (`CACHE_MAX_AGE` constant), but this can be adjusted for each data type if needed.

## Usage Examples

### Basic Usage

```javascript
import { CACHE_KEYS, loadFromCache, saveToCache } from '../utils/cacheUtils';

// Fetch data with caching
const fetchDataWithCache = async () => {
  // Try to load from cache first
  const cachedData = await loadFromCache(CACHE_KEYS.RESERVATIONS);
  
  if (cachedData) {
    // Use cached data
    setData(cachedData);
  }
  
  // Fetch fresh data
  const freshData = await fetchFromApi();
  
  // Update UI with fresh data
  setData(freshData);
  
  // Save to cache for next time
  await saveToCache(CACHE_KEYS.RESERVATIONS, freshData);
};
```

### Using the Hook (Recommended Approach)

```javascript
import useCachedData from '../hooks/useCachedData';
import { CACHE_KEYS } from '../utils/cacheUtils';

// Define your fetch function
const fetchMyData = async (params) => {
  // API call logic here
  const result = await apiCall(params);
  return result;
};

// In your component
const {
  data, 
  isLoading,
  isFreshData, 
  error,
  refetch
} = useCachedData(
  CACHE_KEYS.MY_DATA,
  fetchMyData,
  { param1: 'value1', param2: 'value2' }
);

// Use data in your component
useEffect(() => {
  if (data) {
    // Use the data (could be from cache or fresh)
    console.log(`Data is ${isFreshData ? 'fresh' : 'from cache'}`);
  }
}, [data, isFreshData]);

// Trigger a manual refresh when needed
const handleRefresh = () => {
  refetch();
};
```

## Cache Invalidation

Cache is automatically cleared in the following scenarios:

1. When a user logs out (via `clearAllCaches()`)
2. When cache expires (after 24 hours by default)
3. When the app is reinstalled

## Performance Benefits

This caching implementation provides significant performance improvements:

1. **Faster Initial Loads**: App feels responsive immediately on startup
2. **Reduced API Calls**: Minimizes server load and bandwidth usage
3. **Better UX**: Users see content instantly rather than loading screens
4. **Network Resilience**: Basic functionality works even with poor connectivity

## Future Improvements

1. Add selective cache invalidation based on data updates
2. Implement cache compression for larger datasets
3. Add configurable cache expiry times for different data types
4. Implement offline mode that works entirely from cache 