import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { BarChart3, LineChart as LineIcon, Flame, Calendar } from 'lucide-react';
import { apiClient } from '../api/client';

export default function UsageHistory() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(7); // 7, 30, 90

  const fetchData = async () => {
    try {
      const cylRes = await apiClient.get('/api/users/cylinders');
      if (cylRes.data.length > 0) {
        const cyl = cylRes.data[0];
        setCylinder(cyl);
        const readingsRes = await apiClient.get(`/api/iot/cylinder/${cyl.id}/readings?limit=100&days=${daysFilter}`);
        setReadings(readingsRes.data);
      }
    } catch (err) {
      console.error('Error fetching usage history data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Analyzing consumption logs...</span>
      </div>
    );
  }

  if (!cylinder) return null;

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
    const consumed = maxW - minW > 0 ? maxW - minW : (cylinder.burn_rate_ema || 0.05) * 8.0;
    return {
      date,
      consumed: parseFloat(consumed.toFixed(2))
    };
  });

  const avgDaily = barChartData.length > 0
    ? (barChartData.reduce((sum, item) => sum + item.consumed, 0) / barChartData.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      
      {/* Filters Bar */}
      <div className="flex justify-between items-center bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Usage Filter Timeline</span>
        <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-xl">
          {[
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
            { label: '3 Months', val: 90 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => { setLoading(true); setDaysFilter(item.val); }}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                daysFilter === item.val 
                  ? 'bg-sky-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Flame size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Est. Burn Rate</span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block">{(cylinder.burn_rate_ema || 0.05).toFixed(3)} kg/hr</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Avg. Daily Fuel</span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block">{avgDaily} kg</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Remaining Life</span>
            <span className="text-lg font-black text-slate-950 mt-0.5 block">
              {cylinder.estimated_days ? `${cylinder.estimated_days} Days` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Capacity graph */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <LineIcon className="text-sky-500" size={18} />
            <h3 className="font-extrabold text-slate-900 text-sm">Capacity Progression (%)</h3>
          </div>

          <div className="h-72 w-full">
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData}>
                  <defs>
                    <linearGradient id="progPercent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percent" 
                    name="Gas Level %"
                    stroke="#0ea5e9" 
                    fillOpacity={1}
                    fill="url(#progPercent)"
                    strokeWidth={2.5} 
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No readings data matching selected dates.
              </div>
            )}
          </div>
        </div>

        {/* Daily weight consumption bar graph */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-emerald-550" size={18} />
            <h3 className="font-extrabold text-slate-900 text-sm">Daily Consumption Estimates (kg)</h3>
          </div>

          <div className="h-72 w-full">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000'}}
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
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No consumption records for selected dates.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
