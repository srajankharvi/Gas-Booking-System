import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface GasLevelGaugeProps {
  percentage: number;
  isEstimated: boolean;
}

export default function GasLevelGauge({ percentage, isEstimated }: GasLevelGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  const { gradient, glowBorder, waveFill1, waveFill2, badgeBg } = useMemo(() => {
    if (clamped >= 80) return {
      gradient: 'from-emerald-500 to-teal-600',
      glowBorder: 'border-emerald-200 shadow-sm',
      waveFill1: '#34d399', waveFill2: '#059669',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    if (clamped >= 40) return {
      gradient: 'from-sky-500 to-cyan-600',
      glowBorder: 'border-sky-200 shadow-sm',
      waveFill1: '#38bdf8', waveFill2: '#0284c7',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    if (clamped >= 20) return {
      gradient: 'from-amber-400 to-orange-500',
      glowBorder: 'border-amber-200 shadow-sm',
      waveFill1: '#fbbf24', waveFill2: '#d97706',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return {
      gradient: 'from-red-500 to-rose-700',
      glowBorder: 'border-rose-200 shadow-sm animate-pulse',
      waveFill1: '#f87171', waveFill2: '#be123c',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }, [clamped]);

  return (
    <div className="flex flex-col items-center gap-4" role="meter" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      
      {/* Cylinder outer layout container */}
      <div className="relative w-32 h-64 select-none">
        
        {/* Valve Cap */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[85%] h-6 rounded-t-[50%] bg-slate-500 border border-slate-400 z-20" />

        {/* Tank Body layout */}
        <div className={`relative w-full h-full rounded-[32px] border-[2px] overflow-hidden bg-slate-50 transition-all duration-700 ${glowBorder}`}>
          
          {/* Gloss overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/10 pointer-events-none z-30" />
          
          {/* Dynamic filled level height */}
          <motion.div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradient}`}
            initial={{ height: 0 }}
            animate={{ height: `${clamped}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ zIndex: 15 }}
          >
            {/* Wave svg top 1 */}
            <div className="absolute -top-4 left-0 w-[200%] h-6 overflow-visible pointer-events-none">
              <svg className="w-full h-full animate-[gaugeWave1_6s_linear_infinite]" viewBox="0 0 240 24" preserveAspectRatio="none">
                <path d="M0 12 Q30 2, 60 12 T120 12 T180 12 T240 12 L240 24 L0 24 Z" fill={waveFill1} fillOpacity={0.4} />
              </svg>
            </div>
            {/* Wave svg top 2 */}
            <div className="absolute -top-3 left-0 w-[200%] h-5 overflow-visible pointer-events-none">
              <svg className="w-full h-full animate-[gaugeWave2_8s_ease-in-out_infinite]" viewBox="0 0 240 20" preserveAspectRatio="none">
                <path d="M0 10 Q30 4, 60 10 T120 10 T180 10 T240 10 L240 20 L0 20 Z" fill={waveFill2} fillOpacity={0.5} />
              </svg>
            </div>
          </motion.div>

          {/* Central Percent Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-25 pointer-events-none">
            <span className="text-4xl font-black text-slate-800 tabular-nums">
              {Math.round(clamped)}<span className="text-xl">%</span>
            </span>
            <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 mt-1">Gas Capacity</span>
          </div>

        </div>

        {/* Bottom Cap */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] h-5 rounded-b-[50%] bg-slate-500 border border-slate-400 z-20" />

      </div>

      {/* Badges indicators */}
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full border ${badgeBg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isEstimated ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}`} />
          {isEstimated ? 'Estimated' : 'Live'}
        </span>
        {clamped < 15 && (
          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Low Level</span>
        )}
      </div>

    </div>
  );
}
