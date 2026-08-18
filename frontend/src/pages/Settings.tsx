import { useState, useEffect } from 'react';
import { Sliders, ShieldAlert, Key, Clipboard, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Settings() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fields
  const [name, setName] = useState('');
  const [tareWeight, setTareWeight] = useState('15.0');
  const [fullWeight, setFullWeight] = useState('29.2');
  
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
      }
    } catch (err) {
      console.error('Error fetching cylinder settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinderConfig();
  }, []);

  const handleCopyKey = () => {
    if (!cylinder) return;
    navigator.clipboard.writeText(cylinder.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <span className="text-slate-400 mt-4 text-xs font-semibold">Loading configurations...</span>
      </div>
    );
  }

  if (!cylinder) {
    return (
      <div className="text-center py-20 bg-slate-850 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
        <ShieldAlert size={48} className="mx-auto text-rose-500 mb-4" />
        <h3 className="font-bold text-slate-100 text-sm">No Linked Cylinders</h3>
        <p className="text-slate-400 mt-2">Calibration settings require a linked cylinder. Link an IoT cylinder device first.</p>
      </div>
    );
  }

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
          <span>Calibration configurations saved successfully.</span>
        </div>
      )}

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
                Wi-Fi HTTP / WebSockets Client
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
                value={cylinder.api_key}
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
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all"
          >
            Save Configurations
          </button>
        </div>

      </form>

    </div>
  );
}
