import { useState } from 'react';

export default function Settings() {
  const [tareWeight, setTareWeight] = useState('15.0');
  const [fullWeight, setFullWeight] = useState('29.2');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your device and notification preferences.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Device Calibration</h2>
          <p className="text-sm text-slate-500 mt-1">Set the weights to accurately calculate gas percentage.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tare Weight (Empty Cylinder) kg</label>
              <input 
                type="number" 
                step="0.1"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all"
                value={tareWeight}
                onChange={(e) => setTareWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Weight (Gas + Tare) kg</label>
              <input 
                type="number" 
                step="0.1"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all"
                value={fullWeight}
                onChange={(e) => setFullWeight(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Device API Key</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-sm"
                value="d1A5f9-XXXX-XXXX"
              />
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Use this key in your ESP32 firmware configuration.</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
