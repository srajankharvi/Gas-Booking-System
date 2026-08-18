import { Outlet, Link } from 'react-router-dom';
import { Activity, Settings as SettingsIcon } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 text-brand-600 mb-10">
          <Activity size={28} />
          <h1 className="font-bold text-xl tracking-tight text-slate-800">GasMonitor</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-lg transition-colors font-medium">
            <Activity size={20} />
            Dashboard
          </Link>
          <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-lg transition-colors font-medium">
            <SettingsIcon size={20} />
            Settings
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
