import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Flame, Battery, History, Info, 
  Package, ArrowUpRight, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../api/client';
import GasCylinderVisualization from '../components/GasCylinderVisualization';
import LowGasNotification from '../components/LowGasNotification';
import IoTSystemStatus from '../components/IoTSystemStatus';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { 
  mockCylinderStore, 
  mockHistoricalReadings, 
  mockBookingsStore,
  mockActivitiesStore,
  isMockModeEnabled 
} from '../mock/gasMockData';

export default function Dashboard() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Use the new device status hook
  const deviceStatus = useDeviceStatus(cylinder?.id);

  const fetchDashboardData = async () => {
    try {
      const cylRes = await apiClient.get('/api/users/cylinders');
      if (cylRes.data.length > 0) {
        const primaryCyl = cylRes.data[0];
        setCylinder(primaryCyl);
        const readingsRes = await apiClient.get(`/api/iot/cylinder/${primaryCyl.id}/readings?limit=15`);
        setReadings(readingsRes.data);
      } else if (isMockModeEnabled()) {
        const mockCyl = mockCylinderStore.get();
        setCylinder(mockCyl);
        setReadings(mockHistoricalReadings);
      } else {
        setCylinder(null);
        setReadings([]);
      }

      let active = null;
      if (isMockModeEnabled() && (cylRes.data.length === 0)) {
        const bookings = mockBookingsStore.get();
        active = bookings.find((b: any) => 
          ['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(b.status)
        );
      } else {
        try {
          const bookingsRes = await apiClient.get('/api/bookings');
          active = bookingsRes.data.find((b: any) => 
            ['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(b.status)
          );
        } catch (e) {}
      }
      setActiveBooking(active || null);
      
      const activityList = [];
      if (cylRes.data.length > 0) {
        const cyl = cylRes.data[0];
        activityList.push({
          title: `Cylinder status: ${cyl.status}`,
          time: cyl.last_seen ? new Date(cyl.last_seen).toLocaleTimeString() : 'Just now',
          icon: Flame,
          color: 'text-sky-400 bg-sky-500/10'
        });
      } else if (isMockModeEnabled() && cylRes.data.length === 0) {
        mockActivitiesStore.get().forEach((act) => {
          activityList.push({
            title: act.title,
            time: act.time,
            icon: act.title.includes('level') ? Flame : (act.title.includes('connected') ? Zap : Package),
            color: act.title.includes('low') ? 'text-rose-400 bg-rose-500/10' : 'text-sky-400 bg-sky-500/10'
          });
        });
      }

      if (active) {
        activityList.push({
          title: `Order ${active.booking_id} status: ${active.status}`,
          time: new Date(active.updated_at).toLocaleDateString(),
          icon: Package,
          color: 'text-amber-400 bg-amber-500/10'
        });
      }
      setRecentActivities(activityList);

    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    let unsubscribeCyl: (() => void) | null = null;
    let unsubscribeBookings: (() => void) | null = null;
    let unsubscribeActivities: (() => void) | null = null;

    if (isMockModeEnabled()) {
      unsubscribeCyl = mockCylinderStore.subscribe(() => {
        apiClient.get('/api/users/cylinders').then(res => {
          if (res.data.length === 0) setCylinder(mockCylinderStore.get());
        }).catch(() => setCylinder(mockCylinderStore.get()));
      });

      unsubscribeBookings = mockBookingsStore.subscribe(() => {
        apiClient.get('/api/users/cylinders').then(res => {
          if (res.data.length === 0) {
            const bookings = mockBookingsStore.get();
            const active = bookings.find((b: any) => ['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(b.status));
            setActiveBooking(active || null);
          }
        });
      });

      unsubscribeActivities = mockActivitiesStore.subscribe(() => {
        apiClient.get('/api/users/cylinders').then(res => {
          if (res.data.length === 0) {
            const activityList = mockActivitiesStore.get().map((act: any) => ({
              title: act.title,
              time: act.time,
              icon: act.title.includes('level') ? Flame : (act.title.includes('connected') ? Zap : Package),
              color: act.title.includes('low') ? 'text-rose-400 bg-rose-500/10' : 'text-sky-400 bg-sky-500/10'
            }));
            setRecentActivities(activityList);
          }
        });
      });
    }

    return () => {
      if (unsubscribeCyl) unsubscribeCyl();
      if (unsubscribeBookings) unsubscribeBookings();
      if (unsubscribeActivities) unsubscribeActivities();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 font-medium">Fetching real-time cylinder feeds...</span>
      </div>
    );
  }

  if (!cylinder) {
    return (
      <div className="text-center py-20 bg-slate-850 rounded-3xl border border-slate-800 p-8 max-w-lg mx-auto">
        <Info size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-100">No Cylinders Found</h2>
        <p className="text-slate-400 mt-2">There are no active cylinders associated with your account. Please link your ESP32 device.</p>
      </div>
    );
  }

  // Use values from the device status hook if available, otherwise fallback to cylinder state
  const currentPercent = deviceStatus.percentage > 0 ? deviceStatus.percentage : cylinder.current_percent;
  const isOnline = deviceStatus.isOnline;
  const isEstimated = deviceStatus.isEstimated;
  const lastSeen = deviceStatus.lastUpdated || cylinder.last_seen;

  const chartData = [...readings].reverse().map(r => {
    const d = new Date(r.timestamp);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      percent: Math.round(r.percent)
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Smart Home Dashboard</h2>
          <p className="text-slate-400 text-xs mt-1">Real-time IoT diagnostics and automatic cylinder replenish controls.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-bold text-slate-300">
            {isOnline ? 'IoT LINK: ONLINE' : 'IoT LINK: OFFLINE'}
          </span>
        </div>
      </header>

      {/* IoT Architecture Pipeline */}
      <IoTSystemStatus 
        isOnline={isOnline} 
        isEstimated={isEstimated} 
        lastSeen={lastSeen} 
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visualizations */}
        <div className="lg:col-span-1 space-y-6">

          <GasCylinderVisualization 
            gasLevel={currentPercent}
            weight={cylinder.current_weight}
            status={cylinder.status}
            isConnected={isOnline}
          />
        </div>

        {/* Right Column: Status and Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notification Banner */}
          <LowGasNotification 
            cylinderId={cylinder.id} 
            percentage={currentPercent} 
            isEstimated={isEstimated} 
          />

          {/* Hero Diagnostics Info */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 shrink-0">
                <Battery size={22} className="animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Remaining Gas Weight</span>
                <span className="text-xl font-bold text-slate-100 block mt-1">
                  {cylinder.current_weight ? `${(cylinder.current_weight - cylinder.tare_weight).toFixed(2)} kg` : '...'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Total weight: {cylinder.current_weight?.toFixed(2)} kg</p>
              </div>
            </div>

            <div className="flex items-start gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 shrink-0">
                <Info size={22} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Cylinder Info</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">{cylinder.name} ({cylinder.id})</span>
                <p className="text-[10px] text-slate-500 mt-1">Empty Weight: {cylinder.tare_weight} kg</p>
                <p className="text-[10px] text-slate-500">Max Capacity: {(cylinder.full_weight - cylinder.tare_weight).toFixed(2)} kg</p>
              </div>
            </div>
          </div>

          {activeBooking && (
            <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-md">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
              <div>
                <div className="flex items-center gap-2">
                  <Package className="text-amber-400 animate-bounce" size={18} />
                  <span className="font-bold text-sm text-slate-100">Refill Request In-Progress</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Booking ID <code className="text-sky-400 font-mono text-[11px]">{activeBooking.booking_id}</code> is currently: <span className="font-bold text-slate-200">{activeBooking.status}</span>.
                </p>
              </div>
              <Link to="/bookings" className="px-4 py-2 bg-slate-800 border border-slate-700/50 hover:bg-slate-7.5 text-xs text-sky-400 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all">
                Track Booking <ArrowUpRight size={14} />
              </Link>
            </div>
          )}

          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Gas Consumption Logs</h3>
                <p className="text-[10px] text-slate-500">Load cell variations over time</p>
              </div>
              <Link to="/usage" className="text-sky-400 hover:text-sky-300 font-semibold text-xs flex items-center gap-1">
                View History <History size={14} />
              </Link>
            </div>

            <div className="h-60 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dx={-10} domain={[0, 100]} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff'}} />
                    <Line type="monotone" dataKey="percent" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0284c7', strokeWidth: 1.5, stroke: '#fff'}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Info size={28} className="text-slate-600" />
                  <span className="text-xs">No metrics saved yet.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Activities */}
      <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6">
        <h3 className="font-bold text-slate-100 text-sm mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivities.map((act, idx) => {
            const Icon = act.icon;
            return (
              <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${act.color}`}><Icon size={14} /></div>
                  <span className="font-semibold text-slate-200 block">{act.title}</span>
                </div>
                <span className="text-[10px] text-slate-600 font-bold shrink-0">{act.time}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
