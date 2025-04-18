/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import * as Keychain from 'react-native-keychain';

// Force reset keychain before app starts
// This is a failsafe to ensure no stale auth data remains
(async () => {
  try {
    console.log('Resetting keychain data before app launch...');
    await Keychain.resetGenericPassword();
    console.log('Keychain reset successful');
  } catch (error) {
    console.error('Failed to reset keychain:', error);
  }
})();

AppRegistry.registerComponent(appName, () => App);
