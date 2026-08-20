import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface GasCylinderProps {
  gasLevel: number;
  weight: number;
  status: string;
  isConnected: boolean;
}

export default function GasCylinderVisualization({ gasLevel, weight, status }: GasCylinderProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for interactive 3D rotation based on mouse movement
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  
  // Dynamic shadow translation
  const shadowX = useTransform(rotateY, [-10, 10], [10, -10]);
  const shadowY = useTransform(rotateX, [-10, 10], [15, 5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    const rY = (mouseX / (width / 2)) * 10;
    const rX = -(mouseY / (height / 2)) * 10;
    
    rotateX.set(rX);
    rotateY.set(rY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  // Determine color scheme based on level
  const getColorScheme = (level: number) => {
    if (level >= 80) return {
      liquidColor: 'rgba(16, 185, 129, 0.75)', // emerald
      liquidGlow: 'rgba(16, 185, 129, 0.4)',
      liquidTop: 'rgba(52, 211, 153, 0.95)',
      gradient: 'from-emerald-500/20 via-emerald-500/40 to-emerald-600/70',
      badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      glowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    };
    if (level >= 40) return {
      liquidColor: 'rgba(14, 165, 233, 0.75)', // sky
      liquidGlow: 'rgba(14, 165, 233, 0.4)',
      liquidTop: 'rgba(56, 189, 248, 0.95)',
      gradient: 'from-sky-500/20 via-sky-500/40 to-blue-600/70',
      badge: 'bg-sky-50 border-sky-200 text-sky-700',
      glowClass: 'shadow-[0_0_30px_rgba(14,165,233,0.15)]',
    };
    if (level >= 20) return {
      liquidColor: 'rgba(245, 158, 11, 0.75)', // amber
      liquidGlow: 'rgba(245, 158, 11, 0.4)',
      liquidTop: 'rgba(251, 191, 36, 0.95)',
      gradient: 'from-amber-500/20 via-amber-500/40 to-orange-600/70',
      badge: 'bg-amber-50 border-amber-200 text-amber-700',
      glowClass: 'shadow-[0_0_35px_rgba(245,158,11,0.2)]',
    };
    return {
      liquidColor: 'rgba(239, 68, 68, 0.75)', // red
      liquidGlow: 'rgba(239, 68, 68, 0.5)',
      liquidTop: 'rgba(248, 113, 113, 0.95)',
      gradient: 'from-red-500/20 via-red-500/40 to-rose-700/70',
      badge: 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse',
      glowClass: 'shadow-[0_0_40px_rgba(239,68,68,0.25)]',
    };
  };

  const scheme = getColorScheme(gasLevel);
  const netWeight = Math.max(0, weight - 5.0).toFixed(2);

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-slate-200/80 w-full text-slate-800 overflow-hidden relative select-none transition-all duration-300"
      style={{
        perspective: '1200px',
      }}
    >
      {/* Visual Header */}
      <div className="flex justify-between items-center w-full mb-6 relative z-30">
        <span className="font-extrabold text-xs uppercase tracking-wider text-slate-950">My Cylinder</span>
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${scheme.badge}`}>
          {status}
        </span>
      </div>

      <motion.div 
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="flex flex-col items-center justify-center relative w-full"
      >
        <div className="relative flex flex-col items-center z-10 w-full max-w-[150px]">
          <div className="w-16 h-4 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg -mb-0.5 border border-slate-600 shadow-sm flex items-center justify-center z-30">
            <div className="w-10 h-1.5 bg-slate-900 rounded-full" />
          </div>

          <div className="w-24 h-5 bg-gradient-to-r from-slate-600 to-slate-700 rounded-t-xl -mb-1 z-25 shadow-sm" />

          <div 
            className={`relative w-full h-56 bg-gradient-to-r from-red-600 via-red-500 to-red-700 rounded-[28px] border-[2px] border-red-600/40 overflow-hidden flex flex-col justify-end transition-shadow duration-500 ${scheme.glowClass}`}
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateZ(10px)'
            }}
          >
            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/25 to-transparent pointer-events-none z-30" />
            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/25 to-transparent pointer-events-none z-30" />
            
            <div className="absolute top-6 left-0 right-0 flex flex-col items-center justify-center opacity-15 select-none z-10 pointer-events-none">
              <span className="font-black tracking-widest text-[9px] text-white">PROPANE-LPG</span>
              <span className="text-[6px] font-extrabold uppercase tracking-widest text-slate-200">IoT Sensor</span>
            </div>

            <div 
              className="absolute inset-y-6 left-[45%] right-[45%] bg-slate-950/70 border border-slate-800 rounded-full overflow-hidden z-20 shadow-inner"
              style={{ transform: 'translateZ(1px)' }}
            >
              <motion.div 
                className={`absolute bottom-0 inset-x-0 bg-gradient-to-t ${scheme.gradient} rounded-b-full`}
                initial={{ height: 0 }}
                animate={{ height: `${gasLevel}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <div className="absolute inset-0 blur-[2px] opacity-75" style={{ backgroundColor: scheme.liquidGlow }} />
                <div className="absolute top-0 left-0 right-0 -translate-y-1/2 h-2 rounded-full z-30" style={{ backgroundColor: scheme.liquidTop }} />
              </motion.div>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center z-25 pointer-events-none">
              <div className="text-center bg-slate-900/60 backdrop-blur-md rounded-2xl p-2.5 border border-slate-700/30">
                <span className="text-3xl font-black block tracking-tighter text-white">
                  {Math.round(gasLevel)}%
                </span>
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-300 block">LPG Left</span>
              </div>
            </div>

          </div>
          
          <div className="w-22 h-5 bg-gradient-to-r from-slate-700 to-slate-800 rounded-b-xl z-20 shadow-md" />
        </div>

        <motion.div 
          className="absolute -bottom-2 w-28 h-3 bg-slate-300 rounded-full blur-[4px] -z-10"
          style={{
            x: shadowX,
            y: shadowY,
            scale: isHovered ? 1.05 : 1,
            opacity: isHovered ? 0.7 : 0.5
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 w-full mt-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-inner relative z-30">
        <div className="text-center">
          <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Gross Weight</span>
          <span className="text-sm font-black text-slate-800 mt-0.5 block">{weight.toFixed(2)} kg</span>
        </div>
        <div className="text-center border-l border-slate-200">
          <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Net Gas Weight</span>
          <span className="text-sm font-black text-sky-500 mt-0.5 block">{netWeight} kg</span>
        </div>
      </div>

    </div>
  );
}
