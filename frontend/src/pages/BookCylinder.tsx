import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, Info, ShoppingBag, 
  CheckCircle, ArrowLeft, ArrowRight, AlertTriangle 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { isMockModeEnabled, mockCylinderStore, mockBookingsStore } from '../mock/gasMockData';

export default function BookCylinder() {
  const [step, setStep] = useState(1);
  const [cylinder, setCylinder] = useState<any>(null);
  
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [preference, setPreference] = useState('Standard');
  
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [successBooking, setSuccessBooking] = useState<any>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(rawUser);
    setAddress(parsedUser.address || '');
    setContactNumber(parsedUser.mobile || '');

    const fetchData = async () => {
      try {
        const cylRes = await apiClient.get('/api/users/cylinders');
        if (cylRes.data.length > 0) {
          setCylinder(cylRes.data[0]);
        } else if (isMockModeEnabled()) {
          setCylinder(mockCylinderStore.get());
        }
      } catch (err) {
        console.error('Error fetching cylinder config', err);
        if (isMockModeEnabled()) {
          setCylinder(mockCylinderStore.get());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleCreateBooking = async () => {
    setBookingLoading(true);
    setError('');

    if (isMockModeEnabled() && (!cylinder || cylinder.id === 'CYL-DEMO-001')) {
      try {
        const bookings = mockBookingsStore.get();
        const active = bookings.find((b: any) => 
          ['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(b.status)
        );
        if (active) {
          setError('You already have an active booking. Multiple active bookings are not allowed.');
          setBookingLoading(false);
          return;
        }

        const bookingId = `GAS-DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const newBooking = {
          id: `booking-mock-${Date.now()}`,
          booking_id: bookingId,
          cylinder_id: 'CYL-DEMO-001',
          status: 'Pending',
          delivery_address: address,
          contact_number: contactNumber,
          delivery_preference: preference,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          timeline: [
            { status: 'Pending', timestamp: new Date().toISOString() }
          ]
        };

        mockBookingsStore.add(newBooking);
        setSuccessBooking(newBooking);
        setStep(4);
      } catch (e: any) {
        setError(e.message || 'Mock booking creation failed.');
      } finally {
        setBookingLoading(false);
      }
      return;
    }

    try {
      const response = await apiClient.post('/api/bookings', {
        delivery_address: address,
        contact_number: contactNumber,
        delivery_preference: preference
      });
      setSuccessBooking(response.data);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Preparing booking records...</span>
      </div>
    );
  }

  if (step === 4 && successBooking) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm mt-8">
        <div className="mx-auto h-20 w-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-inner">
          <CheckCircle size={44} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Booking Confirmed</h2>
        <p className="text-xs text-slate-500 mt-2">Your gas cylinder booking has been created successfully.</p>
        
        {isMockModeEnabled() && (!cylinder || cylinder.id === 'CYL-DEMO-001') && (
          <div className="my-2 text-[10px] uppercase font-black text-amber-500 tracking-wider">
            Demo Cylinder Mode
          </div>
        )}

        <div className="my-6 bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-left space-y-2.5 max-w-sm mx-auto shadow-inner">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Booking ID:</span>
            <code className="text-sky-600 font-mono">{successBooking.booking_id}</code>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Estimated Delivery:</span>
            <span className="text-slate-800">1-2 Business Days</span>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Total Price:</span>
            <span className="text-slate-800">Cash on Delivery</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link 
            to="/bookings" 
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs cursor-pointer shadow-md shadow-sky-500/10 transition-all text-center"
          >
            Track Booking Timeline
          </Link>
          <Link 
            to="/" 
            className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-all text-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 text-rose-800 text-xs font-bold shadow-sm">
          <AlertTriangle size={18} className="shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Progress */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center border transition-all ${
              step >= num 
                ? 'bg-sky-500 text-white border-sky-500 shadow-sm' 
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              {num}
            </div>
            <span className={`text-[10px] uppercase font-black tracking-wider hidden sm:inline ${
              step >= num ? 'text-slate-900' : 'text-slate-400'
            }`}>
              {num === 1 ? 'Current Status' : num === 2 ? 'Delivery Info' : 'Review & Book'}
            </span>
          </div>
        ))}
      </div>

      {/* Steps contents */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
        
        {/* STEP 1: Current Cylinder Status */}
        {step === 1 && cylinder && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag size={16} className="text-sky-500" />
              Current LPG Cylinder Level
            </h3>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-200/60 shadow-inner">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-extrabold">Current Capacity</span>
                <span className={`text-2xl font-black block mt-1 ${cylinder.current_percent < 20 ? 'text-rose-500' : 'text-slate-900'}`}>
                  {Math.round(cylinder.current_percent)}% remaining
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-extrabold">Estimated Empty Date</span>
                <span className="text-2xl font-black text-slate-950 block mt-1">August 26, 2026</span>
              </div>
            </div>

            <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-xs text-slate-600 leading-relaxed flex gap-3 shadow-inner">
              <Info size={18} className="shrink-0 text-sky-500" />
              <span>
                Standard cylinders contain 14.2 kg of liquefied petroleum gas. Refills are handled by certified distributors and include compliance checks.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-sky-500/10"
              >
                Proceed to Details
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Address & Contact */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <MapPin size={16} className="text-sky-500" />
              Delivery Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Address</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all resize-none text-xs leading-relaxed"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Contact Number</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Speed</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Standard', 'Express'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPreference(opt)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        preference === opt 
                          ? 'bg-sky-50 border-sky-500 text-sky-600 font-black shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 font-semibold hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs text-slate-800">{opt}</span>
                      <span className="text-[10px] text-slate-400 block mt-1 font-bold">
                        {opt === 'Standard' ? '1-2 business days' : 'Same day priority'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (!address || !contactNumber) {
                    setError('Please specify delivery address and contact.');
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-sky-500/10"
              >
                Review details
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag size={16} className="text-sky-500" />
              Review Refill Booking
            </h3>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4 text-xs font-semibold shadow-inner">
              <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-400">Cylinder details:</span>
                <span className="text-slate-800">14.2kg LPG Refill</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-400">Delivery Address:</span>
                <span className="text-slate-800 text-right max-w-xs truncate">{address}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-400">Phone contact:</span>
                <span className="text-slate-800">{contactNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-400">Delivery preference:</span>
                <span className="text-sky-600 uppercase font-black">{preference}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500 font-extrabold">Estimated Cost:</span>
                <span className="text-sky-600 font-black">Cash on Delivery</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button 
                type="button"
                disabled={bookingLoading}
                onClick={handleCreateBooking}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/10 transition-all disabled:opacity-50"
              >
                {bookingLoading ? 'Confirming Refill...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
