import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoredToken {
  token: string;
  userId: string;
}

class NotificationService {
  private static instance: NotificationService;
  private static FCM_TOKEN_KEY = 'fcm_token';

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword();
      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('[NotificationService] Error getting auth token:', error);
      return null;
    }
  }

  private async getStoredToken(): Promise<StoredToken | null> {
    try {
      const stored = await AsyncStorage.getItem(NotificationService.FCM_TOKEN_KEY);
      console.log('[NotificationService] Retrieved stored value:', stored);
      
      if (!stored || stored.trim() === '') {
        console.log('[NotificationService] No token stored');
        return null;
      }

      try {
        const parsed = JSON.parse(stored);
        
        // Validate the stored data has the correct format
        if (parsed && typeof parsed === 'object' && 'token' in parsed && 'userId' in parsed) {
          return parsed;
        }
        
        console.log('[NotificationService] Stored value is not in correct format, clearing it');
        await AsyncStorage.removeItem(NotificationService.FCM_TOKEN_KEY);
        return null;
      } catch (e) {
        console.log('[NotificationService] Failed to parse stored value, clearing it');
        await AsyncStorage.removeItem(NotificationService.FCM_TOKEN_KEY);
        return null;
      }
    } catch (error) {
      console.error('[NotificationService] Error getting stored FCM token:', error);
      return null;
    }
  }

  private async storeToken(token: string, userId: string): Promise<void> {
    try {
      // We use a single key for storage, so this will always overwrite any existing token
      const storedToken: StoredToken = { token, userId };
      await AsyncStorage.setItem(NotificationService.FCM_TOKEN_KEY, JSON.stringify(storedToken));
      console.log('[NotificationService] FCM token stored successfully for user:', userId);
    } catch (error) {
      console.error('[NotificationService] Error storing FCM token:', error);
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      console.log('[NotificationService] Requesting notification permission...');
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      console.log('[NotificationService] Permission status:', authStatus, 'Enabled:', enabled);
      return enabled;
    } catch (error) {
      console.error('[NotificationService] Error requesting notification permission:', error);
      return false;
    }
  }

  public async getFCMToken(userId: string): Promise<string | null> {
    try {
      console.log('[NotificationService] getFCMToken called for user:', userId);
      if (!userId) {
        console.error('[NotificationService] Cannot get FCM token: userId is required');
        return null;
      }

      // First check if we have a stored token for this user
      const storedToken = await this.getStoredToken();
      if (storedToken && storedToken.token && storedToken.userId === userId) {
        console.log('[NotificationService] Using stored FCM token for user:', userId);
        return storedToken.token;
      }

      // If no stored token or different user, get a new one
      console.log('[NotificationService] No stored token found or different user, requesting new FCM token...');
      const token = await messaging().getToken();
      if (token) {
        console.log('[NotificationService] Successfully fetched new FCM token for user:', userId);
        return token;
      } else {
        console.warn('[NotificationService] FCM token is null or undefined');
        return null;
      }
    } catch (error) {
      console.error('[NotificationService] Error getting FCM token:', error);
      return null;
    }
  }

  public setupForegroundHandler(): void {
    messaging().onMessage(async remoteMessage => {
      // Handle foreground notifications here
    });
  }

  public setupBackgroundHandler(): void {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      // Handle background notifications here
    });
  }

  public setupNotificationOpenedAppHandler(): void {
    messaging().onNotificationOpenedApp(remoteMessage => {
      // Handle when app is opened from a notification
    });
  }

  public async checkInitialNotification(): Promise<void> {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      // Handle when app is opened from a quit state
    }
  }

  public async sendTokenToServer(token: string, userId: string): Promise<boolean> {
    try {
      console.log('[NotificationService] sendTokenToServer called with token:', token, 'for user:', userId);

      // Check if any token exists for this user
      const storedToken = await this.getStoredToken();
      if (storedToken && storedToken.userId && storedToken.userId.toString() === userId.toString()) {
        console.log('[NotificationService] User already has a token registered, skipping server send');
        return true;
      }

      // Get the auth token for the Authorization header
      const authToken = await this.getAuthToken();
      
      if (!authToken) {
        console.warn('[NotificationService] No auth token available for request');
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      console.log('[NotificationService] Sending new FCM token to server...');

      const response = await fetch('https://luxurylodgingpm.co/luxury_lodging_mobile_api/auth/fcm-token', {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      });

      const responseBody = await response.text();
      console.log('[NotificationService] sendTokenToServer response status:', response.status);
      console.log('[NotificationService] sendTokenToServer response body:', responseBody);
      
      if (!response.ok) {
        console.warn('[NotificationService] Failed to save FCM token to server. Status:', response.status);
        return false;
      }

      // Only store the token locally after successful server response
      await this.storeToken(token, userId.toString());
      console.log('[NotificationService] FCM token successfully sent to server and stored locally');
      return true;
    } catch (error) {
      console.error('[NotificationService] Error sending FCM token to server:', error);
      return false;
    }
  }
}

export default NotificationService; 