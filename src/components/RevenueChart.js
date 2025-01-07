import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  Animated,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';
import { moneyFormatter } from '../utils/revenueUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH;
const PERIODS = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

const PeriodButton = ({ period, isSelected, onPress }) => {
  const animationValue = React.useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(animationValue, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start();
  }, [isSelected]);

  const backgroundColor = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', theme.colors.primary]
  });

  const textColor = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.text.secondary, theme.colors.background]
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.periodButton, { backgroundColor }]}>
        <Animated.Text style={[styles.periodButtonText, { color: textColor }]}>
          {period}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const RevenueChart = ({ data, loading, selectedPeriod, onPeriodChange }) => {
  const [tooltipData, setTooltipData] = useState(null);
  const maxValue = Math.max(...data.monthlyRevenue);
  const yAxisSuffix = maxValue > 1000000 ? 'M' : 'K';
  const yAxisDivider = maxValue > 1000000 ? 1000000 : 1000;

  const calculateGrowth = () => {
    const firstValue = data.monthlyRevenue[0];
    const lastValue = data.monthlyRevenue[data.monthlyRevenue.length - 1];
    const growth = ((lastValue - firstValue) / firstValue) * 100;
    return growth.toFixed(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Revenue Trend</Text>
          <View style={styles.titleBadge}>
            <Ionicons name="trending-up" size={14} color={theme.colors.primary} />
            {/* <Text style={styles.titleBadgeText}>
              {calculateGrowth()}%
            </Text> */}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodSelectorContainer}
        >
          <View style={styles.periodSelector}>
            {PERIODS.map((period) => (
              <PeriodButton
                key={period}
                period={period}
                isSelected={selectedPeriod === period}
                onPress={() => onPeriodChange(period)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: data.labels,
            datasets: [{
              data: data.monthlyRevenue
            }]
          }}
          width={SCREEN_WIDTH - theme.spacing.md}
          height={240}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(182, 148, 76, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: theme.colors.primary,
              strokeOpacity: 0.3,
              fill: theme.colors.surface,
            },
            propsForBackgroundLines: {
              stroke: theme.colors.chart.grid,
              strokeDasharray: '4',
              strokeOpacity: 0.1,
            },
            propsForLabels: {
              fontSize: 10,
              fontWeight: '500',
            },
            formatYLabel: (value) => `$${(value/yAxisDivider).toFixed(1)}${yAxisSuffix}`,
            fillShadowGradient: theme.colors.primary,
            fillShadowGradientOpacity: 0.05,
            paddingLeft: 15,
            paddingRight: 15,
          }}
          bezier
          style={styles.chart}
          withHorizontalLines={true}
          withVerticalLines={false}
          withInnerLines={true}
          fromZero
          segments={5}
          getDotColor={(dataPoint, dataPointIndex) => {
            return dataPointIndex === data.monthlyRevenue.length - 1 
              ? theme.colors.primary 
              : theme.colors.surface;
          }}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Revenue</Text>
          <Text style={styles.legendValue}>
            {moneyFormatter(data.total.toFixed(1))}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.lg,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  titleBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginLeft: 4,
    fontSize: 12,
  },
  periodSelectorContainer: {
    paddingRight: theme.spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
  },
  periodButtonText: {
    ...theme.typography.caption,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  chartContainer: {
    paddingLeft: theme.spacing.lg,
  },
  chart: {
    marginLeft: -theme.spacing.md,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  legendText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.sm,
  },
  legendValue: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default RevenueChart;