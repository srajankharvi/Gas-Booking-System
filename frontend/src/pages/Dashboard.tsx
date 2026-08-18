import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Flame, Thermometer, Battery, CalendarPlus, History, Info, 
  AlertTriangle, Settings, Package, ArrowUpRight, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../api/client';
import GasCylinderVisualization from '../components/GasCylinderVisualization';

export default function Dashboard() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      // 1. Get cylinders
      const cylRes = await apiClient.get('/api/users/cylinders');
      if (cylRes.data.length > 0) {
        const primaryCyl = cylRes.data[0];
        setCylinder(primaryCyl);

        // 2. Get readings
        const readingsRes = await apiClient.get(`/api/iot/cylinder/${primaryCyl.id}/readings?limit=15`);
        setReadings(readingsRes.data);
      }

      // 3. Get bookings and find active ones
      const bookingsRes = await apiClient.get('/api/bookings');
      const active = bookingsRes.data.find((b: any) => 
        ['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(b.status)
      );
      setActiveBooking(active || null);
      
      // Generate activities list
      const activityList = [];
      if (cylRes.data.length > 0) {
        const cyl = cylRes.data[0];
        activityList.push({
          title: `Cylinder status: ${cyl.status}`,
          time: cyl.last_seen ? new Date(cyl.last_seen).toLocaleTimeString() : 'Just now',
          icon: Flame,
          color: 'text-sky-400 bg-sky-500/10'
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

    // Setup WebSocket connection for instant update
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return;
    const user = JSON.parse(rawUser);

    const ws = new WebSocket(`ws://127.0.0.1:8000/api/ws/${user.id}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'cylinder_update') {
        setCylinder((prev: any) => {
          if (!prev) return null;
          // Calculate new estimated days
          const burn_rate = prev.burn_rate_ema || 0.05;
          const remaining_gas = Math.max(0.0, data.data.weight - prev.tare_weight);
          const estimated_days = round(remaining_gas / (burn_rate * 24.0), 1);
          
          return {
            ...prev,
            current_weight: data.data.weight,
            current_percent: data.data.percent,
            temperature: data.data.temperature,
            status: data.data.status,
            is_online: data.data.is_online,
            last_seen: data.data.last_seen,
            estimated_days
          };
        });

        // Add new reading to historical state list
        setReadings(prev => {
          const newReading = {
            id: Date.now().toString(),
            cylinder_id: cylinder?.id || '',
            weight: data.data.weight,
            percent: data.data.percent,
            temperature: data.data.temperature,
            timestamp: data.data.last_seen,
            is_estimated: false
          };
          return [newReading, ...prev.slice(0, 14)];
        });
      } else if (data.event === 'booking_update') {
        fetchDashboardData(); // Refresh on booking changes
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const round = (value: number, precision: number) => {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  };

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
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-100">No Cylinders Found</h2>
        <p className="text-slate-400 mt-2">There are no active cylinders associated with your account. Please link your ESP32 device or contact support.</p>
      </div>
    );
  }

  // Format Recharts data (reverse list for timeline flow)
  const chartData = [...readings].reverse().map(r => {
    const d = new Date(r.timestamp);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      percent: Math.round(r.percent)
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Welcome header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Smart Home Dashboard</h2>
          <p className="text-slate-400 text-xs mt-1">Real-time IoT diagnostics and automatic cylinder replenish controls.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${cylinder.is_online ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-bold text-slate-300">
            {cylinder.is_online ? 'IoT LINK: ONLINE' : 'IoT LINK: OFFLINE'}
          </span>
        </div>
      </header>

      {/* Grid of panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: 3D Visualization */}
        <div className="lg:col-span-1">
          <GasCylinderVisualization 
            gasLevel={cylinder.current_percent}
            weight={cylinder.current_weight}
            status={cylinder.status}
            isConnected={cylinder.is_online}
          />
        </div>

        {/* Center/Right Column: Detailed Statuses */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Hero Diagnostics Info */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
            
            {/* Box 1: Estimated Days */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 shrink-0">
                <Battery size={22} className="animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Remaining Gas</span>
                <span className="text-xl font-bold text-slate-100 block mt-1">
                  {cylinder.estimated_days ? `${cylinder.estimated_days} Days` : 'Estimating...'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Based on hourly usage</p>
              </div>
            </div>

            {/* Box 2: Temperature */}
            <div className="flex items-start gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 shrink-0">
                <Thermometer size={22} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Ambient Temp</span>
                <span className="text-xl font-bold text-slate-100 block mt-1">{cylinder.temperature.toFixed(1)}°C</span>
                <p className="text-[10px] text-slate-500 mt-1">LPG safety threshold OK</p>
              </div>
            </div>

            {/* Box 3: Last Sync */}
            <div className="flex items-start gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 shrink-0">
                <Zap size={22} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Last Synchronized</span>
                <span className="text-xs font-bold text-slate-200 block mt-2">
                  {cylinder.last_seen ? new Date(cylinder.last_seen).toLocaleTimeString() : 'Never'}
                </span>
                <span className="text-[9px] text-slate-500 mt-1 block">Online via Wi-Fi</span>
              </div>
            </div>
          </div>

          {/* Active Booking status card */}
          {activeBooking ? (
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
              <Link 
                to={`/bookings`} 
                className="px-4 py-2 bg-slate-800 border border-slate-700/50 hover:bg-slate-7.5 text-xs text-sky-400 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
              >
                Track Booking
                <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : cylinder.current_percent <= 20.0 ? (
            <div className="bg-gradient-to-r from-red-950/40 to-slate-850 border border-red-900/30 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-lg animate-pulse">
              <div>
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle size={18} />
                  <span className="font-bold text-sm">Action Required: Cylinder Low</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5">
                  Capacity is currently at {cylinder.current_percent.toFixed(1)}%. Order a replacement before depleting resources.
                </p>
              </div>
              <Link 
                to="/book" 
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-xs text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Book Cylinder Now
                <CalendarPlus size={14} />
              </Link>
            </div>
          ) : null}

          {/* Recharts history capacity line chart */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Capacity Logs</h3>
                <p className="text-[10px] text-slate-500">Gas level variations inside the load cell over time</p>
              </div>
              <Link to="/usage" className="text-sky-400 hover:text-sky-300 font-semibold text-xs flex items-center gap-1">
                View History
                <History size={14} />
              </Link>
            </div>

            <div className="h-60 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10}} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10}} 
                      dx={-10} 
                      domain={[0, 100]} 
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', color: '#fff'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percent" 
                      stroke="#0ea5e9" 
                      strokeWidth={3} 
                      dot={{r: 4, fill: '#0284c7', strokeWidth: 1.5, stroke: '#fff'}} 
                      activeDot={{r: 6, strokeWidth: 0}}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Info size={28} className="text-slate-600" />
                  <span className="text-xs">No metrics saved yet. Ingest ESP32 feeds.</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Footer section: Quick Actions & Activities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Box 1: Quick Actions */}
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 md:col-span-1">
          <h3 className="font-bold text-slate-100 text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2.5">
            <Link 
              to="/book" 
              className="w-full flex items-center justify-between p-3.5 bg-slate-800/60 border border-slate-700/40 rounded-2xl hover:bg-slate-7.5 hover:border-slate-650 transition-all font-medium text-xs cursor-pointer text-slate-200"
            >
              <span className="flex items-center gap-2">
                <CalendarPlus className="text-sky-400" size={16} />
                Order Cylinder Refill
              </span>
              <ArrowUpRight size={14} className="text-slate-500" />
            </Link>
            <Link 
              to="/settings" 
              className="w-full flex items-center justify-between p-3.5 bg-slate-800/60 border border-slate-700/40 rounded-2xl hover:bg-slate-7.5 hover:border-slate-650 transition-all font-medium text-xs cursor-pointer text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Settings className="text-sky-400" size={16} />
                Calibrate Calibration Weights
              </span>
              <ArrowUpRight size={14} className="text-slate-500" />
            </Link>
          </div>
        </div>

        {/* Box 2: Recent Activity Timeline */}
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 md:col-span-2">
          <h3 className="font-bold text-slate-100 text-sm mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-slate-500 text-xs">No updates to report.</p>
            ) : (
              recentActivities.map((act, idx) => {
                const Icon = act.icon;
                return (
                  <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${act.color}`}>
                        <Icon size={14} />
                      </div>
                      <span className="font-semibold text-slate-200">{act.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-bold shrink-0">{act.time}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
