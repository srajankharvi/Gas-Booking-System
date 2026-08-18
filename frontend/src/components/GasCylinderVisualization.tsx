import { motion } from 'framer-motion';

interface GasCylinderProps {
  gasLevel: number;
  weight: number;
  status: string;
  isConnected: boolean;
}

export default function GasCylinderVisualization({ gasLevel, weight, status, isConnected }: GasCylinderProps) {
  // Determine color scheme based on level
  const getColorScheme = (level: number) => {
    if (level >= 70) return {
      liquid: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/20 border-emerald-500/30',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      waveTop: 'fill-emerald-400/40',
      waveBottom: 'fill-emerald-500/60',
      accent: 'emerald'
    };
    if (level >= 40) return {
      liquid: 'from-sky-500 to-blue-600',
      glow: 'shadow-blue-500/20 border-blue-500/30',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      waveTop: 'fill-sky-400/40',
      waveBottom: 'fill-blue-500/60',
      accent: 'blue'
    };
    if (level >= 20) return {
      liquid: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/30 border-amber-500/30',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      waveTop: 'fill-amber-400/40',
      waveBottom: 'fill-orange-500/60',
      accent: 'amber'
    };
    return {
      liquid: 'from-red-500 to-rose-700',
      glow: 'shadow-rose-600/40 border-rose-500/40 animate-pulse',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      waveTop: 'fill-rose-400/40',
      waveBottom: 'fill-rose-600/60',
      accent: 'rose'
    };
  };

  const scheme = getColorScheme(gasLevel);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-3xl shadow-xl border border-slate-700/50 w-full text-white overflow-hidden relative">
      
      {/* Grid background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Status Badge */}
        <div className="flex justify-between items-center w-full mb-6">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-ping' : 'bg-rose-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isConnected ? 'Device Connected' : 'Cylinder Offline'}
            </span>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${scheme.badge}`}>
            {status}
          </span>
        </div>

        {/* 3D Gas Cylinder Container */}
        <div className="relative w-44 h-80 flex flex-col items-center justify-end my-4">
          
          {/* Cylinder Top Handle */}
          <div className="w-24 h-12 border-[6px] border-slate-600 bg-slate-800 rounded-t-3xl -mb-1 flex justify-around px-4 relative z-20 shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]">
            <div className="w-1.5 h-6 bg-slate-500 rounded-full" />
            <div className="w-1.5 h-6 bg-slate-500 rounded-full" />
          </div>

          {/* Cylinder Valve */}
          <div className="w-8 h-8 bg-gradient-to-r from-slate-400 via-slate-300 to-slate-500 border border-slate-600 rounded-md -mb-1 z-30 shadow-md flex items-center justify-center">
            <div className="w-10 h-2 bg-slate-700 rounded-full absolute -top-1" />
            <div className="w-4 h-4 bg-slate-600 rounded-full shadow-inner" />
          </div>

          {/* Cylinder Collar Ring */}
          <div className="w-32 h-4 bg-slate-700 border-x-2 border-slate-600 rounded-t-lg -mb-1 z-20 shadow-sm" />

          {/* Main Cylinder Body */}
          <div className={`relative w-full h-64 bg-gradient-to-r from-red-700 via-red-600 to-red-800 rounded-[36px] border-[3px] border-red-700/50 overflow-hidden shadow-2xl flex flex-col justify-end ${scheme.glow}`}>
            
            {/* Metallic Reflection Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-black/30 pointer-events-none z-30" />
            <div className="absolute top-0 left-6 w-8 h-full bg-gradient-to-r from-white/10 to-transparent pointer-events-none z-30 opacity-70" />
            
            {/* Horizontal Cylinder Ribs (Structural indentations) */}
            <div className="absolute top-1/4 w-full h-1 bg-red-900/40 z-20" />
            <div className="absolute top-2/4 w-full h-1 bg-red-900/40 z-20" />
            <div className="absolute top-3/4 w-full h-1 bg-red-900/40 z-20" />
            
            {/* Gas Brand Logo (SmartGas) */}
            <div className="absolute top-10 left-0 right-0 flex flex-col items-center justify-center opacity-15 select-none z-10">
              <span className="font-extrabold tracking-widest text-lg">GasTrack</span>
              <span className="text-[8px] uppercase tracking-widest">LPG 14.2 KG</span>
            </div>

            {/* Liquid / Gas fill level */}
            <motion.div 
              className={`absolute bottom-0 w-full bg-gradient-to-t ${scheme.liquid} z-15`}
              initial={{ height: 0 }}
              animate={{ height: `${gasLevel}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              {/* Waves at top of liquid */}
              <div className="absolute top-0 left-0 right-0 -mt-3.5 h-4 overflow-hidden">
                <svg viewBox="0 0 120 28" className={`w-full h-full ${scheme.waveTop} animate-wave`}>
                  <path d="M0 15 Q 30 0, 60 15 T 120 15 L 120 28 L 0 28 Z" />
                </svg>
                <svg viewBox="0 0 120 28" className={`w-full h-full absolute top-1 left-2 ${scheme.waveBottom} animate-wave-slow`}>
                  <path d="M0 15 Q 30 5, 60 15 T 120 15 L 120 28 L 0 28 Z" />
                </svg>
              </div>

              {/* Liquid Gloss reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

              {/* Bubble Animations inside the liquid */}
              {isConnected && gasLevel > 5 && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute bottom-0 w-1 h-1 bg-white/40 rounded-full"
                      style={{ left: `${15 + i * 15}%` }}
                      animate={{
                        y: [0, -180],
                        opacity: [0, 0.7, 0],
                        scale: [0.8, 1.2, 0.5]
                      }}
                      transition={{
                        duration: 3 + i * 0.6,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
            
            {/* Level text readout centered inside cylinder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-25 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <span className="text-5xl font-black text-white">{Math.round(gasLevel)}%</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-1">Remaining</span>
            </div>

          </div>
          
          {/* Cylinder Ring Base */}
          <div className="w-28 h-6 bg-slate-800 border-b-4 border-slate-900 rounded-b-xl z-20 shadow-md" />
        </div>

        {/* Weights & metrics footer */}
        <div className="grid grid-cols-2 gap-4 w-full mt-6 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
          <div className="text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Total Weight</span>
            <span className="text-lg font-bold text-slate-100">{weight.toFixed(2)} kg</span>
          </div>
          <div className="text-center border-l border-slate-700/50">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Net Gas Weight</span>
            <span className="text-lg font-bold text-sky-400">
              {Math.max(0, weight - 15.0).toFixed(2)} kg
            </span>
          </div>
        </div>

      </div>

      {/* Tailwind inline styling injection for wave animations */}
      <style>{`
        @keyframes wave {
          0% { transform: translateX(0); }
          50% { transform: translateX(-25%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave-slow {
          0% { transform: translateX(-20%); }
          50% { transform: translateX(5%); }
          100% { transform: translateX(-20%); }
        }
        .animate-wave {
          animation: wave 12s linear infinite;
        }
        .animate-wave-slow {
          animation: wave-slow 8s ease-in-out infinite;
        }
      `}</style>

    </div>
  );
}
