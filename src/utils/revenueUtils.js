// utils/revenueUtils.js

const roundRevenue = (amount) => Math.round(amount);

const VALID_STATUSES = ['new', 'modified', 'ownerStay'];

export const moneyFormatter = (amount) => {
    const formatter = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    });
  
    return formatter.format(amount);
}
  

export const processRevenueData = (reservations) => {
  if (!reservations || !Array.isArray(reservations)) {
    return null;
  }

  // Filter reservations by status
  const validReservations = reservations.filter(reservation => 
    VALID_STATUSES.includes(reservation.status)
  );

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(now.getFullYear() - 3);

  // Initialize data structure
  const weekData = new Array(7).fill(0);
  const monthData = new Array(4).fill(0);
  const threeMonthData = new Array(3).fill(0);
  const sixMonthData = new Array(6).fill(0);
  const yearData = new Array(4).fill(0);
  const allTimeData = new Array(4).fill(0);

  // Initialize totals
  let weekTotal = 0;
  let monthTotal = 0;
  let threeMonthTotal = 0;
  let sixMonthTotal = 0;
  let yearTotal = 0;
  let allTimeTotal = 0;

  validReservations.forEach(reservation => {
    const arrivalDate = new Date(reservation.arrivalDate);
    const totalPrice = reservation.airbnbExpectedPayoutAmount || reservation.totalPrice;

    // console.log({ name: `${reservation.guestFirstName} ${reservation.guestLastName}`,arrivalDate, airbnbIncome: reservation.airbnbExpectedPayoutAmount, totalPrice, channel: reservation.channelName })

    // Last 7 days - group by actual days
    if (arrivalDate >= sevenDaysAgo) {

      const dayIndex = 6 - Math.floor((now - arrivalDate) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        weekData[dayIndex] += totalPrice;
        weekTotal += totalPrice;
      }
    }

    // Last 30 days - group by weeks (recent to oldest)
    if (arrivalDate >= thirtyDaysAgo) {
      const weekIndex = 3 - Math.floor((now - arrivalDate) / (1000 * 60 * 60 * 24 * 7));
      if (weekIndex >= 0 && weekIndex < 4) {
        monthData[weekIndex] += totalPrice;
        monthTotal += totalPrice;
      }
    }

    // Last 3 months - group by months
    if (arrivalDate >= threeMonthsAgo) {
      const monthIndex = 2 - Math.floor(
        ((now.getFullYear() - arrivalDate.getFullYear()) * 12 + 
        (now.getMonth() - arrivalDate.getMonth()))
      );
      if (monthIndex >= 0 && monthIndex < 3) {
        threeMonthData[monthIndex] += totalPrice;
        threeMonthTotal += totalPrice;
      }
    }

    // Last 6 months - group by months
    if (arrivalDate >= sixMonthsAgo) {
      const monthIndex = 5 - Math.floor(
        ((now.getFullYear() - arrivalDate.getFullYear()) * 12 + 
        (now.getMonth() - arrivalDate.getMonth()))
      );
      if (monthIndex >= 0 && monthIndex < 6) {
        sixMonthData[monthIndex] += totalPrice;
        sixMonthTotal += totalPrice;
      }
    }

    // Last year - group by quarters
    if (arrivalDate >= oneYearAgo) {
      const monthDiff = (now.getFullYear() - arrivalDate.getFullYear()) * 12 + 
                       (now.getMonth() - arrivalDate.getMonth());
      const quarterIndex = 3 - Math.floor(monthDiff / 3);
      if (quarterIndex >= 0 && quarterIndex < 4) {
        yearData[quarterIndex] += totalPrice;
        yearTotal += totalPrice;
      }
    }

    // All time (last 3 years) - group by years
    if (arrivalDate >= threeYearsAgo) {
      const yearIndex = 3 - (now.getFullYear() - arrivalDate.getFullYear());
      if (yearIndex >= 0 && yearIndex < 4) {
        allTimeData[yearIndex] += totalPrice;
        allTimeTotal += totalPrice;
      }
    }
  });

  return {
    '1W': {
      data: weekData.map(roundRevenue),
      total: roundRevenue(weekTotal)
    },
    '1M': {
      data: monthData.map(roundRevenue),
      total: roundRevenue(monthTotal)
    },
    '3M': {
      data: threeMonthData.map(roundRevenue),
      total: roundRevenue(threeMonthTotal)
    },
    '6M': {
      data: sixMonthData.map(roundRevenue),
      total: roundRevenue(sixMonthTotal)
    },
    '1Y': {
      data: yearData.map(roundRevenue),
      total: roundRevenue(yearTotal)
    },
    'ALL': {
      data: allTimeData.map(roundRevenue),
      total: roundRevenue(allTimeTotal)
    }
  };
};

export const getChartLabels = (selectedPeriod) => {
  const now = new Date();
  
  switch(selectedPeriod) {
    case '1W': {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
    }
    case '1M': {
      return ['Week 4', 'Week 3', 'Week 2', 'Week 1'];
    }
    case '3M': {
      return Array.from({ length: 3 }, (_, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (2 - i));
        return date.toLocaleDateString('en-US', { month: 'short' });
      });
    }
    case '6M': {
      return Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (5 - i));
        return date.toLocaleDateString('en-US', { month: 'short' });
      });
    }
    case '1Y': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      return Array.from({ length: 4 }, (_, i) => {
        const quarterNumber = ((currentQuarter - 3 + i + 4) % 4) + 1;
        return `Q${quarterNumber}`;
      });
    }
    case 'ALL': {
      return Array.from({ length: 4 }, (_, i) => {
        const date = new Date(now);
        date.setFullYear(date.getFullYear() - (3 - i));
        return date.getFullYear().toString();
      });
    }
    default:
      return [];
  }
};

export const calculateRevenueFromStoredReservations = (reservations, dateRange) => {
  if (!reservations) return 0;

  const validReservations = reservations.filter(reservation => 
    VALID_STATUSES.includes(reservation.status) &&
    isWithinDateRange(reservation.arrivalDate, dateRange)
  );

  return validReservations.reduce((sum, reservation) => 
    sum + reservation.totalPrice, 0
  );
};

const isWithinDateRange = (date, range) => {
  if (!range) return true;
  const checkDate = new Date(date);
  return checkDate >= new Date(range.arrivalStartDate) && 
         checkDate <= new Date(range.arrivalEndDate);
};