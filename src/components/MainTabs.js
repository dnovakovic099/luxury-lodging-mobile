import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const MainTabs = ({ navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/logo.jpeg')} style={styles.logo} />
        <Text style={styles.logoText}>Luxury Lodging</Text>
      </View>
      <View style={styles.tabBarButtons}>
        <TouchableOpacity
          style={styles.tabBarButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.tabBarButtonText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBarButton}
          onPress={() => navigation.navigate('Listings')}
        >
          <Ionicons name="list-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.tabBarButtonText}>Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBarButton}
          onPress={() => navigation.navigate('Reservations')}
        >
          <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.tabBarButtonText}>Reservations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBarButton}
          onPress={() => navigation.navigate('Support')}
        >
          <Ionicons name="chatbubble-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.tabBarButtonText}>Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.card.border,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  tabBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
  },
  tabBarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
  },
});

export default MainTabs;