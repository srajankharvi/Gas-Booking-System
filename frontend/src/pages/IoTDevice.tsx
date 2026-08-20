import { useState, useEffect } from 'react';
import { 
  Cpu, Wifi, Cloud, Monitor, ArrowRight, ArrowDown, Scale, 
  CircuitBoard, RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { mockCylinderStore, isMockModeEnabled } from '../mock/gasMockData';

export default function IoTDevice() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  const fetchCylinder = async () => {
    try {
      const cylRes = await apiClient.get('/api/users/cylinders');
      if (cylRes.data.length > 0) {
        setCylinder(cylRes.data[0]);
      } else if (isMockModeEnabled()) {
        setCylinder(mockCylinderStore.get());
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

  const deviceStatus = useDeviceStatus(cylinder?.id);
  const isOnline = deviceStatus.isOnline;
  
  const handleReconnect = () => {
    setReconnecting(true);
    setTimeout(() => {
      setReconnecting(false);
      fetchCylinder();
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 font-semibold">Loading device telemetry...</span>
      </div>
    );
  }

  const statusColor = (ok: boolean) => ok ? 'text-emerald-500 bg-emerald-50 border-emerald-200' : 'text-rose-500 bg-rose-50 border-rose-200';
  const statusDot = (ok: boolean) => ok ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="space-y-6">
      
      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Device Status */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Cpu size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">ESP32 Device</span>
              <span className="text-lg font-black text-slate-900 block mt-0.5">
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        </div>

        {/* Wi-Fi Signal */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${isOnline ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-400'}`}>
              <Wifi size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Wi-Fi Connection</span>
              <span className="text-lg font-black text-slate-900 block mt-0.5">
                {isOnline ? 'Signal Strength' : 'Disconnected'}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">{isOnline ? '92% (-54dBm)' : '0%'}</span>
        </div>

        {/* Sync Status */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Cloud size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Last Synchronized</span>
              <span className="text-sm font-black text-slate-900 block mt-0.5 truncate max-w-[140px]">
                {deviceStatus.lastUpdated ? new Date(deviceStatus.lastUpdated).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleReconnect}
            disabled={reconnecting}
            className="p-2 text-slate-500 hover:text-sky-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Force refresh status"
          >
            <RefreshCw size={16} className={reconnecting ? 'animate-spin' : ''} />
          </button>
        </div>

      </div>

      {/* Main Hardware Pipeline Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h3 className="font-extrabold text-slate-900 text-sm mb-1">IoT Hardware Pipeline</h3>
        <p className="text-xs text-slate-500 mb-6">Real-time data flow from load cell physical sensor to the GasTrack cloud dashboard</p>

        {/* Desktop Horizontal Layout */}
        <div className="hidden lg:flex items-center justify-between gap-2 border border-slate-100 bg-slate-50/50 rounded-2xl p-6">
          
          {/* Node 1: Load Cell */}
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border bg-white min-w-[120px] shadow-sm ${statusColor(isOnline)}`}>
            <div className="relative">
              <Scale size={24} />
              <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${statusDot(isOnline)}`} />
            </div>
            <span className="text-xs font-black">Load Cell</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Healthy</span>
          </div>

          <ArrowRight className="text-slate-300" size={18} />

          {/* Node 2: HX711 */}
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border bg-white min-w-[120px] shadow-sm ${statusColor(isOnline)}`}>
            <div className="relative">
              <CircuitBoard size={24} />
              <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${statusDot(isOnline)}`} />
            </div>
            <span className="text-xs font-black">HX711</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Amplifier</span>
          </div>

          <ArrowRight className="text-slate-300" size={18} />

          {/* Node 3: ESP32 */}
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border bg-white min-w-[120px] shadow-sm ${statusColor(isOnline)}`}>
            <div className="relative">
              <Cpu size={24} />
              <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${statusDot(isOnline)}`} />
            </div>
            <span className="text-xs font-black">ESP32</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Controller</span>
          </div>

          <ArrowRight className="text-slate-300" size={18} />

          {/* Node 4: Wi-Fi */}
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border bg-white min-w-[120px] shadow-sm ${statusColor(isOnline)}`}>
            <div className="relative">
              <Wifi size={24} />
              <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${statusDot(isOnline)}`} />
            </div>
            <span className="text-xs font-black">Wi-Fi</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Network</span>
          </div>

          <ArrowRight className="text-slate-300" size={18} />

          {/* Node 5: Cloud */}
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border bg-white min-w-[120px] shadow-sm ${statusColor(true)}`}>
            <div className="relative">
              <Cloud size={24} className="text-emerald-500" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs font-black text-emerald-700">Cloud API</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Connected</span>
          </div>

          <ArrowRight className="text-slate-300" size={18} />

          {/* Node 6: Dashboard */}
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border bg-white min-w-[120px] shadow-sm ${statusColor(true)}`}>
            <div className="relative">
              <Monitor size={24} className="text-emerald-500" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs font-black text-emerald-700">Dashboard</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Website</span>
          </div>

        </div>

        {/* Mobile/Tablet Vertical Layout */}
        <div className="lg:hidden flex flex-col items-center gap-3 border border-slate-100 bg-slate-50/50 rounded-2xl p-6">
          
          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-white w-full max-w-sm shadow-sm ${statusColor(isOnline)}`}>
            <Scale size={20} />
            <div className="flex-1">
              <span className="text-xs font-black block">Load Cell Sensor</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">Physical Weight Input</span>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(isOnline)}`} />
          </div>

          <ArrowDown className="text-slate-300" size={16} />

          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-white w-full max-w-sm shadow-sm ${statusColor(isOnline)}`}>
            <CircuitBoard size={20} />
            <div className="flex-1">
              <span className="text-xs font-black block">HX711 Amplifier</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">Analog-to-Digital Converter</span>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(isOnline)}`} />
          </div>

          <ArrowDown className="text-slate-300" size={16} />

          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-white w-full max-w-sm shadow-sm ${statusColor(isOnline)}`}>
            <Cpu size={20} />
            <div className="flex-1">
              <span className="text-xs font-black block">ESP32 Microcontroller</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">Data Processor & Transmitter</span>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(isOnline)}`} />
          </div>

          <ArrowDown className="text-slate-300" size={16} />

          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-white w-full max-w-sm shadow-sm ${statusColor(isOnline)}`}>
            <Wifi size={20} />
            <div className="flex-1">
              <span className="text-xs font-black block">Local Wi-Fi Network</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">Wireless Internet Connection</span>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(isOnline)}`} />
          </div>

          <ArrowDown className="text-slate-300" size={16} />

          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-white w-full max-w-sm shadow-sm ${statusColor(true)}`}>
            <Cloud size={20} className="text-emerald-500" />
            <div className="flex-1">
              <span className="text-xs font-black block text-emerald-700">GasTrack Cloud API</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">Server Processing Engine</span>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>

          <ArrowDown className="text-slate-300" size={16} />

          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border bg-white w-full max-w-sm shadow-sm ${statusColor(true)}`}>
            <Monitor size={20} className="text-emerald-500" />
            <div className="flex-1">
              <span className="text-xs font-black block text-emerald-700">User Dashboard</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">Client View Panel</span>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>

        </div>

      </div>

      {/* Diagnostics Panel & Offline Troubleshooting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Technical Diagnostics */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Diagnostics Information</h3>
          <div className="space-y-3.5 text-xs text-slate-600">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold">Hardware Version</span>
              <span className="font-mono text-slate-400 font-bold">ESP32-WROOM-32E (v1.2)</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold">Firmware Version</span>
              <span className="font-mono text-slate-400 font-bold">v3.4.1-stable</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold">Local MAC Address</span>
              <span className="font-mono text-slate-400 font-bold">24:0A:C4:F3:11:8E</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold">Current RSSI</span>
              <span className="font-mono text-slate-400 font-bold">-54 dBm (Excellent)</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="font-bold">Power Source</span>
              <span className="font-mono text-slate-400 font-bold">USB-C Power Adaptor (5V)</span>
            </div>
          </div>
        </div>

        {/* Offline Connection troubleshooting */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-3">Connection Issues?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              If your device status is showing as offline, please verify:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1 mb-4">
              <li>Check if the ESP32 is powered on (red LED glowing).</li>
              <li>Verify that your local Wi-Fi router is working and reachable.</li>
              <li>Ensure the load cell cable is plugged into the HX711 board firmly.</li>
              <li>Try pressing the EN/RESET button on the ESP32 chip.</li>
            </ul>
          </div>
          
          <button 
            onClick={handleReconnect}
            disabled={reconnecting}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            {reconnecting ? 'Checking Connection...' : 'Troubleshoot Connection'}
          </button>
        </div>

      </div>

    </div>
  );
}
