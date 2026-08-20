import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CalendarPlus, X, WifiOff } from 'lucide-react';
import { apiClient } from '../api/client';

interface LowGasNotificationProps {
  cylinderId: string;
  percentage: number;
  isEstimated: boolean;
}

type NotificationState = 'normal' | 'warned' | 'booked';

const LOW_THRESHOLD = 15;

/**
 * Non-blocking notification banner. State machine:
 * normal → warned (crosses below 15%)
 * warned → booked (user clicks Book Now)
 * booked/warned → normal (gas rises above threshold)
 */
export default function LowGasNotification({ cylinderId, percentage, isEstimated }: LowGasNotificationProps) {
  const [state, setState] = useState<NotificationState>('normal');
  const [booking, setBooking] = useState(false);
  const prevAboveRef = useRef(percentage >= LOW_THRESHOLD);

  useEffect(() => {
    const isAbove = percentage >= LOW_THRESHOLD;
    const wasAbove = prevAboveRef.current;

    if (wasAbove && !isAbove && state === 'normal') {
      setState('warned');
    }
    if (isAbove && state !== 'normal') {
      setState('normal');
    }
    prevAboveRef.current = isAbove;
  }, [percentage, state]);

  const handleBook = async () => {
    setBooking(true);
    try {
      await apiClient.post('/api/bookings', {
        cylinder_id: cylinderId,
        provider: 'auto',
        payment_method: 'upi',
      });
      setState('booked');
    } catch (err) {
      console.error('[LowGasNotification] Booking failed', err);
    } finally {
      setBooking(false);
    }
  };

  return (
    <AnimatePresence>
      {state === 'warned' && (
        <motion.div
          key="low-gas-banner"
          role="alert"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-lg overflow-hidden ${
            isEstimated
              ? 'bg-amber-950/30 border-amber-600/30'
              : 'bg-rose-950/30 border-rose-600/30'
          }`}
        >
          <div className={`absolute inset-0 rounded-2xl pointer-events-none ${
            isEstimated ? 'bg-gradient-to-r from-amber-500/5 to-transparent' : 'bg-gradient-to-r from-rose-500/5 to-transparent'
          }`} />

          <div className="flex items-start gap-3 relative z-10">
            <div className={`p-2.5 rounded-xl shrink-0 ${isEstimated ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
              {isEstimated ? <WifiOff size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                {isEstimated
                  ? `Estimated ~${Math.round(percentage)}% — Low Gas Level`
                  : `${Math.round(percentage)}% — Low Gas Level`}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
                {isEstimated
                  ? 'This reading is estimated. Reconnect your IoT device for an accurate measurement, or book a refill now.'
                  : 'Your cylinder is running critically low. Book a replacement before it runs out.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <button
              onClick={handleBook}
              disabled={booking}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                isEstimated
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CalendarPlus size={14} />
              {booking ? 'Booking...' : 'Book Now'}
            </button>
            <button
              onClick={() => setState('normal')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
