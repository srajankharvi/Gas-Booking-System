import { useState, useEffect } from 'react';
import { Sliders, ShieldAlert, Key, Clipboard, CheckCircle2, Cpu } from 'lucide-react';
import { apiClient } from '../api/client';
import { isMockModeEnabled, mockCylinderStore } from '../mock/gasMockData';

export default function Settings() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fields
  const [name, setName] = useState('');
  const [tareWeight, setTareWeight] = useState('15.0');
  const [fullWeight, setFullWeight] = useState('29.2');
  
  // Mock mode config state
  const [mockSource, setMockSource] = useState(isMockModeEnabled());

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchCylinderConfig = async () => {
    try {
      const res = await apiClient.get('/api/users/cylinders');
      if (res.data.length > 0) {
        const cyl = res.data[0];
        setCylinder(cyl);
        setName(cyl.name);
        setTareWeight(cyl.tare_weight.toString());
        setFullWeight(cyl.full_weight.toString());
      } else if (isMockModeEnabled()) {
        const cyl = mockCylinderStore.get();
        setCylinder(cyl);
        setName(cyl.name);
        setTareWeight(cyl.tare_weight.toString());
        setFullWeight(cyl.full_weight.toString());
      } else {
        setCylinder(null);
      }
    } catch (err) {
      console.error('Error fetching cylinder settings', err);
      if (isMockModeEnabled()) {
        const cyl = mockCylinderStore.get();
        setCylinder(cyl);
        setName(cyl.name);
        setTareWeight(cyl.tare_weight.toString());
        setFullWeight(cyl.full_weight.toString());
      } else {
        setCylinder(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinderConfig();
  }, [mockSource]);

  const handleCopyKey = () => {
    if (!cylinder) return;
    navigator.clipboard.writeText(cylinder.api_key || 'ESP32-DEMO-KEY-SECRET');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSourceChange = (useMock: boolean) => {
    setMockSource(useMock);
    localStorage.setItem('use_mock_iot', useMock ? 'true' : 'false');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cylinder) return;
    
    setError('');
    setSuccess(false);

    const tare = parseFloat(tareWeight);
    const full = parseFloat(fullWeight);

    if (isNaN(tare) || isNaN(full)) {
      setError('Weights must be valid numbers.');
      return;
    }

    if (full <= tare) {
      setError('Full weight must be greater than tare weight.');
      return;
    }

    if (cylinder.id === 'CYL-DEMO-001') {
      mockCylinderStore.set({
        name,
        tare_weight: tare,
        full_weight: full
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      return;
    }

    try {
      const res = await apiClient.put(`/api/users/cylinders/${cylinder.id}/calibration`, {
        name,
        tare_weight: tare,
        full_weight: full
      });
      setCylinder(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update calibration details.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold font-mono">Loading configurations...</span>
      </div>
    );
  }

  const isDevMode = import.meta.env.DEV;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <header>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">System Settings</h2>
        <p className="text-slate-400 text-xs mt-1">Configure cylinder tare/full weights, copy API keys, and calibrate sensors.</p>
      </header>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-rose-400 text-xs font-bold shadow-sm">
          <ShieldAlert size={18} className="shrink-0 animate-bounce" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-emerald-400 text-xs font-bold shadow-sm">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      {/* IoT Data Source Selection (Dev Environment Only) */}
      {isDevMode && (
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
            <Cpu className="text-amber-500 animate-pulse" size={18} />
            <h3 className="font-bold text-slate-200 text-sm">IoT Data Source (Development Mode)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label 
              onClick={() => handleSourceChange(false)}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                !mockSource 
                  ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 font-medium hover:border-slate-700'
              }`}
            >
              <div>
                <span className="block text-xs text-slate-200">Real IoT Device</span>
                <span className="text-[10px] text-slate-500 block mt-1">Ingest raw feeds from FastAPI/ESP32</span>
              </div>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${!mockSource ? 'border-sky-500' : 'border-slate-600'}`}>
                {!mockSource && <div className="h-2 w-2 rounded-full bg-sky-500" />}
              </div>
            </label>

            <label 
              onClick={() => handleSourceChange(true)}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                mockSource 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 font-medium hover:border-slate-700'
              }`}
            >
              <div>
                <span className="block text-xs text-slate-200">Development Simulator</span>
                <span className="text-[10px] text-slate-500 block mt-1">Expose in-memory mock IoT cylinder</span>
              </div>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${mockSource ? 'border-amber-500' : 'border-slate-600'}`}>
                {mockSource && <div className="h-2 w-2 rounded-full bg-amber-500" />}
              </div>
            </label>
          </div>
        </div>
      )}

      {cylinder ? (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Device Calibration card */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
              <Sliders className="text-sky-400" size={18} />
              <h3 className="font-bold text-slate-200 text-sm">Hardware Calibration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cylinder Nickname</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-slate-900/40 outline-none text-slate-200 text-xs transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">API Connection Mode</label>
                <span className="w-full block px-4 py-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-xs font-semibold">
                  {cylinder.id === 'CYL-DEMO-001' ? 'Local Memory Simulation Mode' : 'Wi-Fi HTTP / WebSockets Client'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tare Weight (Empty container) kg</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-slate-900/40 outline-none text-slate-200 text-xs transition-all font-mono"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Typical 14.2kg cylinders average ~15.0kg empty tare weight.</p>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Weight (Tare + Gas content) kg</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-slate-900/40 outline-none text-slate-200 text-xs transition-all font-mono"
                  value={fullWeight}
                  onChange={(e) => setFullWeight(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Combine empty tare weight (15kg) and gas weight (14.2kg) = 29.2kg.</p>
              </div>
            </div>
          </div>

          {/* Credentials & firmware link key card */}
          <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
              <Key className="text-sky-400" size={18} />
              <h3 className="font-bold text-slate-200 text-sm">IoT Device credentials</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">ESP32 Ingestion Secret Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-850 rounded-xl text-slate-400 font-mono text-xs select-all outline-none"
                  value={cylinder.api_key || 'ESP32-DEMO-001-KEY'}
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-4 py-2.5 bg-slate-850 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Clipboard size={14} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Define the <code className="text-sky-400 font-mono">X-API-Key</code> request header in the microcontroller HTTP client firmware to link measurements.
              </p>
            </div>
          </div>

          {/* Action Save button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all font-mono"
            >
              Save Configurations
            </button>
          </div>

        </form>
      ) : (
        <div className="text-center py-20 bg-slate-850 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
          <ShieldAlert size={48} className="mx-auto text-rose-500 mb-4" />
          <h3 className="font-bold text-slate-100 text-sm">No Linked Cylinders</h3>
          <p className="text-slate-400 mt-2">Calibration settings require a linked cylinder. Link an IoT cylinder device first.</p>
        </div>
      )}

    </div>
  );
}
