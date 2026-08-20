import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Flame, History, Info, 
  Package, ArrowUpRight, Zap, TrendingDown, Cpu
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../api/client';
import GasCylinderVisualization from '../components/GasCylinderVisualization';
import LowGasNotification from '../components/LowGasNotification';
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
      if (isMockModeEnabled() && (!cylRes.data || cylRes.data.length === 0)) {
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
      
      const activityList: any[] = [];
      if (cylRes.data.length > 0) {
        const cyl = cylRes.data[0];
        activityList.push({
          title: `Cylinder status: ${cyl.status}`,
          time: cyl.last_seen ? new Date(cyl.last_seen).toLocaleTimeString() : 'Just now',
          icon: Flame,
          color: 'text-sky-600 bg-sky-50'
        });
      } else if (isMockModeEnabled()) {
        mockActivitiesStore.get().forEach((act) => {
          activityList.push({
            title: act.title,
            time: act.time,
            icon: act.title.includes('level') ? Flame : (act.title.includes('connected') ? Zap : Package),
            color: act.title.includes('low') ? 'text-rose-600 bg-rose-50' : 'text-sky-600 bg-sky-50'
          });
        });
      }

      if (active) {
        activityList.push({
          title: `Order ${active.booking_id} status: ${active.status}`,
          time: new Date(active.updated_at).toLocaleDateString(),
          icon: Package,
          color: 'text-amber-600 bg-amber-50'
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
              color: act.title.includes('low') ? 'text-rose-600 bg-rose-50' : 'text-sky-600 bg-sky-50'
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 font-semibold">Fetching real-time cylinder feeds...</span>
      </div>
    );
  }

  if (!cylinder) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 max-w-lg mx-auto shadow-sm">
        <Info size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-black text-slate-900">No Cylinders Linked</h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">There are no active cylinders associated with your account. Please configure your ESP32 device.</p>
        <Link to="/simulator" className="mt-5 inline-flex px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-colors">
          Configure Simulator
        </Link>
      </div>
    );
  }

  // Use values from the device status hook if available, otherwise fallback to cylinder state
  const currentPercent = deviceStatus.percentage > 0 ? deviceStatus.percentage : cylinder.current_percent;
  const isOnline = deviceStatus.isOnline;
  const isEstimated = deviceStatus.isEstimated;

  const chartData = [...readings].reverse().map(r => {
    const d = new Date(r.timestamp);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      percent: Math.round(r.percent)
    };
  });

  const remainingGasKg = cylinder.current_weight ? Math.max(0, cylinder.current_weight - cylinder.tare_weight).toFixed(2) : '0.00';
  const totalCapacityKg = (cylinder.full_weight - cylinder.tare_weight).toFixed(2);
  const estimatedDays = isOnline ? (mockCylinderStore.get().estimated_days || '6') : '6';

  return (
    <div className="space-y-6">
      
      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: LPG Remaining */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">LPG Remaining</span>
            <span className="text-2xl font-black text-slate-950 block mt-1.5">{remainingGasKg} kg</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">{Math.round(currentPercent)}% capacity</span>
        </div>

        {/* KPI 2: Estimated Remaining */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Est. Remaining</span>
            <span className="text-2xl font-black text-slate-950 block mt-1.5">{estimatedDays} Days</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">Based on recent usage</span>
        </div>

        {/* KPI 3: Daily Consumption */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Daily Consumption</span>
            <span className="text-2xl font-black text-slate-950 block mt-1.5">0.82 kg/day</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
            <TrendingDown size={12} /> 8.2% this week
          </span>
        </div>

        {/* KPI 4: IoT Status */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">IoT Status</span>
            <span className={`text-2xl font-black block mt-1.5 ${isOnline ? 'text-emerald-600' : 'text-rose-500'}`}>
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">
            Updated {isOnline ? '12 sec ago' : '6h ago'}
          </span>
        </div>

      </div>

      {/* 2. Main Row: Cylinder Card & Prediction Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual Cylinder Card */}
        <div className="lg:col-span-1 flex flex-col">
          <GasCylinderVisualization 
            gasLevel={currentPercent}
            weight={cylinder.current_weight}
            status={cylinder.status}
            isConnected={isOnline}
          />
        </div>

        {/* Right Column: Alerts, Predictions, and Consumption Chart */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notification Banner */}
          <LowGasNotification 
            cylinderId={cylinder.id} 
            percentage={currentPercent} 
            isEstimated={isEstimated} 
          />

          {/* Active Refill Request Status */}
          {activeBooking && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
              <div>
                <div className="flex items-center gap-2">
                  <Package className="text-amber-500" size={16} />
                  <span className="font-extrabold text-sm text-slate-900">Refill Request In-Progress</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Booking ID <code className="text-sky-600 font-mono text-[11px]">{activeBooking.booking_id}</code> is currently: <span className="font-bold text-slate-700">{activeBooking.status}</span>.
                </p>
              </div>
              <Link to="/bookings" className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 text-xs text-sky-600 font-extrabold rounded-xl flex items-center gap-1 cursor-pointer transition-all">
                Track Booking <ArrowUpRight size={14} />
              </Link>
            </div>
          )}

          {/* Smart Refill Prediction & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Prediction Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-500 mb-3">
                  <Cpu size={18} />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-950">Smart Refill Prediction</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Based on recent daily usage levels, your LPG consumption patterns predict:
                </p>
                <div className="space-y-2.5 text-xs text-slate-700 border-y border-slate-100 py-3.5 mb-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Average usage</span>
                    <span className="font-bold">0.82 kg/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Estimated empty date</span>
                    <span className="font-bold text-rose-600">August 26, 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Recommended booking</span>
                    <span className="font-bold text-amber-600">August 23, 2026</span>
                  </div>
                </div>
              </div>
              <Link 
                to="/book" 
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black text-center shadow-md shadow-sky-500/10 transition-all cursor-pointer"
              >
                Book New Cylinder
              </Link>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-500 mb-3">
                  <Zap size={18} />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-950">Quick Actions</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Trigger automated refill booking requests or check detailed telemetry diagnostics.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link to="/book" className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black text-center transition-colors cursor-pointer">
                  + Book LPG
                </Link>
                <Link to="/usage" className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black text-center transition-colors cursor-pointer">
                  View Usage
                </Link>
                <Link to="/bookings" className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black text-center transition-colors cursor-pointer">
                  My Bookings
                </Link>
                <Link to="/iot" className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black text-center transition-colors cursor-pointer">
                  IoT Device
                </Link>
              </div>
            </div>

          </div>

          {/* Consumption Line Chart Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-slate-950 text-sm">LPG Consumption</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Load cell variations over time</p>
              </div>
              <Link to="/usage" className="text-sky-500 hover:text-sky-600 font-bold text-xs flex items-center gap-1">
                View History <History size={14} />
              </Link>
            </div>

            <div className="h-56 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dx={-10} domain={[0, 100]} />
                    <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000'}} />
                    <Area type="monotone" dataKey="percent" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorPercent)" strokeWidth={2.5} dot={{r: 3, fill: '#0ea5e9', strokeWidth: 1.5, stroke: '#fff'}} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Info size={28} className="text-slate-300" />
                  <span className="text-xs font-semibold">No metrics saved yet.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Bottom Row: Recent Activity & Cylinder Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity List */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-950 text-sm mb-5">Recent Activity</h3>
          <div className="space-y-5">
            {recentActivities.map((act, idx) => {
              const Icon = act.icon;
              return (
                <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${act.color}`}><Icon size={14} /></div>
                    <span className="font-semibold text-slate-800 block">{act.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">{act.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cylinder Technical Info */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-950 text-sm mb-4">Cylinder Information</h3>
          
          <div className="space-y-3.5 text-xs text-slate-600">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-bold text-slate-400">Cylinder ID</span>
              <span className="font-extrabold text-slate-800">GT-CYL-001</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-bold text-slate-400">Capacity</span>
              <span className="font-extrabold text-slate-800">{totalCapacityKg} kg</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-bold text-slate-400">Current LPG</span>
              <span className="font-extrabold text-slate-800">{remainingGasKg} kg</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-bold text-slate-400">Total Weight</span>
              <span className="font-extrabold text-slate-800">{cylinder.current_weight?.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="font-bold text-slate-400">Last Measurement</span>
              <span className="font-extrabold text-slate-800">12 seconds ago</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
