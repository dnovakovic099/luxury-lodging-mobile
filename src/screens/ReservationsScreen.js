import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import ReservationsTable from '../components/ReservationsTable';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

const ReservationsScreen = ({ navigation }) => {
  const { reservations, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const validReservations = reservations?.filter(res => 
    VALID_STATUSES.includes(res.status)
  ) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleRowPress = (reservation) => {
    navigation.navigate('ReservationDetail', { reservation });
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.tableContainer}>
        <ReservationsTable 
          reservations={validReservations}
          onRowPress={handleRowPress}
          showPropertyName={true}
          loading={loading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  tableContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
});

export default ReservationsScreen;