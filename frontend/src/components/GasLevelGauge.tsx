import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface GasLevelGaugeProps {
  percentage: number;
  isEstimated: boolean;
}

/**
 * Animated vertical gas-level gauge with liquid-fill SVG wave animation,
 * colour transitions by level, and accessibility support.
 */
export default function GasLevelGauge({ percentage, isEstimated }: GasLevelGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  const { gradient, glowBorder, waveFill1, waveFill2, badgeBg } = useMemo(() => {
    if (clamped > 40) return {
      gradient: 'from-teal-500 to-cyan-600',
      glowBorder: 'border-teal-500/30 shadow-[0_0_30px_rgba(20,184,166,0.25)]',
      waveFill1: '#2dd4bf', waveFill2: '#0d9488',
      badgeBg: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    };
    if (clamped > 15) return {
      gradient: 'from-amber-400 to-orange-500',
      glowBorder: 'border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.3)]',
      waveFill1: '#fbbf24', waveFill2: '#d97706',
      badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
    return {
      gradient: 'from-red-500 to-rose-700',
      glowBorder: 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.35)] animate-pulse',
      waveFill1: '#f87171', waveFill2: '#be123c',
      badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
  }, [clamped]);

  return (
    <div
      className="flex flex-col items-center gap-4"
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Gas level: ${Math.round(clamped)} percent${isEstimated ? ' (estimated)' : ''}`}
    >
      {/* Cylinder container */}
      <div className="relative w-36 h-72 select-none">
        {/* Top cap */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[88%] h-8 rounded-t-[50%] bg-slate-700 border-2 border-slate-600 z-20" />

        {/* Tank body */}
        <div className={`relative w-full h-full rounded-[40px] border-[3px] overflow-hidden bg-slate-900/80 transition-all duration-700 ${glowBorder}`}>
          {/* Metallic sheen */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.06] via-transparent to-black/20 pointer-events-none z-30" />
          <div className="absolute left-3 top-0 bottom-0 w-5 bg-gradient-to-r from-white/[0.06] to-transparent pointer-events-none z-30" />

          {/* Animated liquid fill */}
          <motion.div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradient}`}
            initial={{ height: 0 }}
            animate={{ height: `${clamped}%` }}
            transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ zIndex: 15 }}
          >
            {/* Wave surface 1 */}
            <div className="absolute -top-4 left-0 w-[200%] h-6 overflow-visible pointer-events-none">
              <svg className="w-full h-full animate-[gaugeWave1_6s_linear_infinite]" viewBox="0 0 240 24" preserveAspectRatio="none">
                <path d="M0 12 Q30 2, 60 12 T120 12 T180 12 T240 12 L240 24 L0 24 Z" fill={waveFill1} fillOpacity={0.5} />
              </svg>
            </div>
            {/* Wave surface 2 */}
            <div className="absolute -top-3 left-0 w-[200%] h-5 overflow-visible pointer-events-none">
              <svg className="w-full h-full animate-[gaugeWave2_8s_ease-in-out_infinite]" viewBox="0 0 240 20" preserveAspectRatio="none">
                <path d="M0 10 Q30 4, 60 10 T120 10 T180 10 T240 10 L240 20 L0 20 Z" fill={waveFill2} fillOpacity={0.6} />
              </svg>
            </div>

            {/* Gloss */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

            {/* Bubbles */}
            {clamped > 5 && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute bottom-0 rounded-full bg-white/30"
                    style={{ left: `${12 + i * 18}%`, width: `${3 + (i % 3)}px`, height: `${3 + (i % 3)}px` }}
                    animate={{ y: [0, -160], opacity: [0, 0.7, 0], scale: [0.7, 1.1, 0.4] }}
                    transition={{ duration: 3.5 + i * 0.5, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Percentage readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-25 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            <span className="text-5xl font-black text-white tabular-nums">
              {Math.round(clamped)}<span className="text-2xl">%</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-1">Gas Level</span>
          </div>
        </div>

        {/* Bottom cap */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[88%] h-6 rounded-b-[50%] bg-slate-700 border-2 border-slate-600 z-20" />
      </div>

      {/* Live / Estimated badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full border ${badgeBg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isEstimated ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
          {isEstimated ? 'Estimated' : 'Live'}
        </span>
        {clamped < 15 && (
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Critical</span>
        )}
      </div>

      <style>{`
        @keyframes gaugeWave1 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes gaugeWave2 { 0% { transform: translateX(-15%); } 50% { transform: translateX(5%); } 100% { transform: translateX(-15%); } }
      `}</style>
    </div>
  );
}
