import { useState, useEffect } from 'react';
import { Sliders, ShieldAlert, Key, Clipboard, CheckCircle2, Cpu } from 'lucide-react';
import { apiClient } from '../api/client';
import { isMockModeEnabled, mockCylinderStore } from '../mock/gasMockData';

export default function Settings() {
  const [cylinder, setCylinder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [tareWeight, setTareWeight] = useState('15.0');
  const [fullWeight, setFullWeight] = useState('29.2');
  
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
      setTimeout(() => setSuccess(false), 2000);
      return;
    }

    try {
      const res = await apiClient.put(`/api/cylinders/${cylinder.id}`, {
        name,
        tare_weight: tare,
        full_weight: full
      });
      setCylinder(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration settings.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Loading system configs...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {success && (
        <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 flex gap-3 text-emerald-800 text-xs font-bold shadow-sm">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <span>Configuration saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 text-rose-800 text-xs font-bold shadow-sm">
          <ShieldAlert size={18} className="shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Form Card */}
      {cylinder && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-6">
            <Sliders size={16} className="text-sky-500" />
            Cylinder Hardware Calibration
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Alias Cylinder Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Tare (Empty) Weight (kg)</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Full Gross Weight (kg)</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                  value={fullWeight}
                  onChange={(e) => setFullWeight(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs shadow-md shadow-sky-500/10 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Secret API Key Card */}
      {cylinder && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-2">
            <Key size={16} className="text-sky-500" />
            Device Write Authentication Token
          </h3>
          <p className="text-xs text-slate-400 mb-5 font-semibold">Provide this token in your ESP32 configuration header variables to authenticate telemetry syncs.</p>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-inner">
            <code className="flex-1 font-mono text-xs text-slate-700 select-all truncate block">
              {cylinder.api_key || 'ESP32-DEMO-KEY-SECRET'}
            </code>
            <button 
              onClick={handleCopyKey}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold rounded-xl text-[10px] cursor-pointer flex items-center gap-1 shadow-sm transition-colors"
            >
              <Clipboard size={12} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Mock IoT Toggle Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-2">
          <Cpu size={16} className="text-sky-500" />
          Hardware Environment Source
        </h3>
        <p className="text-xs text-slate-400 mb-5 font-semibold">Toggle between using physical ESP32 load cells or the simulated dev panel.</p>

        <div className="flex gap-4">
          <button
            onClick={() => handleSourceChange(false)}
            className={`flex-1 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
              !mockSource 
                ? 'bg-sky-50 border-sky-500 text-sky-600 font-black shadow-sm' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="block text-xs text-slate-800">Physical ESP32 Link</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">Accept live API payloads from local sensors</span>
          </button>

          <button
            onClick={() => handleSourceChange(true)}
            className={`flex-1 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
              mockSource 
                ? 'bg-sky-50 border-sky-500 text-sky-600 font-black shadow-sm' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="block text-xs text-slate-800">Simulated Environment</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">Use synthetic weights for testing</span>
          </button>
        </div>
      </div>

    </div>
  );
}
