import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Info } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function Dashboard() {
  const [device, setDevice] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deviceRes, readingsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/devices/default`),
          axios.get(`${API_BASE_URL}/readings/?limit=20`)
        ]);
        setDevice(deviceRes.data);
        setReadings(readingsRes.data);
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading live data from cylinder...</div>;
  }

  // Use real data, or fallback if empty
  const latestReading = readings.length > 0 ? readings[0] : null;
  const percent = latestReading ? Math.round(latestReading.percent) : 0;
  const currentWeight = latestReading ? latestReading.weight.toFixed(2) : (device?.full_weight || 29.2).toFixed(2);
  const tareWeight = device?.tare_weight || 15.0;
  const gasWeight = latestReading ? (latestReading.weight - tareWeight).toFixed(2) : ((device?.full_weight || 29.2) - tareWeight).toFixed(2);
  
  // Format history for chart (oldest to newest for correct X axis plotting)
  const chartData = [...readings].reverse().map(r => {
    const d = new Date(r.timestamp);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      percent: Math.round(r.percent)
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cylinder Status</h1>
        <p className="text-slate-500 mt-1">Live monitoring of your LPG cylinder capacity and consumption.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Realistic Cylinder View */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-lg border border-slate-100 p-8 flex flex-col items-center relative overflow-hidden">
          
          <h2 className="text-lg font-bold text-slate-700 mb-8">Live Capacity</h2>
          
          {/* Cylinder CSS Container */}
          <div className="relative w-40 h-80 flex flex-col items-center">
            <div className="w-16 h-8 border-4 border-red-500 rounded-t-xl z-10 flex justify-center -mb-2">
              <div className="w-6 h-6 bg-slate-300 rounded-full mt-2 shadow-inner"></div>
            </div>
            
            <div className="relative w-full flex-1 bg-red-600 rounded-[40px] shadow-[inset_-15px_0_30px_rgba(0,0,0,0.2),inset_15px_0_30px_rgba(255,255,255,0.4)] overflow-hidden border-2 border-red-700">
              <div className="absolute top-1/4 w-full h-8 bg-white opacity-90 shadow-sm z-20"></div>

              <div 
                className="absolute bottom-0 w-full transition-all duration-1000 ease-out bg-gradient-to-t from-blue-600 to-blue-400 opacity-90"
                style={{ height: `${percent}%` }}
              >
                <div className="absolute top-0 w-full h-4 bg-blue-300 opacity-50 rounded-[50%] -mt-2 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              </div>

              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 pointer-events-none"></div>

              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none drop-shadow-md">
                <span className="text-4xl font-black text-white mix-blend-overlay">{percent}%</span>
              </div>
            </div>
          </div>

          <div className="mt-8 w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500 font-medium">Gross Weight</span>
              <span className="text-sm font-bold text-slate-700">{currentWeight} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 font-medium">Net Gas</span>
              <span className="text-sm font-bold text-brand-600">{Math.max(0, parseFloat(gasWeight)).toFixed(2)} kg</span>
            </div>
          </div>
          
          {percent <= 15 && (
            <div className="mt-4 w-full flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-semibold border border-red-100 shadow-sm">
              <AlertTriangle size={20} className="shrink-0" />
              Low Gas Warning. Auto-booking triggered.
            </div>
          )}
        </div>

        {/* Info & Chart Cards */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className={`bg-white rounded-3xl shadow-md border border-slate-100 p-6 flex items-start gap-4 ${device?.is_online ? '' : 'opacity-80'}`}>
            <div className={`p-3 rounded-full ${device?.is_online ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {device?.is_online ? 'System Online' : 'System Offline (Estimating)'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {device?.is_online 
                  ? 'Your device is actively monitoring the cylinder. It will automatically book a refill when the gas level drops below 15%.'
                  : 'Your device is offline. The system is using Machine Learning to estimate your current gas level based on your historical burn rate.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8">
            <h3 className="font-bold text-slate-800 text-xl mb-6">Consumption History</h3>
            <div className="h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percent" 
                      stroke="#0ea5e9" 
                      strokeWidth={4} 
                      dot={{r: 5, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff'}} 
                      activeDot={{r: 8, strokeWidth: 0}}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No readings recorded yet. Connect your ESP32 to start monitoring!
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
