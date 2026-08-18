import { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, ShieldAlert, Clock, 
  CheckCircle2, ArrowRight, RefreshCw, Radio 
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
    // Determine next status in chain
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
      // Update local state list
      setBookings(prev => prev.map(b => b.id === bookingId ? res.data : b));
      // Refresh statistics
      const statsRes = await apiClient.get('/api/admin/stats');
      setStats(statsRes.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update booking status.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Confirmed': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Processing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Out for Delivery': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-800 text-slate-500 border-slate-700/50';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold font-sans">Accessing admin systems...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Admin Control Center</h2>
          <p className="text-slate-400 text-xs mt-1">Platform management, cylinders diagnostic monitors, and booking dispatch tools.</p>
        </div>
        <button 
          onClick={fetchAdminData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700/50 hover:bg-slate-7.5 text-xs text-slate-300 font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Feeds'}
        </button>
      </header>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Total Users', val: stats.total_users, icon: Users, color: 'text-sky-400 bg-sky-500/10' },
            { label: 'Active IoT', val: stats.active_cylinders, icon: Radio, color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Low Alert', val: stats.low_gas_cylinders, icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
            { label: 'Critical Alert', val: stats.critical_cylinders, icon: ShieldAlert, color: 'text-rose-400 bg-rose-500/10' },
            { label: 'Pending Orders', val: stats.pending_bookings, icon: Clock, color: 'text-yellow-400 bg-yellow-500/10' },
            { label: 'Today Dispatches', val: stats.today_deliveries, icon: CheckCircle2, color: 'text-purple-400 bg-purple-500/10' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div className={`p-2.5 rounded-xl w-fit ${item.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{item.label}</span>
                  <span className="text-xl font-bold text-slate-100 block mt-1">{item.val}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Layout panels: Top is connected cylinders, bottom is booking dispatches */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Connected Cylinders Panel */}
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md overflow-hidden">
          <h3 className="font-bold text-slate-100 text-sm mb-4">Live Cylinder Directory</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                  <th className="pb-3">User & Contact</th>
                  <th className="pb-3">Gas Remaining</th>
                  <th className="pb-3">Weight</th>
                  <th className="pb-3">Safety Status</th>
                  <th className="pb-3">Network Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cylinders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No connected cylinders logged.
                    </td>
                  </tr>
                ) : (
                  cylinders.map((cyl, idx) => (
                    <tr key={idx} className="text-slate-350 hover:bg-slate-800/30">
                      <td className="py-3.5">
                        <span className="block font-bold text-slate-200">{cyl.user_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{cyl.user_email}</span>
                      </td>
                      <td className="py-3.5 font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                cyl.level < 10 ? 'bg-rose-500' : cyl.level < 20 ? 'bg-orange-500' : cyl.level < 40 ? 'bg-amber-500' : 'bg-sky-500'
                              }`} 
                              style={{ width: `${cyl.level}%` }}
                            />
                          </div>
                          <span>{cyl.level.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-300">{cyl.weight.toFixed(2)} kg</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                          cyl.status === 'Good' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          cyl.status === 'Normal' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                          cyl.status === 'Low' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                        }`}>
                          {cyl.status}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          cyl.is_online ? 'text-green-400' : 'text-slate-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cyl.is_online ? 'bg-green-500' : 'bg-slate-600'}`} />
                          {cyl.is_online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Booking Dispatch management Panel */}
        <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md">
          <h3 className="font-bold text-slate-100 text-sm mb-4">Booking Dispatches</h3>

          <div className="space-y-4">
            {bookings.filter(b => b.status !== 'Delivered' && b.status !== 'Cancelled').length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">No active bookings require dispatch approvals.</p>
            ) : (
              bookings
                .filter(b => b.status !== 'Delivered' && b.status !== 'Cancelled')
                .map((b) => (
                  <div key={b.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{b.booking_id}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${getStatusBadge(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        Delivery address: <span className="text-slate-350 font-medium">{b.delivery_address}</span>
                      </p>
                      <p className="text-[10px] text-slate-600">
                        Requested: {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button 
                      onClick={() => handleUpdateStatus(b.id, b.status)}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-all self-end md:self-auto shadow-md"
                    >
                      Advance Status
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
