// services/api.js
const API_BASE_URL = 'https://api.hostaway.com/v1';
let accessToken = null;

export const authenticateUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      accessToken = data.accessToken;
      return {
        userId: data.userId,
        email: data.email,
        accessToken: data.accessToken,
      };
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

export const fetchAccessToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/accessTokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&client_id=64614&client_secret=b637e4a97f831428501b0519783608b3a3af24d40ad2fba8281d9a131802e036&scope=general',
    });

    if (response.ok) {
      const data = await response.json();
      accessToken = data.access_token;
    } else {
      console.error('Error fetching access token:', response);
      if (response.status === 401) {
        console.error('Unauthorized. Please check your client credentials and permissions.');
      }
    }
  } catch (error) {
    console.error('Error fetching access token:', error);
  }
};

export const fetchListings = async (userId) => {
  await fetchAccessToken();
  try {
    const response = await fetch(`${API_BASE_URL}/listings?userId=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Cache-control': 'no-cache',
      },
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch listings', response);
  } catch (error) {
    console.error('Error fetching listings:', error);
    throw error;
  }
};

export const fetchReservations = async (params) => {
  await fetchAccessToken();
  try {
    if (!params.listingId) {
      throw new Error('Listing ID is required');
    }

    params.limit = 1000000;

    let url = `${API_BASE_URL}/reservations?listingId=${params.listingId}`;
    const queryParams = Object.entries(params)
      .filter(([key, value]) => key !== 'listingId' && value != null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);

    if (queryParams.length) {
      url += '&' + queryParams.join('&');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Cache-control': 'no-cache',
      },
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch reservations');
  } catch (error) {
    console.error('Error fetching reservations:', error);
    throw error;
  }
};

export const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Cache-control': 'no-cache',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error('Failed to fetch users');
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};