export interface MockCylinder {
  id: string; // CYL-DEMO-001
  cylinderId: string; // ALIAS for id
  deviceId: string; // ESP32-DEMO-001
  name: string; // Kitchen Cylinder
  brand: string; // HP Gas
  current_percent: number; // 32
  gasPercentage: number; // ALIAS for current_percent
  current_weight: number; // 8.2
  currentWeight: number; // ALIAS for current_weight
  tare_weight: number; // 5.0
  emptyWeight: number; // ALIAS for tare_weight
  full_weight: number; // 15.0
  fullWeight: number; // ALIAS for full_weight
  temperature: number; // 28
  status: string; // LOW
  is_online: boolean; // true
  isConnected: boolean; // ALIAS for is_online
  last_seen: string; // Just now
  lastUpdated: string; // ALIAS for last_seen
  estimated_days: string | number; // 6–8
  estimatedDaysRemaining: string; // ALIAS for estimated_days
}

export const isMockModeEnabled = (): boolean => {
  if (!import.meta.env.DEV) return false;
  const localSetting = localStorage.getItem('use_mock_iot');
  if (localSetting !== null) {
    return localSetting === 'true';
  }
  return import.meta.env.VITE_USE_MOCK_IOT !== 'false';
};

const getEstimatedDays = (percent: number): string => {
  if (percent >= 90) return "20–24";
  if (percent >= 70) return "15–18";
  if (percent >= 50) return "10–12";
  if (percent >= 30) return "6–8";
  if (percent >= 20) return "4–5";
  if (percent >= 10) return "2–3";
  if (percent > 0) return "1";
  return "0";
};

let mockCylinder: MockCylinder = {
  id: "CYL-DEMO-001",
  cylinderId: "CYL-DEMO-001",
  deviceId: "ESP32-DEMO-001",
  name: "Kitchen Cylinder",
  brand: "HP Gas",
  current_percent: 32.0,
  gasPercentage: 32.0,
  current_weight: 8.2,
  currentWeight: 8.2,
  tare_weight: 5.0,
  emptyWeight: 5.0,
  full_weight: 15.0,
  fullWeight: 15.0,
  temperature: 28,
  status: "LOW",
  is_online: true,
  isConnected: true,
  last_seen: "Just now",
  lastUpdated: "Just now",
  estimated_days: "6–8",
  estimatedDaysRemaining: "6–8 days"
};

const listeners: (() => void)[] = [];

export const mockCylinderStore = {
  get: () => mockCylinder,
  set: (newVal: Partial<MockCylinder>) => {
    let percent = newVal.current_percent !== undefined ? newVal.current_percent : (newVal.gasPercentage !== undefined ? newVal.gasPercentage : mockCylinder.current_percent);
    percent = Math.max(0.0, Math.min(100.0, percent));
    
    let status = "GOOD";
    if (percent < 10) status = "CRITICAL";
    else if (percent < 20) status = "VERY LOW";
    else if (percent < 40) status = "LOW";
    else if (percent < 70) status = "NORMAL";

    const tare = newVal.tare_weight !== undefined ? newVal.tare_weight : (newVal.emptyWeight !== undefined ? newVal.emptyWeight : mockCylinder.tare_weight);
    const full = newVal.full_weight !== undefined ? newVal.full_weight : (newVal.fullWeight !== undefined ? newVal.fullWeight : mockCylinder.full_weight);
    
    // Recalculate weight based on percentage
    const weight = tare + (percent / 100.0) * (full - tare);
    
    const is_online = newVal.is_online !== undefined ? newVal.is_online : (newVal.isConnected !== undefined ? newVal.isConnected : mockCylinder.is_online);
    
    const temperature = newVal.temperature !== undefined ? newVal.temperature : mockCylinder.temperature;
    const estDays = getEstimatedDays(percent);

    mockCylinder = { 
      ...mockCylinder, 
      ...newVal, 
      current_percent: percent,
      gasPercentage: percent,
      current_weight: parseFloat(weight.toFixed(2)),
      currentWeight: parseFloat(weight.toFixed(2)),
      tare_weight: tare,
      emptyWeight: tare,
      full_weight: full,
      fullWeight: full,
      temperature,
      status,
      is_online,
      isConnected: is_online,
      estimated_days: estDays,
      estimatedDaysRemaining: `${estDays} days`,
      last_seen: "Just now",
      lastUpdated: "Just now"
    };

    listeners.forEach(l => l());
    
    // Add activity if status changed or large level update
    if (newVal.current_percent !== undefined) {
      addMockActivity({
        title: `Gas level updated`,
        time: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detail: `${Math.round(percent)}% Remaining`
      });
      if (percent < 40 && status !== mockCylinder.status) {
        addMockActivity({
          title: `Gas level low`,
          time: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detail: `Reached ${Math.round(percent)}%`
        });
      }
    }
  },
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }
};

// Mock Historical Readings
export const mockHistoricalReadings = [
  { timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(), percent: 82, weight: 13.2 },
  { timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), percent: 70, weight: 12.0 },
  { timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), percent: 53, weight: 10.3 },
  { timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), percent: 41, weight: 9.1 },
  { timestamp: new Date().toISOString(), percent: 32, weight: 8.2 }
];

// Mock Recent Activities Store
let mockRecentActivities = [
  { title: "Gas level updated", time: "Today, 2:05 PM", detail: "32% Remaining" },
  { title: "Cylinder connected", time: "Today, 10:20 AM", detail: "ESP32-DEMO-001 online" },
  { title: "Gas level low", time: "Today, 9:45 AM", detail: "Reached 34%" },
  { title: "Usage recorded", time: "Yesterday, 8:30 PM", detail: "0.2 kg consumed" },
  { title: "Cylinder registered", time: "Aug 10, 2026", detail: "Linked to Kitchen Cylinder" }
];

const activityListeners: (() => void)[] = [];

export const mockActivitiesStore = {
  get: () => mockRecentActivities,
  subscribe: (listener: () => void) => {
    activityListeners.push(listener);
    return () => {
      const idx = activityListeners.indexOf(listener);
      if (idx !== -1) activityListeners.splice(idx, 1);
    };
  }
};

export const addMockActivity = (activity: { title: string, time: string, detail: string }) => {
  mockRecentActivities = [activity, ...mockRecentActivities.slice(0, 8)];
  activityListeners.forEach(l => l());
};

// Mock Bookings Store
const initialBookings = [
  {
    id: "booking-demo-1",
    booking_id: "GAS-DEMO-A1B2",
    cylinder_id: "CYL-DEMO-001",
    status: "Delivered",
    delivery_address: "123 Smart Street, Tech City",
    contact_number: "9876543210",
    delivery_preference: "Standard",
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    timeline: [
      { status: "Pending", timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString() },
      { status: "Confirmed", timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString() },
      { status: "Delivered", timestamp: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() }
    ]
  }
];

// Load bookings from localStorage if exists
let mockBookings = (() => {
  const saved = localStorage.getItem('mock_bookings');
  return saved ? JSON.parse(saved) : initialBookings;
})();

const bookingListeners: (() => void)[] = [];

export const mockBookingsStore = {
  get: () => mockBookings,
  set: (newBookings: any[]) => {
    mockBookings = newBookings;
    localStorage.setItem('mock_bookings', JSON.stringify(newBookings));
    bookingListeners.forEach(l => l());
  },
  add: (booking: any) => {
    const updated = [booking, ...mockBookings];
    mockBookingsStore.set(updated);
  },
  subscribe: (listener: () => void) => {
    bookingListeners.push(listener);
    return () => {
      const idx = bookingListeners.indexOf(listener);
      if (idx !== -1) bookingListeners.splice(idx, 1);
    };
  }
};

// Live Simulation Timer Setup
let simulationInterval: any = null;

export const startLiveSimulation = () => {
  if (simulationInterval) clearInterval(simulationInterval);
  simulationInterval = setInterval(() => {
    if (isMockModeEnabled()) {
      const current = mockCylinderStore.get();
      if (current.is_online && current.current_percent > 0) {
        const nextPercent = Math.max(0, current.current_percent - 0.1);
        mockCylinderStore.set({ current_percent: parseFloat(nextPercent.toFixed(1)) });
      }
    }
  }, 12000); // every 12 seconds
};

// Start immediately on script load
startLiveSimulation();
