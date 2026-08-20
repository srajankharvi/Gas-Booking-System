import { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, Clock, 
  ArrowRight, RefreshCw, Radio, WifiOff, Flame, Package
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [cylinders, setCylinders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, cylsRes, bookingsRes] = await Promise.all([
        apiClient.get('/api/admin/stats'),
        apiClient.get('/api/admin/cylinders'),
        apiClient.get('/api/admin/bookings')
      ]);
      setStats(statsRes.data);
      setCylinders(cylsRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateStatus = async (bookingId: string, currentStatus: string) => {
    let nextStatus = '';
    switch (currentStatus) {
      case 'Pending': nextStatus = 'Confirmed'; break;
      case 'Confirmed': nextStatus = 'Processing'; break;
      case 'Processing': nextStatus = 'Out for Delivery'; break;
      case 'Out for Delivery': nextStatus = 'Delivered'; break;
      default: return;
    }

    try {
      const res = await apiClient.patch(`/api/admin/bookings/${bookingId}/status`, { status: nextStatus });
      setBookings(prev => prev.map(b => b.id === bookingId ? res.data : b));
      const statsRes = await apiClient.get('/api/admin/stats');
      setStats(statsRes.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update booking status.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Confirmed': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Out for Delivery': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Required': return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      case 'None':
      case 'Not Required': return 'bg-slate-50 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const formatLastUpdated = (ts: string) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Accessing admin systems...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Users */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Registered Users</span>
            <span className="text-xl font-black text-slate-950 mt-0.5 block">{stats?.total_users || 0} Users</span>
          </div>
        </div>

        {/* Active Cylinders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Flame size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Active Monitors</span>
            <span className="text-xl font-black text-slate-950 mt-0.5 block">{stats?.total_cylinders || 0} Devices</span>
          </div>
        </div>

        {/* Pending Deliveries */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Pending Orders</span>
            <span className="text-xl font-black text-slate-950 mt-0.5 block">{stats?.pending_bookings || 0} Orders</span>
          </div>
        </div>

        {/* Critical Refills */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">Refills Required</span>
            <span className="text-xl font-black text-slate-950 mt-0.5 block">{stats?.critical_refills || 0} Low Gas</span>
          </div>
        </div>

      </div>

      {/* Main Splits view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Manage Deliveries */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock size={16} className="text-sky-500" />
                Active Refill Orders
              </h3>
              <button 
                onClick={fetchAdminData}
                disabled={refreshing}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer animate-none"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Clock size={36} className="mx-auto text-slate-350 mb-3" />
                <p className="text-xs font-semibold">No active refill requests in queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="py-3 pr-4">Order ID</th>
                      <th className="py-3 px-4">Address</th>
                      <th className="py-3 px-4">Preference</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700">
                        <td className="py-3.5 pr-4 font-mono font-bold text-[11px] text-sky-600">{b.booking_id}</td>
                        <td className="py-3.5 px-4 max-w-[150px] truncate">{b.delivery_address}</td>
                        <td className="py-3.5 px-4 uppercase text-[10px]">{b.delivery_preference}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getStatusBadge(b.status)}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          {b.status !== 'Delivered' && b.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, b.status)}
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg border border-sky-100 flex items-center gap-1.5 ml-auto cursor-pointer text-[10px]"
                            >
                              Dispatch <ArrowRight size={10} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Monitor Hardware Telemetry */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Radio size={16} className="text-sky-500" />
            Hardware Diagnostics Monitor
          </h3>

          <div className="space-y-4">
            {cylinders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <WifiOff size={32} className="mx-auto text-slate-350 mb-2" />
                <p className="text-xs font-semibold">No active nodes reporting telemetry.</p>
              </div>
            ) : (
              cylinders.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2.5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-slate-900 truncate max-w-[120px]">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold ${
                      c.status === 'LOW' || c.status === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400">
                    <div>
                      <span>Remaining:</span>
                      <span className="block text-slate-800 text-xs font-black mt-0.5">{Math.round(c.current_percent)}%</span>
                    </div>
                    <div>
                      <span>Last Seen:</span>
                      <span className="block text-slate-700 mt-0.5 truncate">{formatLastUpdated(c.last_seen)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
