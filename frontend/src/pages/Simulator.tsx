import { useState, useEffect } from 'react';
import { Terminal, RadioOff, ShieldAlert, Truck, Sliders } from 'lucide-react';
import { apiClient } from '../api/client';
import { isMockModeEnabled, mockCylinderStore, mockBookingsStore } from '../mock/gasMockData';

export default function Simulator() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  
  const fetchCylinder = async () => {
    try {
      const res = await apiClient.get('/api/users/cylinders');
      if (res.data.length > 0) {
        setCylinder(res.data[0]);
      } else if (isMockModeEnabled()) {
        setCylinder(mockCylinderStore.get());
      } else {
        setCylinder(null);
      }
    } catch (err) {
      console.error(err);
      if (isMockModeEnabled()) {
        setCylinder(mockCylinderStore.get());
      } else {
        setCylinder(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinder();

    let unsubscribe: (() => void) | null = null;
    if (isMockModeEnabled()) {
      unsubscribe = mockCylinderStore.subscribe(() => {
        apiClient.get('/api/users/cylinders').then(res => {
          if (res.data.length === 0) {
            setCylinder(mockCylinderStore.get());
          }
        }).catch(() => {
          setCylinder(mockCylinderStore.get());
        });
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const triggerAction = async (action: string, extraParams: any = {}) => {
    if (!cylinder) return;

    if (cylinder.id === 'CYL-DEMO-001') {
      setStatusMsg('Updating simulated memory store...');
      if (action === 'set_level') {
        mockCylinderStore.set({ current_percent: extraParams.percent });
      } else if (action === 'adjust') {
        const current = mockCylinderStore.get();
        const deltaPercent = (extraParams.amount / (current.full_weight - current.tare_weight)) * 100;
        mockCylinderStore.set({ current_percent: Math.max(0, Math.min(100, current.current_percent + deltaPercent)) });
      } else if (action === 'set_temp') {
        mockCylinderStore.set({ temperature: extraParams.temp });
      } else if (action === 'disconnect') {
        mockCylinderStore.set({ is_online: !mockCylinderStore.get().is_online });
      } else if (action === 'delivery') {
        mockCylinderStore.set({ current_percent: 100 });
        const bookings = mockBookingsStore.get();
        const active = bookings.find((b: any) => 
          ['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(b.status)
        );
        if (active) {
          const updatedBookings = bookings.map((b: any) => {
            if (b.id === active.id) {
              return {
                ...b,
                status: 'Delivered',
                updated_at: new Date().toISOString(),
                timeline: [...b.timeline, { status: 'Delivered', timestamp: new Date().toISOString() }]
              };
            }
            return b;
          });
          mockBookingsStore.set(updatedBookings);
          setStatusMsg('Delivery simulated: Swap full completed, mock booking marked delivered.');
        } else {
          setStatusMsg('Delivery simulated: Swap full completed (no active booking was pending).');
        }
      }
      setCylinder(mockCylinderStore.get());
      return;
    }

    setStatusMsg('Sending simulator packet...');
    try {
      const res = await apiClient.post('/api/simulator/action', {
        cylinder_id: cylinder.id,
        action,
        ...extraParams
      });
      setStatusMsg(res.data.message || 'Simulator event submitted.');
      fetchCylinder();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || 'Packet submission failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Linking virtual nodes...</span>
      </div>
    );
  }

  if (!cylinder) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 max-w-lg mx-auto shadow-sm">
        <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-lg font-black text-slate-900">No Cylinder Configured</h2>
        <p className="text-xs text-slate-400 mt-2">Go to settings to enable mock simulator mode or link a cylinder alias.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {statusMsg && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3 text-emerald-400 font-mono text-xs shadow-md">
          <Terminal size={16} className="shrink-0 animate-pulse text-emerald-500" />
          <span>&gt; {statusMsg}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-1">
          <Sliders size={16} className="text-sky-500" />
          IoT Load Cell Simulator
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-semibold">Simulate load cell weight changes, temperature shifts, and delivery swaps.</p>

        <div className="space-y-6">
          
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Preset LPG Percentages</label>
            <div className="grid grid-cols-5 gap-2.5">
              {[100, 75, 45, 12, 5].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => triggerAction('set_level', { percent: lvl })}
                  className={`py-2.5 rounded-xl border text-xs font-black text-center cursor-pointer transition-colors ${
                    lvl <= 15 
                      ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/60 text-rose-600' 
                      : lvl <= 45 
                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/60 text-amber-600'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {lvl}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Burn Simulation Steps</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => triggerAction('adjust', { amount: -0.2 })}
                className="py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Burn Gas (-0.2 kg)
              </button>
              <button
                onClick={() => triggerAction('adjust', { amount: 0.2 })}
                className="py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Refill Gas (+0.2 kg)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Refill & Hardware Events</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => triggerAction('delivery')}
                className="py-3 bg-sky-50 hover:bg-sky-100/60 border border-sky-100/50 text-sky-600 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Truck size={14} />
                Simulate Delivery (100% full)
              </button>
              <button
                onClick={() => triggerAction('disconnect')}
                className={`py-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  cylinder.is_online || cylinder.isConnected 
                    ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/60 text-rose-600' 
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-600'
                }`}
              >
                <RadioOff size={14} />
                {cylinder.is_online || cylinder.isConnected ? 'Simulate Disconnect' : 'Simulate Reconnect'}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
