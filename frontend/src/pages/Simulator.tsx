import { useState, useEffect } from 'react';
import { Terminal, RadioOff, ShieldAlert, Truck, Sparkles, Sliders } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Simulator() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  
  const fetchCylinder = async () => {
    try {
      const res = await apiClient.get('/api/users/cylinders');
      if (res.data.length > 0) {
        setCylinder(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinder();
  }, []);

  const triggerAction = async (action: string, extraParams: any = {}) => {
    if (!cylinder) return;
    setStatusMsg('Sending simulator packet...');
    try {
      const res = await apiClient.post('/api/simulator/action', {
        action,
        cylinder_id: cylinder.id,
        ...extraParams
      });
      setStatusMsg(res.data.message || 'State updated.');
      
      // Refresh local cylinder configuration state
      await fetchCylinder();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || 'Simulation packet failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold font-mono">Initializing simulator panel...</span>
      </div>
    );
  }

  if (!cylinder) {
    return (
      <div className="text-center py-20 bg-slate-850 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <ShieldAlert size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-100">No Cylinders Configured</h2>
        <p className="text-slate-400 mt-2">Cannot simulate feeds. Register a standard user account to link a cylinder.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Dev warning tag */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Terminal className="text-amber-400 animate-pulse" size={20} />
          <div>
            <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider">Development Environment Active</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">This IoT weight-sensor simulator will bypass physical ESP32 requirements.</p>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-amber-500 text-slate-900 font-extrabold text-[9px] rounded-lg tracking-widest uppercase">
          Dev Mode
        </span>
      </div>

      {/* Simulator Control Grid */}
      <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md space-y-6">
        
        {/* Status display */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs">
            <span className="text-slate-500 uppercase tracking-widest block font-bold text-[9px] mb-0.5">Mock Cylinder Level</span>
            <span className="text-slate-200 font-bold font-mono">
              Weight: {cylinder.current_weight.toFixed(2)} kg ({cylinder.current_percent.toFixed(1)}%)
            </span>
          </div>
          <span className="text-[10px] text-sky-400 font-bold font-mono bg-sky-500/10 px-2.5 py-1 rounded-xl">
            API Key: {cylinder.api_key}
          </span>
        </div>

        {/* Action button blocks */}
        <div className="space-y-4">
          
          {/* Preset Percentages */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diagnostic Presets</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: '100% Full', val: 100 },
                { label: '75% Good', val: 75 },
                { label: '50% Normal', val: 50 },
                { label: '25% Low', val: 25 },
                { label: '12% Warning', val: 12 },
                { label: '5% Critical', val: 5 },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => triggerAction('set_level', { percent: item.val })}
                  className="px-2 py-3 bg-slate-800 border border-slate-700/50 hover:bg-slate-7.5 text-[10px] font-bold rounded-xl text-slate-200 hover:text-white cursor-pointer transition-all shadow-sm"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Increment / Decrement adjustments */}
          <div className="space-y-2 pt-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fine Adjustments</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => triggerAction('adjust', { amount: 0.5 })}
                className="py-3 bg-slate-800 hover:bg-emerald-500/10 border border-slate-700/50 hover:border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Sparkles size={14} />
                Increase Gas (+0.5 kg)
              </button>
              <button
                onClick={() => triggerAction('adjust', { amount: -0.5 })}
                className="py-3 bg-slate-800 hover:bg-rose-500/10 border border-slate-700/50 hover:border-rose-500/30 text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Sliders size={14} />
                Decrease Gas (-0.5 kg)
              </button>
            </div>
          </div>

          {/* Delivery & Network Connection States */}
          <div className="space-y-2 pt-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Environment Events</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => triggerAction('delivery')}
                className="py-3 bg-slate-800 hover:bg-sky-500/10 border border-slate-700/50 hover:border-sky-500/30 text-sky-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Truck size={14} />
                Simulate Delivery (Swap Full)
              </button>
              <button
                onClick={() => triggerAction('disconnect')}
                className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RadioOff size={14} />
                Simulate Sensor Disconnect
              </button>
            </div>
          </div>

        </div>

        {/* Status log feedback */}
        {statusMsg && (
          <div className="bg-slate-900 border border-slate-800 text-[10px] font-bold font-mono text-sky-400 p-3 rounded-xl">
            Console feed: {statusMsg}
          </div>
        )}

      </div>

    </div>
  );
}
