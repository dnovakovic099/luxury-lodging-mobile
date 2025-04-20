import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigation, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View, 
  StyleSheet, 
  StatusBar, 
  SafeAreaView, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity, 
  Text, 
  Platform, 
  UIManager,
  LogBox,
  Animated
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Suppress warnings
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate`',
  'Warning:',
  'Cannot read property',
  'TypeError:',
  'NativeAnimatedModule',
]);

// Disable all animations globally to stabilize app
if (Platform.OS === 'ios') {
  // Override the timing and spring functions to disable animations
  const originalTiming = Animated.timing;
  Animated.timing = (value, config) => {
    return {
      start: (callback) => {
        value.setValue(config.toValue);
        callback && callback({finished: true});
      },
      stop: () => {}
    };
  };

  const originalSpring = Animated.spring;
  Animated.spring = (value, config) => {
    return {
      start: (callback) => {
        value.setValue(config.toValue);
        callback && callback({finished: true});
      },
      stop: () => {}
    };
  };

  const originalLoop = Animated.loop;
  Animated.loop = (animation) => {
    return {
      start: (callback) => {
        callback && callback({finished: true});
      },
      stop: () => {}
    };
  };
}

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingsScreen from './src/screens/ListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import ReservationsScreen from './src/screens/ReservationsScreen';
import SupportScreen from './src/screens/SupportScreen';
import EarnMoreScreen from './src/screens/EarnMoreScreen';
import {ConsultationProvider} from './src/context/ConsultationContext';

// No need for separate SignOutScreen - we'll add a button to HomeScreen instead

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Ionicons.loadFont()
  .then(() => console.log('Ionicons font loaded'))
  .catch(error => console.error('Error loading Ionicons font', error));

const MainTabs = () => (
  <View style={{flex: 1, backgroundColor: '#000000'}}>
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: 'rgba(182, 148, 76, 0.5)',
          borderTopWidth: 1,
          paddingBottom: 12,
          paddingTop: 8,
          height: 64,
          position: 'relative',
          elevation: 0,
          shadowOpacity: 0,
          opacity: 1,
          ...(Platform.OS === 'ios' ? {
            backgroundColor: '#000000',
            borderTopColor: 'rgba(182, 148, 76, 0.5)',
            borderTopWidth: 1,
            shadowColor: 'rgba(182, 148, 76, 0.25)',
            shadowOffset: { height: -1, width: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 0,
          } : {
            borderTopWidth: 1,
            borderTopColor: 'rgba(182, 148, 76, 0.5)',
          }),
        },
        tabBarItemStyle: {
          backgroundColor: '#000000',
        },
        tabBarActiveTintColor: 'rgba(182, 148, 76, 0.7)',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: theme.typography.h2,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShown: false,
        headerTitleAlign: 'center',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 6,
          fontWeight: '400',
          letterSpacing: 0.4,
        },
        animation: 'none',
        animationEnabled: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={24} color={color} style={{fontWeight: '300'}} />
          ),
          title: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Listings"
        component={ListingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={24} color={color} style={{fontWeight: '300'}} />
          ),
        }}
      />
      <Tab.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={24} color={color} style={{fontWeight: '300'}} />
          ),
        }}
      />
      <Tab.Screen
        name="Earn More"
        component={EarnMoreScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={24} color={color} style={{fontWeight: '300'}} />
          ),
        }}
      />
    </Tab.Navigator>
  </View>
);

const Navigation = () => {
  const { userData, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Disable animations
  React.useEffect(() => {
    const disableAnimations = async () => {
      if (Platform.OS === 'ios') {
        UIManager.setLayoutAnimationEnabledExperimental && 
        UIManager.setLayoutAnimationEnabledExperimental(false);
      }
    };
    
    disableAnimations();
    
    // Mark as ready after a short delay to ensure all initialization is complete
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  // Don't render anything until we're ready
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show loading state if auth is loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={require('./src/assets/logo.png')} style={styles.logo} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'none',
        animationEnabled: false,
      }}
    >
      {!userData || !userData.userId ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
        />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="ListingDetail"
            component={ListingDetailScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.colors.surface,
              },
              headerTintColor: theme.colors.primary,
              headerTitleStyle: theme.typography.h2,
              headerBackTitleVisible: true,
              headerBackTitle: "Properties",
              headerTitle: "",
              animation: 'none',
              animationEnabled: false,
            }}
          />
          <Stack.Screen
            name="ReservationDetail"
            component={ReservationsScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.colors.surface,
              },
              headerTintColor: theme.colors.text.primary,
              headerTitleStyle: theme.typography.h2,
              headerBackTitleVisible: false,
              headerTitle: "Reservation Details",
              animation: 'none',
              animationEnabled: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#000000',
      card: '#000000',
      border: theme.colors.primary,
      text: '#FFFFFF',
    },
  };

  return (
    <AuthProvider>
      <ConsultationProvider>
      <SafeAreaProvider style={{backgroundColor: '#000000'}}>
        <View style={{flex: 1, backgroundColor: '#000000'}}>
          <NavigationContainer theme={MyTheme}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            <SafeAreaView style={styles.container} edges={['top']}>
              <Navigation />
            </SafeAreaView>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
      </ConsultationProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    alignSelf: 'center',
    marginBottom: theme.spacing.xl * 2,
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
});

export default App;
