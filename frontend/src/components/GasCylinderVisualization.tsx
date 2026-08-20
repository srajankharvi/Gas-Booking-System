import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface GasCylinderProps {
  gasLevel: number;
  weight: number;
  tareWeight: number;
  status: string; // From API, but we'll compute our own display status based on level
  isConnected: boolean;
}

export default function GasCylinderVisualization({ gasLevel, weight, tareWeight }: GasCylinderProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for interactive 3D rotation based on mouse movement
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  
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

  // Clamp gas level between 0 and 100
  const clampedLevel = Math.min(100, Math.max(0, gasLevel));

  // Determine color scheme based on level
  const getColorScheme = (level: number) => {
    if (level >= 75) return {
      fillColor: 'rgba(34, 197, 94, 0.85)', // Green
      status: 'FULL',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500'
    };
    if (level >= 50) return {
      fillColor: 'rgba(163, 230, 53, 0.85)', // Yellow/Green (Lime)
      status: 'GOOD',
      badge: 'bg-lime-50 text-lime-700 border-lime-200',
      dot: 'bg-lime-500'
    };
    if (level >= 25) return {
      fillColor: 'rgba(249, 115, 22, 0.85)', // Orange
      status: 'MEDIUM',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      dot: 'bg-orange-500'
    };
    if (level >= 15) return {
      fillColor: 'rgba(239, 68, 68, 0.85)', // Orange/Red
      status: 'LOW',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500'
    };
    return {
      fillColor: 'rgba(220, 38, 38, 0.95)', // Red
      status: 'CRITICAL',
      badge: 'bg-red-50 text-red-700 border-red-300 animate-pulse',
      dot: 'bg-red-600 animate-pulse',
      glow: 'shadow-[0_0_25px_rgba(220,38,38,0.4)]'
    };
  };

  const scheme = getColorScheme(clampedLevel);
  const netWeight = Math.max(0, weight - tareWeight).toFixed(2);

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-slate-200/80 w-full text-slate-800 overflow-hidden relative select-none transition-all duration-300"
      style={{ perspective: '1200px' }}
    >
      <div className="flex justify-between items-center w-full mb-8 relative z-30">
        <span className="font-extrabold text-xs uppercase tracking-wider text-slate-950">My Cylinder</span>
      </div>

      <motion.div 
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="flex flex-row items-center justify-between w-full relative z-10"
      >
        
        {/* Left Side: Status & Percentage */}
        <div className="flex-1 flex flex-col items-start gap-1">
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Gas Left</span>
          <span className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums my-1">
            {Math.round(clampedLevel)}%
          </span>
          <div className={`px-2.5 py-1 mt-1 rounded text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${scheme.badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${scheme.dot}`} />
            {scheme.status}
          </div>
        </div>

        {/* Center: The Realistic Cylinder */}
        <div className="flex-none flex flex-col items-center relative z-20 px-2 sm:px-6">
          
          {/* Valve Guard/Handle */}
          <div className="relative flex justify-center w-20 h-12 z-10">
            {/* Guard Ring */}
            <div className="absolute top-0 w-20 h-12 border-[5px] border-red-500 rounded-t-[24px] -z-10 shadow-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />
            {/* Valve */}
            <div className="absolute bottom-0 w-6 h-6 bg-gradient-to-b from-yellow-500 to-yellow-700 rounded-t-sm z-10" />
            <div className="absolute bottom-5 w-8 h-2 bg-slate-700 rounded-sm z-10 shadow-sm" /> {/* Handwheel */}
          </div>

          {/* Cylinder Body */}
          <div 
            className={`relative w-36 h-64 bg-gradient-to-r from-red-100/30 via-white/40 to-red-200/20 border-[4px] border-red-600 rounded-[48px] shadow-[inset_-8px_0_15px_rgba(0,0,0,0.2),inset_8px_0_15px_rgba(255,255,255,0.5)] overflow-hidden z-20 backdrop-blur-[3px] transition-all duration-700 ${scheme.glow || ''}`}
            style={{ transform: 'translateZ(10px)' }}
          >
            {/* Glass Highlights / Reflections */}
            <div className="absolute inset-y-0 left-3 w-4 bg-gradient-to-r from-white/60 to-transparent blur-[2px] rounded-full pointer-events-none z-30" />
            <div className="absolute inset-y-0 right-2 w-6 bg-gradient-to-l from-black/30 to-transparent blur-[4px] rounded-full pointer-events-none z-30" />
            <div className="absolute top-4 left-6 right-6 h-12 bg-white/30 rounded-[30px] blur-[6px] pointer-events-none z-30" />
            <div className="absolute bottom-4 left-8 right-8 h-6 bg-black/20 rounded-[30px] blur-[5px] pointer-events-none z-30" />

            {/* Dynamic Liquid/Gas Fill */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-1000 bg-gradient-to-r from-red-800 via-red-500 to-red-900 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.4)]"
              initial={{ height: '0%' }}
              animate={{ height: `${clampedLevel}%` }}
              transition={{ duration: 1.5, type: 'spring', bounce: 0.15 }}
            >
              {/* 3D Meniscus (Top surface of the liquid) */}
              {clampedLevel > 0 && clampedLevel < 100 && (
                <div className="absolute top-0 left-[-2px] right-[-2px] h-5 -translate-y-1/2 rounded-[100%] bg-gradient-to-r from-red-700 via-red-400 to-red-800 border-[1.5px] border-red-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3),0_2px_4px_rgba(220,38,38,0.5)] z-20 flex items-center justify-center pointer-events-none">
                  {/* Liquid surface reflection */}
                  <div className="absolute top-0.5 left-4 right-4 h-1 bg-white/40 rounded-full blur-[1px]" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Base Ring */}
          <div className="w-24 h-4 border-[4px] border-t-0 border-red-500 bg-red-600 rounded-b-xl -mt-1 z-10 shadow-md" />
          
          {/* Floor Shadow */}
          <motion.div 
            className="absolute -bottom-3 w-32 h-4 bg-slate-300 rounded-full blur-[5px] -z-10"
            style={{ x: shadowX, y: shadowY, scale: isHovered ? 1.05 : 1, opacity: isHovered ? 0.7 : 0.5 }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Right Side: Empty to keep cylinder centered */}
        <div className="flex-1"></div>

      </motion.div>

      {/* Weight Info Cards */}
      <div className="grid grid-cols-2 gap-4 w-full mt-10 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-inner relative z-30">
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
