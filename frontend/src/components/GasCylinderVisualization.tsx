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
          <div className="relative flex justify-center w-24 h-14 z-10">
            {/* Guard Ring */}
            <div className="absolute top-0 w-24 h-14 border-[7px] border-red-600 rounded-t-[28px] -z-10 shadow-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />
            {/* Handle crossbars */}
            <div className="absolute top-1 w-24 h-7 border-b-[6px] border-red-600 -z-10" />
            {/* Valve Base */}
            <div className="absolute bottom-0 w-8 h-8 bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-700 rounded-t-sm z-10 shadow-sm" />
            <div className="absolute bottom-7 w-10 h-2.5 bg-red-700 rounded-sm z-10 shadow-sm" /> {/* Handwheel */}
            {/* Valve Nozzle */}
            <div className="absolute bottom-2 left-6 w-5 h-3.5 bg-gradient-to-r from-yellow-500 to-yellow-700 rounded-r-sm z-0 border border-yellow-800/20" />
            <div className="absolute bottom-3 left-[44px] w-1.5 h-1.5 bg-black/60 rounded-full z-10" /> {/* Nozzle hole */}
          </div>

          {/* Cylinder Body */}
          <div 
            className={`relative w-[180px] h-[280px] bg-gradient-to-br from-slate-50/20 via-white/40 to-slate-200/10 border-[3px] border-white/60 rounded-[60px] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.1),inset_10px_0_20px_rgba(255,255,255,0.8),0_10px_25px_rgba(0,0,0,0.05)] overflow-hidden z-20 backdrop-blur-[3px] transition-all duration-700`}
            style={{ transform: 'translateZ(10px)' }}
          >
            {/* LPG Logo inside Cylinder */}
            <div className="absolute top-10 left-0 right-0 flex flex-col items-center justify-center opacity-90 z-20 pointer-events-none">
              <svg className="w-10 h-10 text-red-600 mb-0" viewBox="0 0 24 24" fill="currentColor">
                 {/* Flame icon path */}
                 <path d="M11.64,5.23C11.39,5.03 11,5.17 10.95,5.47C10.74,6.77 10.08,7.9 9.17,8.81C7.79,10.19 7,12.04 7,14C7,16.76 9.24,19 12,19C14.76,19 17,16.76 17,14C17,11.37 15.05,9.15 12.5,8.71C12.18,8.65 11.95,8.34 12,8.03C12.19,6.96 12.06,5.88 11.64,5.23Z" />
                 <path d="M14.5,14C14.5,15.38 13.38,16.5 12,16.5C10.62,16.5 9.5,15.38 9.5,14C9.5,13 10.13,12.14 11,11.75C11.13,12.15 11.37,12.5 11.7,12.77C11.41,13.06 11.23,13.45 11.23,13.88C11.23,14.74 11.93,15.44 12.79,15.44C13.65,15.44 14.35,14.74 14.35,13.88C14.35,13.63 14.29,13.4 14.19,13.2C14.39,13.43 14.5,13.7 14.5,14Z" fill="white" />
              </svg>
              <span className="text-red-600 font-black text-3xl tracking-tighter leading-none mt-1">LPG</span>
              <span className="text-red-600 text-[7px] font-bold tracking-widest mt-1">LIQUEFIED PETROLEUM GAS</span>
            </div>

            {/* Labels (Optional - similar to image) */}
            {clampedLevel < 90 && (
               <div className="absolute top-28 left-4 z-30 pointer-events-none opacity-80 flex items-center gap-1">
                 <div className="bg-slate-700/80 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">GAS VAPOR</div>
                 <div className="w-4 h-[1px] bg-slate-700/80 rotate-45 origin-left" />
               </div>
            )}
            {clampedLevel > 15 && (
               <div className="absolute bottom-16 left-4 z-30 pointer-events-none opacity-80 flex items-center gap-1" style={{ bottom: `${Math.max(10, clampedLevel - 15)}%`}}>
                 <div className="bg-slate-700/80 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">LIQUID GAS</div>
                 <div className="w-4 h-[1px] bg-slate-700/80 -rotate-45 origin-left" />
                 <div className="w-1 h-1 rounded-full bg-slate-700/80 -ml-1 mt-3" />
               </div>
            )}

            {/* Scale Line (Right side) */}
            <div className="absolute right-3 top-[50px] bottom-[30px] w-12 flex flex-col justify-between items-end py-0 z-30 pointer-events-none opacity-80">
              <div className="absolute right-[8px] top-0 bottom-0 w-[2px] bg-slate-800" />
              {[100, 80, 60, 40, 20, 0].map((mark) => (
                <div key={mark} className="flex items-center gap-1 w-full justify-end h-0 relative">
                  <span className="text-[11px] font-black text-slate-800 absolute right-4 -translate-y-1/2">{mark}%</span>
                  <div className="w-2.5 h-[2px] bg-slate-800 absolute right-0" />
                </div>
              ))}
              {/* Intermediate ticks */}
              {[90, 70, 50, 30, 10].map((mark) => (
                <div key={mark} className="absolute right-0 w-1.5 h-[2px] bg-slate-800" style={{ top: `${100 - mark}%` }} />
              ))}
            </div>

            {/* Gas Vapor Cloud Layer */}
            <div 
               className="absolute inset-x-0 top-0 z-10 bg-gradient-to-t from-white/70 via-white/20 to-transparent transition-all duration-1000"
               style={{ bottom: `${clampedLevel}%` }}
            >
               {/* Vapor smoke effect */}
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-200/40 via-transparent to-transparent opacity-60 mix-blend-screen" />
            </div>

            {/* Glass Highlights / Reflections */}
            <div className="absolute inset-y-0 left-3 w-6 bg-gradient-to-r from-white/80 to-transparent blur-[3px] rounded-full pointer-events-none z-30" />
            <div className="absolute inset-y-0 right-2 w-10 bg-gradient-to-l from-black/20 to-transparent blur-[6px] rounded-full pointer-events-none z-30" />
            <div className="absolute top-4 left-10 right-10 h-14 bg-white/50 rounded-[40px] blur-[8px] pointer-events-none z-30" />
            <div className="absolute bottom-4 left-10 right-10 h-8 bg-black/15 rounded-[40px] blur-[6px] pointer-events-none z-30" />

            {/* Dynamic Liquid Gas Fill */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-1000 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-800 opacity-90 backdrop-blur-sm shadow-[inset_0_-15px_30px_rgba(0,0,0,0.4)]"
              initial={{ height: '0%' }}
              animate={{ height: `${clampedLevel}%` }}
              transition={{ duration: 1.5, type: 'spring', bounce: 0.15 }}
            >
              {/* Bubbles */}
              <div className="absolute inset-0 overflow-hidden z-10 opacity-60">
                 {Array.from({ length: 8 }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute bg-white/70 rounded-full animate-[ping_4s_ease-in-out_infinite]"
                      style={{
                        left: `${Math.random() * 80 + 10}%`,
                        bottom: `${Math.random() * 80 + 10}%`,
                        width: `${Math.random() * 3 + 2}px`,
                        height: `${Math.random() * 3 + 2}px`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${Math.random() * 2 + 3}s`
                      }}
                    />
                 ))}
              </div>

              {/* 3D Meniscus (Top surface of the liquid) */}
              {clampedLevel > 0 && clampedLevel < 100 && (
                <div className="absolute top-0 left-[-2px] right-[-2px] h-8 -translate-y-1/2 rounded-[100%] bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 border-[1px] border-blue-200/50 shadow-[inset_0_4px_10px_rgba(255,255,255,0.4),0_4px_10px_rgba(29,78,216,0.5)] z-20 flex items-center justify-center pointer-events-none overflow-hidden">
                  {/* Liquid surface waves/reflection */}
                  <div className="absolute top-1 left-4 right-4 h-2 bg-white/40 rounded-full blur-[2px]" />
                  <div className="absolute top-3 left-12 right-12 h-1.5 bg-blue-100/50 rounded-full blur-[1px]" />
                  {/* Wavy effect simulation using border radius */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%] opacity-50 mix-blend-overlay animate-[spin_10s_linear_infinite]" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Base Ring */}
          <div className="w-[120px] h-6 border-[4px] border-t-0 border-red-700 bg-red-600 rounded-b-[20px] -mt-3 z-30 shadow-lg relative flex justify-between px-4 items-center">
             <div className="w-5 h-2 bg-black/50 rounded-full shadow-inner" />
             <div className="w-5 h-2 bg-black/50 rounded-full shadow-inner" />
          </div>
          
          {/* Floor Shadow */}
          <motion.div 
            className="absolute -bottom-5 w-[140px] h-6 bg-slate-300 rounded-full blur-[8px] -z-10"
            style={{ x: shadowX, y: shadowY, scale: isHovered ? 1.05 : 1, opacity: isHovered ? 0.8 : 0.6 }}
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
