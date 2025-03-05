import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {View, StyleSheet, StatusBar, SafeAreaView, ActivityIndicator, Image} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingsScreen from './src/screens/ListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import ReservationsScreen from './src/screens/ReservationsScreen';
import SupportScreen from './src/screens/SupportScreen';
import EarnMoreScreen from './src/screens/EarnMoreScreen';
import {ConsultationProvider} from './src/context/ConsultationContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Ionicons.loadFont()
  .then(() => console.log('Ionicons font loaded'))
  .catch(error => console.error('Error loading Ionicons font', error));

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarStyle: {
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.card.border,
        borderTopWidth: 1,
        paddingBottom: 8,
        paddingTop: 8,
        height: 60,
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.text.secondary,
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
        fontSize: 12,
        marginBottom: 4,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home-outline" size={24} color={color} />
        ),
        title: 'Dashboard',
      }}
    />
    <Tab.Screen
      name="Listings"
      component={ListingsScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="list-outline" size={24} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Reservations"
      component={ReservationsScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="calendar-outline" size={24} color={color} />
        ),
      }}
    />
    {/*<Tab.Screen*/}
    {/*  name="Support"*/}
    {/*  component={SupportScreen}*/}
    {/*  options={{*/}
    {/*    tabBarIcon: ({ color, size }) => (*/}
    {/*      <Ionicons name="chatbubble-outline" size={24} color={color} />*/}
    {/*    ),*/}
    {/*  }}*/}
    {/*/>*/}
    <Tab.Screen
      name="EarnMore"
      component={EarnMoreScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="cash-outline" size={24} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const Navigation = () => {
  const { userData, isLoading } = useAuth();

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
              headerTintColor: theme.colors.text.primary,
              headerTitleStyle: theme.typography.h2,
              headerBackTitleVisible: false,
              headerTitle: "",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ConsultationProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
        <SafeAreaView style={styles.container}>
          <Navigation />
        </SafeAreaView>
      </NavigationContainer>
      </ConsultationProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
