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
import { theme as defaultTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import {ConsultationProvider} from './src/context/ConsultationContext';

// Suppress warnings
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate`',
  'Warning:',
  'Cannot read property',
  'TypeError:',
  'NativeAnimatedModule',
]);

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingsScreen from './src/screens/ListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import ReservationsScreen from './src/screens/ReservationsScreen';
import SupportScreen from './src/screens/SupportScreen';
import EarnMoreScreen from './src/screens/EarnMoreScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AIReportScreen from './src/screens/NewsScreen';

// No need for separate SignOutScreen - we'll add a button to HomeScreen instead

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Ionicons.loadFont()
  .catch(error => console.error('Error loading Ionicons font', error));

const MainTabs = () => {
  const { theme, isDarkMode } = useTheme();
  
  return (
  <View style={{flex: 1, backgroundColor: theme.background}}>
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.tabBar.background,
          borderTopColor: theme.borderColor,
          borderTopWidth: 1,
          paddingBottom: 12,
          paddingTop: 8,
          height: 64,
          position: 'relative',
          elevation: 0,
          shadowOpacity: 0,
          opacity: 1,
          ...(Platform.OS === 'ios' ? {
            backgroundColor: theme.tabBar.background,
            borderTopColor: theme.borderColor,
            borderTopWidth: 1,
            shadowColor: theme.borderColor,
            shadowOffset: { height: -1, width: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 0,
          } : {
            borderTopWidth: 1,
            borderTopColor: theme.borderColor,
          }),
        },
        tabBarItemStyle: {
          backgroundColor: theme.tabBar.background,
        },
        tabBarActiveTintColor: theme.tabBar.active,
        tabBarInactiveTintColor: theme.tabBar.inactive,
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.text.primary,
        headerTitleStyle: defaultTheme.typography.h2,
        contentStyle: {
          backgroundColor: theme.background,
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
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={24} color={color} style={{fontWeight: '300'}} />
          ),
        }}
      />
      <Tab.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today" size={24} color={color} style={{fontWeight: '300'}} />
          ),
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={24} color={color} style={{fontWeight: '300'}} />
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
};

const Navigation = () => {
  const { userData, isLoading: authLoading } = useAuth();
  const { theme, isLoading: themeLoading } = useTheme();
  const [isReady, setIsReady] = useState(false);

  // Update this effect to not disable animations
  React.useEffect(() => {
    // Mark as ready after a short delay to ensure all initialization is complete
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  // Don't render anything until we're ready
  if (!isReady || themeLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Show loading state if auth is loading
  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Image source={require('./src/assets/logo.png')} style={styles.logo} />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.background,
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
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerBackTitleVisible: true,
              headerBackTitle: "Properties",
              headerTitle: "",
              animation: 'none',
              animationEnabled: false,
            }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
              headerShown: false,
              animation: 'none',
              animationEnabled: false,
            }}
          />
          <Stack.Screen
            name="ReservationsList"
            component={ReservationsScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.text.primary,
              headerTitle: "Reservations List",
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
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.text.primary,
              headerTitleStyle: defaultTheme.typography.h2,
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
  const AppWrapper = () => {
    const { theme, isDarkMode } = useTheme();
    
    const MyTheme = {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: theme.background,
        card: theme.card,
        border: theme.borderColor,
        text: theme.text.primary,
      },
    };
    
    return (
      <SafeAreaProvider style={{backgroundColor: theme.background}}>
        <View style={{flex: 1, backgroundColor: theme.background}}>
          <NavigationContainer theme={MyTheme}>
            <StatusBar 
              barStyle={isDarkMode ? "light-content" : "dark-content"} 
              backgroundColor={theme.background} 
            />
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
              <Navigation />
            </SafeAreaView>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    );
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <ConsultationProvider>
          <AppWrapper />
        </ConsultationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    alignSelf: 'center',
    marginBottom: defaultTheme.spacing.xl * 2,
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
});

export default App;
