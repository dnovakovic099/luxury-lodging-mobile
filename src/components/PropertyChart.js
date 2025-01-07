import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../theme';

const PropertyChart = ({ data = [] }) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  const chartData = {
    labels: monthNames,
    datasets: [{
      data: Array(6).fill().map(() => Math.random() * 5000 + 3000)
    }]
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.colors.card.backgroundGradient}
        style={styles.gradient}
      >
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - (theme.spacing.md * 4)}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
            style: {
              borderRadius: theme.borderRadius.lg,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: theme.colors.primary,
            },
            propsForBackgroundLines: {
              stroke: theme.colors.chart.grid,
              strokeDasharray: '6',
            },
            propsForLabels: {
              fontFamily: Platform.select({ ios: 'Helvetica', android: 'normal' }),
              fontSize: 12,
            },
          }}
          bezier
          style={styles.chart}
          withShadow={false}
          withVerticalLines={false}
          segments={5}
          formatYLabel={(value) => `$${(parseInt(value)/1000).toFixed(0)}k`}
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  gradient: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  }
});

export default PropertyChart;