import { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, RefreshCw, X 
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function BookingsList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  const fetchBookings = async () => {
    try {
      const res = await apiClient.get('/api/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error('Error fetching bookings list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await apiClient.patch(`/api/bookings/${id}/cancel`);
      // Update local state list
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cancellation failed.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Confirmed': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Processing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Out for Delivery': return 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse';
      case 'Delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Cancelled': return 'bg-slate-800 text-slate-500 border-slate-700/50';
      default: return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Retrieving bookings registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Booking History</h2>
          <p className="text-slate-400 text-xs mt-1">Search, track, and manage your LPG cylinder replacement orders.</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchBookings(); }}
          className="p-2.5 bg-slate-800 border border-slate-700/50 hover:bg-slate-7.5 rounded-xl cursor-pointer text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh List"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      {/* Main layout: left side is list, right is tracker details if selected */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bookings List Panel */}
        <div className={`${selectedBooking ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          
          {/* Search bar */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <Search size={18} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by Booking ID or Status..."
              className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 text-xs outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Bookings Table/Card container */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-20 bg-slate-850 border border-slate-800 rounded-3xl p-8">
              <ShoppingBag size={48} className="mx-auto text-slate-700 mb-4" />
              <h3 className="font-bold text-slate-200 text-sm">No Bookings Found</h3>
              <p className="text-slate-500 text-xs mt-1">You haven't booked any cylinders yet or no matches found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredBookings.map((b) => (
                <div 
                  key={b.id} 
                  className={`bg-slate-850 border rounded-2xl p-5 hover:border-slate-700 transition-all cursor-pointer relative ${
                    selectedBooking?.id === b.id ? 'border-sky-500 shadow-md' : 'border-slate-800'
                  }`}
                  onClick={() => setSelectedBooking(b)}
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100">{b.booking_id}</span>
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${getStatusBadgeClass(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Placed on {new Date(b.created_at).toLocaleDateString()} at {new Date(b.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {b.status === 'Pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(b.id);
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-500/15 border border-slate-700/50 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 font-bold rounded-xl text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setSelectedBooking(b)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-7.5 border border-slate-700/50 text-slate-300 font-bold rounded-xl text-[10px] cursor-pointer"
                      >
                        Track Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Booking tracking details */}
        {selectedBooking && (
          <div className="lg:col-span-1 bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-xl relative h-fit space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Tracking Timeline</h3>
                <span className="text-[10px] text-slate-500 font-bold font-mono">{selectedBooking.booking_id}</span>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-800 border border-slate-700/50 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Timeline progression */}
            <div className="space-y-6 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              
              {/* Timeline points generator */}
              {[
                { status: 'Pending', label: 'Order Registered', desc: 'Booking recorded on platform' },
                { status: 'Confirmed', label: 'Booking Approved', desc: 'Admin accepted booking' },
                { status: 'Processing', label: 'Cylinder Prepared', desc: 'Calibrated replacement selected' },
                { status: 'Out for Delivery', label: 'Out for Delivery', desc: 'Assigned to logistics courier' },
                { status: 'Delivered', label: 'Delivery Complete', desc: 'Cylinder updated to 100% capacity' },
              ].map((step, idx) => {
                const stepEvent = selectedBooking.timeline.find((t: any) => t.status === step.status);
                const isPassed = !!stepEvent;
                const isCurrent = selectedBooking.status === step.status;

                return (
                  <div key={idx} className="relative">
                    {/* Timeline Node Point */}
                    <div className={`absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent 
                        ? 'bg-sky-500 border-white ring-4 ring-sky-500/20' 
                        : isPassed 
                        ? 'bg-sky-500 border-sky-500' 
                        : 'bg-slate-900 border-slate-800'
                    }`} />

                    <div className="space-y-1">
                      <h4 className={`text-xs font-bold ${isCurrent ? 'text-sky-400 font-extrabold' : isPassed ? 'text-slate-200' : 'text-slate-500'}`}>
                        {step.label}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{step.desc}</p>
                      {stepEvent && (
                        <span className="text-[9px] text-slate-600 block">
                          {new Date(stepEvent.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Special Cancelled status point in timeline */}
              {selectedBooking.status === 'Cancelled' && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full bg-rose-500 border-white ring-4 ring-rose-500/20" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-400">Order Cancelled</h4>
                    <p className="text-[10px] text-slate-500">Refund checks handled automatically.</p>
                  </div>
                </div>
              )}

            </div>

            {/* Delivery address details */}
            <div className="pt-4 border-t border-slate-800 text-xs space-y-3">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Destination Address</span>
                <span className="text-slate-300 font-medium leading-relaxed">{selectedBooking.delivery_address}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Contact Phone</span>
                  <span className="text-slate-300 font-medium font-mono">{selectedBooking.contact_number}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Delivery Type</span>
                  <span className="text-slate-350 font-bold uppercase">{selectedBooking.delivery_preference}</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
