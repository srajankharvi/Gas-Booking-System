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
      case 'Pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Confirmed': return 'bg-sky-50 text-sky-750 border-sky-200';
      case 'Processing': return 'bg-blue-50 text-blue-750 border-blue-200';
      case 'Out for Delivery': return 'bg-purple-50 text-purple-750 border-purple-200 animate-pulse';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-100 text-slate-400 border-slate-200';
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Retrieving bookings registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Search and Refresh Action bar */}
      <div className="flex items-center gap-3 w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by Booking ID or Status..."
          className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 text-xs outline-none font-semibold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          onClick={() => { setLoading(true); fetchBookings(); }}
          className="p-2 bg-slate-50 hover:bg-slate-100/80 text-slate-500 rounded-xl transition-all cursor-pointer border border-slate-200"
          title="Refresh List"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Layout Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bookings List Panel */}
        <div className={`${selectedBooking ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3.5`}>
          
          {filteredBookings.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
              <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="font-extrabold text-slate-900 text-sm">No Bookings Found</h3>
              <p className="text-slate-400 text-xs mt-1">You haven't booked any cylinders yet or no matches found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredBookings.map((b) => (
                <div 
                  key={b.id} 
                  className={`bg-white border rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer relative ${
                    selectedBooking?.id === b.id ? 'border-sky-500 shadow-sm' : 'border-slate-200/80'
                  }`}
                  onClick={() => setSelectedBooking(b)}
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{b.booking_id}</span>
                        {b.id.startsWith('booking-mock-') && (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[8px] font-black rounded-lg uppercase tracking-wider">
                            Demo Mode
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${getStatusBadgeClass(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">
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
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-black rounded-xl text-[10px] cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setSelectedBooking(b)}
                        className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-black rounded-xl text-[10px] cursor-pointer transition-all"
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

        {/* Right side: Tracker view */}
        {selectedBooking && (
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm h-fit space-y-6 relative">
            <button 
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-50"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Refill Delivery Track</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Order tracker for booking: <code className="text-sky-600 font-mono">{selectedBooking.booking_id}</code></p>
            </div>

            {/* Vertical timeline graph */}
            <div className="relative pl-6 border-l border-slate-100 space-y-6 text-xs font-semibold">
              {['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status, index) => {
                const stepCompleted = selectedBooking.timeline.some((t: any) => t.status === status);
                const stepTime = selectedBooking.timeline.find((t: any) => t.status === status)?.timestamp;
                const isCurrentStatus = selectedBooking.status === status;
                
                if (status === 'Cancelled' && !stepCompleted) return null;
                if (selectedBooking.status === 'Cancelled' && (status === 'Out for Delivery' || status === 'Delivered') && !stepCompleted) return null;

                return (
                  <div key={index} className="relative">
                    <div className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${
                      isCurrentStatus 
                        ? 'bg-sky-500 border-sky-500 shadow-sm' 
                        : stepCompleted 
                        ? 'bg-slate-100 border-slate-300' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        isCurrentStatus ? 'bg-white' : stepCompleted ? 'bg-sky-500' : 'bg-transparent'
                      }`} />
                    </div>

                    <div className="space-y-0.5">
                      <span className={`font-black block ${isCurrentStatus ? 'text-sky-600' : stepCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                        {status}
                      </span>
                      {stepTime && (
                        <span className="text-[9px] text-slate-400 font-bold block">
                          {new Date(stepTime).toLocaleDateString()} {new Date(stepTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Technical delivery stats */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 text-[11px] font-semibold leading-relaxed shadow-inner">
              <div>
                <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-extrabold">Delivery Address</span>
                <span className="text-slate-700">{selectedBooking.delivery_address}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-extrabold">Phone Contact</span>
                  <span className="text-slate-700">{selectedBooking.contact_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-extrabold">Priority Speed</span>
                  <span className="text-sky-600 uppercase font-black">{selectedBooking.delivery_preference}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
