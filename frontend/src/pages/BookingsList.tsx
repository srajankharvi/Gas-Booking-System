import { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, RefreshCw, X 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { isMockModeEnabled, mockBookingsStore } from '../mock/gasMockData';

export default function BookingsList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  const fetchBookings = async () => {
    try {
      let backendBookings: any[] = [];
      try {
        const res = await apiClient.get('/api/bookings');
        backendBookings = res.data;
      } catch (err) {
        console.error('Failed to fetch backend bookings', err);
      }

      if (isMockModeEnabled()) {
        const mocks = mockBookingsStore.get();
        const merged = [...backendBookings];
        mocks.forEach((mb: any) => {
          if (!merged.some(b => b.booking_id === mb.booking_id)) {
            merged.push(mb);
          }
        });
        // Sort by created_at descending
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBookings(merged);
      } else {
        setBookings(backendBookings);
      }
    } catch (err) {
      console.error('Error fetching bookings list', err);
      if (isMockModeEnabled()) {
        setBookings(mockBookingsStore.get());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    let unsubscribe: (() => void) | null = null;
    if (isMockModeEnabled()) {
      unsubscribe = mockBookingsStore.subscribe(() => {
        fetchBookings();
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    if (id.startsWith('booking-mock-') || id === 'booking-demo-1') {
      const mocks = mockBookingsStore.get();
      const updated = mocks.map((b: any) => {
        if (b.id === id) {
          return {
            ...b,
            status: 'Cancelled',
            updated_at: new Date().toISOString(),
            timeline: [...b.timeline, { status: 'Cancelled', timestamp: new Date().toISOString() }]
          };
        }
        return b;
      });
      mockBookingsStore.set(updated);
      setBookings(prev => prev.map(b => b.id === id ? updated.find((ub: any) => ub.id === id) : b));
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(updated.find((ub: any) => ub.id === id));
      }
      return;
    }

    try {
      const res = await apiClient.patch(`/api/bookings/${id}/cancel`);
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
                        {b.id.startsWith('booking-mock-') && (
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[8px] font-bold rounded-lg uppercase tracking-wider">
                            Demo
                          </span>
                        )}
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
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Detailed status tracker */}
        {selectedBooking && (
          <div className="lg:col-span-1 bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md h-fit space-y-6 relative">
            <button 
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="font-bold text-slate-100 text-sm">Refill Delivery Track</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Order tracker for booking: <code className="text-sky-400 font-mono text-[11px]">{selectedBooking.booking_id}</code></p>
            </div>

            {/* Timeline graphics list */}
            <div className="relative pl-6 border-l border-slate-800 space-y-6 text-xs">
              {['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status, index) => {
                const stepCompleted = selectedBooking.timeline.some((t: any) => t.status === status);
                const stepTime = selectedBooking.timeline.find((t: any) => t.status === status)?.timestamp;
                const isCurrentStatus = selectedBooking.status === status;
                
                // Don't render Cancelled node if the booking wasn't cancelled
                if (status === 'Cancelled' && !stepCompleted) return null;
                // If it is cancelled, hide Out for Delivery & Delivered steps unless they happened
                if (selectedBooking.status === 'Cancelled' && (status === 'Out for Delivery' || status === 'Delivered') && !stepCompleted) return null;

                return (
                  <div key={index} className="relative">
                    <div className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${
                      isCurrentStatus 
                        ? 'bg-sky-500 border-sky-500 shadow-md shadow-sky-500/20' 
                        : stepCompleted 
                        ? 'bg-slate-800 border-slate-700' 
                        : 'bg-slate-900 border-slate-850'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        isCurrentStatus ? 'bg-white' : stepCompleted ? 'bg-sky-500' : 'bg-transparent'
                      }`} />
                    </div>

                    <div className="space-y-0.5">
                      <span className={`font-bold block ${isCurrentStatus ? 'text-sky-400' : stepCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                        {status}
                      </span>
                      {stepTime && (
                        <span className="text-[9px] text-slate-500 block">
                          {new Date(stepTime).toLocaleDateString()} {new Date(stepTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed metadata */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3.5 text-[11px] leading-relaxed">
              <div>
                <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[8px]">Delivery Address</span>
                <span className="text-slate-300 font-medium">{selectedBooking.delivery_address}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[8px]">Phone Contact</span>
                  <span className="text-slate-300 font-medium">{selectedBooking.contact_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[8px]">Priority Speed</span>
                  <span className="text-sky-400 font-bold uppercase">{selectedBooking.delivery_preference}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
