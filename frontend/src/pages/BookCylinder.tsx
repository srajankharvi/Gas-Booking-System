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
  
  // Form fields
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
        // Check if there is already an active mock booking
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
        setStep(4); // Show success screen
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
      setStep(4); // Show success screen
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 mt-4 text-xs font-semibold">Preparing booking records...</span>
      </div>
    );
  }

  // Success Screen
  if (step === 4 && successBooking) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center bg-slate-850 border border-slate-850 rounded-3xl p-8 shadow-xl mt-8">
        <div className="mx-auto h-20 w-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-6 animate-pulse">
          <CheckCircle size={44} />
        </div>
        <h2 className="text-2xl font-black text-slate-100">Booking Confirmed</h2>
        <p className="text-xs text-slate-400 mt-2">Your gas cylinder booking has been created successfully.</p>
        
        {isMockModeEnabled() && (!cylinder || cylinder.id === 'CYL-DEMO-001') && (
          <div className="my-2 text-[10px] uppercase font-bold text-amber-500 tracking-wider">
            Demo Cylinder
          </div>
        )}

        <div className="my-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-800 text-left space-y-2 max-w-sm mx-auto">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Booking ID:</span>
            <code className="text-sky-400 font-mono font-semibold">{successBooking.booking_id}</code>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Estimated Delivery:</span>
            <span className="text-slate-300 font-semibold">1-2 Business Days</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Total Price:</span>
            <span className="text-slate-300 font-semibold">Cash on Delivery</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link 
            to="/bookings" 
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all font-mono"
          >
            Track Booking Timeline
          </Link>
          <Link 
            to="/" 
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-7.5 border border-slate-700/50 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all font-mono"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <header>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">Book Refill Cylinder</h2>
        <p className="text-slate-400 text-xs mt-1">Submit booking requests for cylinder refills with delivery options.</p>
      </header>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-rose-400 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Progress */}
      <div className="bg-slate-850 border border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-sm">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
              step >= num 
                ? 'bg-sky-500 text-white border-sky-500' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}>
              {num}
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider hidden sm:inline ${
              step >= num ? 'text-slate-200' : 'text-slate-500'
            }`}>
              {num === 1 ? 'Diagnostics' : num === 2 ? 'Address' : 'Review'}
            </span>
            {num < 3 && <div className="h-0.5 w-12 bg-slate-800 mx-2 hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Forms based on step */}
      <div className="bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md">
        
        {/* STEP 1: Diagnostic Verification */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <ShoppingBag size={16} className="text-sky-400" />
              Cylinder Diagnostic Verification
            </h3>
            
            {cylinder && (
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Current Level</span>
                  <span className={`text-xl font-bold block mt-1 ${
                    cylinder.current_percent <= 20.0 ? 'text-rose-400 animate-pulse' : 'text-sky-400'
                  }`}>
                    {cylinder.current_percent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Estimated Days left</span>
                  <span className="text-xl font-bold text-slate-200 block mt-1">
                    {cylinder.estimated_days ? `${cylinder.estimated_days} Days` : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10 text-xs text-sky-300 leading-relaxed flex gap-3">
              <Info size={18} className="shrink-0 text-sky-400" />
              <span>
                Standard cylinders contain 14.2 kg of liquefied petroleum gas. Refills are handled by certified distributors and include compliance checks.
              </span>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md font-mono"
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
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <MapPin size={16} className="text-sky-400" />
              Delivery Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Address</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-2xl text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all resize-none text-xs leading-relaxed"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contact Number</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Speed</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Standard', 'Express'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPreference(opt)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        preference === opt 
                          ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 font-medium'
                      }`}
                    >
                      <span className="block text-xs text-slate-200">{opt}</span>
                      <span className="text-[10px] text-slate-500 block mt-1">
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
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-7.5 border border-slate-700/50 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all font-mono"
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
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md font-mono"
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
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <ShoppingBag size={16} className="text-sky-400" />
              Review Refill Booking
            </h3>

            <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Cylinder details:</span>
                <span className="text-slate-300 font-semibold">14.2kg LPG Refill</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="text-slate-300 font-semibold text-right max-w-xs truncate">{address}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Phone contact:</span>
                <span className="text-slate-300 font-semibold">{contactNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Delivery preference:</span>
                <span className="text-slate-350 font-bold uppercase">{preference}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400 font-bold">Estimated Cost:</span>
                <span className="text-sky-400 font-extrabold">Cash on Delivery</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-7.5 border border-slate-700/50 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all font-mono"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button 
                type="button"
                disabled={bookingLoading}
                onClick={handleCreateBooking}
                className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50 font-mono"
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
