export const mockProperties = [
  {
    id: 1,
    name: "Luxury Beach House",
    status: "active",
    income: {
      monthly: 5200,
      ytd: 48000,
      trend: +5.2
    },
    occupancy: {
      rate: 85,
      trend: +2.1
    },
    bookings: [
      {
        id: 1,
        checkIn: "2024-11-01",
        checkOut: "2024-11-05",
        guestName: "John Doe",
        amount: 1200
      },
      {
        id: 2,
        checkIn: "2024-11-10",
        checkOut: "2024-11-15",
        guestName: "Jane Smith",
        amount: 1500
      }
    ]
  },
  {
    id: 2,
    name: "Downtown Apartment",
    status: "active",
    income: {
      monthly: 3800,
      ytd: 35000,
      trend: +3.8
    },
    occupancy: {
      rate: 78,
      trend: -1.2
    },
    bookings: [
      {
        id: 3,
        checkIn: "2024-11-03",
        checkOut: "2024-11-08",
        guestName: "Mike Johnson",
        amount: 900
      }
    ]
  }
];

export const mockApi = {
  fetchProperties: () => Promise.resolve(mockProperties),
  fetchIncomeData: (id) => Promise.resolve(mockProperties.find(p => p.id === id)?.income || {}),
  fetchOccupancyData: (id) => Promise.resolve(mockProperties.find(p => p.id === id)?.occupancy || {}),
  fetchBookings: (id) => Promise.resolve(mockProperties.find(p => p.id === id)?.bookings || []),
  fetchPropertyDetails: (id) => Promise.resolve(mockProperties.find(p => p.id === id) || {}),
  fetchReviews: () => Promise.resolve([])
};
