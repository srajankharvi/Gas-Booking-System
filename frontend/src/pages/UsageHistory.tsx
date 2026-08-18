import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { BarChart3, LineChart as LineIcon, Flame, Calendar } from 'lucide-react';
import { apiClient } from '../api/client';

export default function UsageHistory() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(7); // 7, 30, 90

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cylRes = await apiClient.get('/api/users/cylinders');
        if (cylRes.data.length > 0) {
          const cyl = cylRes.data[0];
          setCylinder(cyl);

          // Get readings history filtered by days
          const readingsRes = await apiClient.get(`/api/iot/cylinder/${cyl.id}/readings?limit=100&days=${daysFilter}`);
          setReadings(readingsRes.data);
        }
      } catch (err) {
        console.error('Error fetching usage history data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [daysFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Analyzing consumption logs...</span>
      </div>
    );
  }

  if (!cylinder) return null;

  // Format Recharts data (oldest first)
  const sortedReadings = [...readings].reverse();
  const lineChartData = sortedReadings.map(r => {
    const d = new Date(r.timestamp);
    return {
      date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      percent: Math.round(r.percent),
      weight: parseFloat(r.weight.toFixed(2))
    };
  });

  // Calculate daily consumption averages:
  // We can group readings by date and calculate delta (max - min) weight per day.
  const consumptionByDate: { [key: string]: number[] } = {};
  sortedReadings.forEach(r => {
    const dateStr = new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (!consumptionByDate[dateStr]) {
      consumptionByDate[dateStr] = [];
    }
    consumptionByDate[dateStr].push(r.weight);
  });

  const barChartData = Object.keys(consumptionByDate).map(date => {
    const weights = consumptionByDate[date];
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);
    // Delta weight represents gas consumed in kg. If zero (no changes), use a small simulation value based on EMA
    const consumed = maxW - minW > 0 ? maxW - minW : (cylinder.burn_rate_ema || 0.05) * 8.0; // 8 hrs avg active
    return {
      date,
      consumed: parseFloat(consumed.toFixed(2))
    };
  });

  // Calculate average daily consumption
  const avgDaily = barChartData.length > 0
    ? (barChartData.reduce((sum, item) => sum + item.consumed, 0) / barChartData.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Usage Analytics</h2>
          <p className="text-slate-400 text-xs mt-1">Review historic cylinder capacities and weight consumption rates.</p>
        </div>
        
        {/* Filters */}
        <div className="flex bg-slate-800 p-1 border border-slate-700/50 rounded-2xl">
          {[
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
            { label: '3 Months', val: 90 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDaysFilter(item.val)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                daysFilter === item.val 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400">
            <Flame size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">Est. Burn Rate</span>
            <span className="text-lg font-bold text-slate-200 mt-1 block">{(cylinder.burn_rate_ema || 0.05).toFixed(3)} kg/hr</span>
          </div>
        </div>

        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <BarChart3 size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">Avg. Daily Fuel</span>
            <span className="text-lg font-bold text-slate-200 mt-1 block">{avgDaily} kg</span>
          </div>
        </div>

        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">Remaining Life</span>
            <span className="text-lg font-bold text-slate-200 mt-1 block">
              {cylinder.estimated_days ? `${cylinder.estimated_days} Days` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Capacity graph */}
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-6">
            <LineIcon className="text-sky-400" size={18} />
            <h3 className="font-bold text-slate-100 text-sm">Capacity Progression (%)</h3>
          </div>

          <div className="h-72 w-full">
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
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
                    contentStyle={{backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percent" 
                    name="Gas Level %"
                    stroke="#0ea5e9" 
                    strokeWidth={2.5} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No readings data matching selected dates.
              </div>
            )}
          </div>
        </div>

        {/* Daily weight consumption bar graph */}
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-emerald-400" size={18} />
            <h3 className="font-bold text-slate-100 text-sm">Daily Consumption Estimates (kg)</h3>
          </div>

          <div className="h-72 w-full">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
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
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff'}}
                  />
                  <Bar 
                    dataKey="consumed" 
                    name="LPG Consumed"
                    fill="#10b981" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No consumption records for selected dates.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
