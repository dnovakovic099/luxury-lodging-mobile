import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  RefreshControl, 
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import RevenueSummary from '../components/RevenueSummary';
import RevenueChart from '../components/RevenueChart';
import ListingActions from '../components/ListingActions';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { processRevenueData, getChartLabels } from '../utils/revenueUtils';

const HomeScreen = () => {
  const { reservations, refreshData, isLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

  // Mock data for listing actions
  const mockActions = [
    {
      date: '2024-03-27T14:30:00',
      listingName: 'Beach House',
      action: 'Updated pricing by adjusting the Base Rate by +5%'
    },
    {
      date: '2024-03-27T10:15:00',
      listingName: 'Mountain Cabin',
      action: 'Auditing new booking - Investigating potential income in March and April'
    },
    {
      date: '2024-03-26T16:45:00',
      listingName: 'Downtown Loft',
      action: 'Updating Cancellation Policy to Strict'
    }
  ];

  const processData = () => {
    if (!reservations) return;
    
    const currentYear = new Date().getFullYear();
    const validReservations = reservations.filter(res => 
      VALID_STATUSES.includes(res.status) && 
      new Date(res.arrivalDate).getFullYear() === currentYear
    );

    const resos = validReservations.map(r => ({ 
      arrival: r.arrivalDate, 
      price: r.airbnbExpectedPayoutAmount || r.totalPrice 
    })).sort((a, b) => new Date(a.arrival) - new Date(b.arrival));

    const groupByMonth = (data) => {
      const totals = data.reduce((acc, item) => {
        const date = new Date(item.arrival);
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        const monthYear = `${month} ${year}`;

        if (!acc[monthYear]) {
          acc[monthYear] = 0;
        }
        acc[monthYear] += item.price;
        return acc;
      }, {});

      return Object.entries(totals).map(([monthYear, total]) => ({
        monthYear,
        total
      }));
    };

    const groupedPrices = groupByMonth(resos);
    
    const ytdRevenue = validReservations.reduce((sum, res) => 
      sum + (res.airbnbExpectedPayoutAmount || res.totalPrice), 0);
    setRevenue(ytdRevenue);

    const processedData = processRevenueData(reservations);
    setChartData(processedData);
  };

  useEffect(() => {
    processData();
  }, [reservations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const summaryData = {
    grossRevenue: revenue,
    revenueChange: 12.5,
    averageRating: 4.8,
    totalExpenses: 45000,
    expensesChange: -5.2,
    revenueSharing: {
      amount: 12500,
      change: 8.3
    }
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (!chartData || !chartData[selectedPeriod]) {
      return null;
    }

    return (
      <RevenueChart 
        data={{ 
          monthlyRevenue: chartData[selectedPeriod].data,
          labels: getChartLabels(selectedPeriod),
          total: chartData[selectedPeriod].total,
        }}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      >
        <ListingActions actions={mockActions} />
        
        <View style={styles.summaryContainer}>
          <RevenueSummary data={summaryData} loading={isLoading} />
        </View>

        <View style={styles.chartSection}>
          {renderChart()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flexGrow: 1,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chartSection: {
    marginTop: 24,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default HomeScreen;