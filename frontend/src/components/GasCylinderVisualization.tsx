import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface GasCylinderProps {
  gasLevel: number;
  weight: number;
  status: string;
  isConnected: boolean;
}

export default function GasCylinderVisualization({ gasLevel, weight, status, isConnected }: GasCylinderProps) {
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
    
    // Limit rotation to max 12 degrees
    const rY = (mouseX / (width / 2)) * 12;
    const rX = -(mouseY / (height / 2)) * 12;
    
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
    if (level >= 70) return {
      liquidColor: 'rgba(16, 185, 129, 0.75)', // emerald
      liquidGlow: 'rgba(16, 185, 129, 0.4)',
      liquidTop: 'rgba(52, 211, 153, 0.95)',
      gradient: 'from-emerald-500/20 via-emerald-500/40 to-emerald-600/70',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      glowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]',
    };
    if (level >= 40) return {
      liquidColor: 'rgba(14, 165, 233, 0.75)', // sky
      liquidGlow: 'rgba(14, 165, 233, 0.4)',
      liquidTop: 'rgba(56, 189, 248, 0.95)',
      gradient: 'from-sky-500/20 via-sky-500/40 to-blue-600/70',
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
      glowClass: 'shadow-[0_0_30px_rgba(14,165,233,0.25)]',
    };
    if (level >= 20) return {
      liquidColor: 'rgba(245, 158, 11, 0.75)', // amber
      liquidGlow: 'rgba(245, 158, 11, 0.4)',
      liquidTop: 'rgba(251, 191, 36, 0.95)',
      gradient: 'from-amber-500/20 via-amber-500/40 to-orange-600/70',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      glowClass: 'shadow-[0_0_35px_rgba(245,158,11,0.3)]',
    };
    return {
      liquidColor: 'rgba(239, 68, 68, 0.75)', // red
      liquidGlow: 'rgba(239, 68, 68, 0.5)',
      liquidTop: 'rgba(248, 113, 113, 0.95)',
      gradient: 'from-red-500/20 via-red-500/40 to-rose-700/70',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse',
      glowClass: 'shadow-[0_0_40px_rgba(239,68,68,0.45)]',
    };
  };

  const scheme = getColorScheme(gasLevel);

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900/90 via-slate-900 to-slate-950/95 rounded-3xl shadow-2xl border border-slate-800/80 w-full text-white overflow-hidden relative select-none transition-all duration-300"
      style={{
        perspective: '1200px',
      }}
    >
      {/* Soft Ambient Radial Background Lights */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]" 
        style={{ pointerEvents: 'none' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-500"
        style={{
          backgroundColor: gasLevel >= 70 ? '#10b981' : gasLevel >= 40 ? '#0ea5e9' : gasLevel >= 20 ? '#f59e0b' : '#ef4444',
          pointerEvents: 'none'
        }}
      />

      {/* Main card body with interactive spring tilt */}
      <motion.div 
        className="relative z-10 flex flex-col items-center w-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Header Status Bar */}
        <div className="flex justify-between items-center w-full mb-6" style={{ transform: 'translateZ(20px)' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              {isConnected ? 'IoT System Connected' : 'Telemetry Offline'}
            </span>
          </div>
          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border ${scheme.badge}`}>
            {status}
          </span>
        </div>

        {/* 3D Cylinder Arena */}
        <div className="relative w-48 h-88 flex flex-col items-center justify-end my-4" style={{ transformStyle: 'preserve-3d' }}>
          
          {/* 3D Gas Cylinder Body Frame */}
          <div className="relative w-full h-full flex flex-col items-center justify-end" style={{ transformStyle: 'preserve-3d' }}>
            
            {/* 1. TOP HANDLE LOOP (3D collar structure) */}
            <div className="relative w-28 h-12 -mb-2 z-30" style={{ transform: 'translateZ(15px)', transformStyle: 'preserve-3d' }}>
              {/* Curve handle hoop */}
              <div className="absolute inset-0 border-[6px] border-slate-700 bg-slate-800/80 rounded-t-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] flex justify-between px-6 pt-2">
                {/* Structural Ribs inside handle */}
                <div className="w-1.5 h-full bg-slate-600 rounded-full" />
                <div className="w-1.5 h-full bg-slate-600 rounded-full" />
              </div>
              
              {/* Inner metallic shadows */}
              <div className="absolute inset-x-4 top-2 h-4 bg-gradient-to-b from-black/50 to-transparent rounded-t-full" />
            </div>

            {/* 2. VALVE ASSEMBLY (Stands out in 3D space) */}
            <div className="relative w-10 h-10 -mb-2 z-40 flex flex-col items-center" style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}>
              {/* Brass/metallic valve body */}
              <div className="w-6 h-6 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-700 border border-amber-800 rounded-md shadow-md flex items-center justify-center">
                {/* Rotating knob */}
                <div className="w-10 h-2.5 bg-slate-800 border border-slate-700 rounded-full absolute -top-1.5 shadow-md flex items-center justify-center">
                  <div className="w-6 h-1 bg-slate-600 rounded-full" />
                </div>
                {/* Inner nozzle */}
                <div className="w-3.5 h-3.5 bg-slate-900 border border-amber-800 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                </div>
              </div>
              {/* Connector pipe */}
              <div className="w-3 h-4 bg-gradient-to-r from-slate-600 to-slate-800 border-x border-slate-900" />
            </div>

            {/* 3. COLLAR RING */}
            <div className="w-34 h-6 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 border-x-2 border-slate-700 rounded-t-2xl -mb-1 z-25 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" />

            {/* 4. MAIN CYLINDER BODY (True CSS 3D design) */}
            <div 
              className={`relative w-full h-68 bg-gradient-to-r from-red-700 via-red-600 to-red-800 rounded-[38px] border-[3px] border-red-700/60 overflow-hidden flex flex-col justify-end transition-shadow duration-500 ${scheme.glowClass}`}
              style={{
                transformStyle: 'preserve-3d',
                transform: 'translateZ(10px)'
              }}
            >
              {/* Specular Cylindrical Shading Overlays (Provides round depth) */}
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/55 to-transparent pointer-events-none z-30" />
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/45 to-transparent pointer-events-none z-30" />
              <div className="absolute inset-y-0 left-8 w-6 bg-gradient-to-r from-white/12 to-transparent pointer-events-none z-30" />
              <div className="absolute inset-y-0 right-8 w-6 bg-gradient-to-l from-black/15 to-transparent pointer-events-none z-30" />
              
              {/* 3D Top Dome Overlay */}
              <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/15 via-transparent to-transparent pointer-events-none z-30 rounded-t-[36px]" />
              
              {/* 3D Metal Weld Rings (Curved lines across the face of the cylinder to match 3D perspective) */}
              <svg className="absolute top-[28%] inset-x-0 w-full h-3 opacity-30 z-20 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M 0,2 Q 50,8 100,2" fill="none" stroke="black" strokeWidth="2.5" />
              </svg>
              <svg className="absolute top-[68%] inset-x-0 w-full h-3 opacity-30 z-20 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M 0,2 Q 50,8 100,2" fill="none" stroke="black" strokeWidth="2.5" />
              </svg>

              {/* Gas Brand Logo (Sci-fi overlay style) */}
              <div className="absolute top-8 left-0 right-0 flex flex-col items-center justify-center opacity-20 select-none z-10 pointer-events-none">
                <span className="font-black tracking-widest text-lg text-slate-100">PROPANE-LPG</span>
                <span className="text-[7px] font-extrabold uppercase tracking-widest text-slate-300 mt-0.5">Automated IoT Sensor</span>
              </div>

              {/* SEE-THROUGH GLASS SLIT (FUTURISTIC GAUGE WINDOW) */}
              <div 
                className="absolute inset-y-8 left-[45%] right-[45%] bg-slate-950/70 border border-slate-800/80 rounded-full overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)] z-20"
                style={{ transform: 'translateZ(1px)' }}
              >
                {/* Specular glass reflection */}
                <div className="absolute inset-y-0 left-0 w-0.5 bg-white/15 z-35" />
                
                {/* 3D Floating Liquid Fill */}
                <motion.div 
                  className={`absolute bottom-0 inset-x-0 bg-gradient-to-t ${scheme.gradient} rounded-b-full flex flex-col justify-end`}
                  initial={{ height: 0 }}
                  animate={{ height: `${gasLevel}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  {/* Glowing core */}
                  <div 
                    className="absolute inset-0 blur-[3px] opacity-75"
                    style={{ backgroundColor: scheme.liquidGlow }}
                  />

                  {/* 3D Liquid Top Ellipse (creates perspective of cylinder liquid volume) */}
                  <div 
                    className="absolute top-0 left-0 right-0 -translate-y-1/2 h-2.5 rounded-full z-30"
                    style={{
                      backgroundColor: scheme.liquidTop,
                      boxShadow: `0 0 10px ${scheme.liquidColor}`
                    }}
                  />

                  {/* Boiling / Rising Gas Bubbles */}
                  {isConnected && gasLevel > 5 && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute bottom-0 w-1 h-1 bg-white/70 rounded-full"
                          style={{ left: `${20 + i * 15}%` }}
                          animate={{
                            y: [0, -140],
                            opacity: [0, 0.8, 0],
                            scale: [0.8, 1.4, 0.4]
                          }}
                          transition={{
                            duration: 2.5 + i * 0.4,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Main Glowing level readout text centered in cylinder */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center z-25 pointer-events-none"
                style={{ transform: 'translateZ(25px)' }}
              >
                <div className="text-center bg-slate-900/60 backdrop-blur-md rounded-2xl p-3 border border-slate-700/30 shadow-lg">
                  <span 
                    className="text-5xl font-black block tracking-tighter"
                    style={{
                      color: '#ffffff',
                      textShadow: `0 0 12px ${scheme.liquidColor}`
                    }}
                  >
                    {Math.round(gasLevel)}%
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mt-0.5">Capacity</span>
                </div>
              </div>

            </div>
            
            {/* 5. CYLINDER RING BASE */}
            <div className="w-32 h-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-b-4 border-slate-950 rounded-b-2xl z-20 shadow-lg" />
          </div>

          {/* Interactive Floating Floor Shadow (Changes size and position based on mouse-tilt) */}
          <motion.div 
            className="absolute -bottom-3 w-36 h-5 bg-black/60 rounded-full blur-[6px] -z-10"
            style={{
              x: shadowX,
              y: shadowY,
              scale: isHovered ? 1.05 : 1,
              opacity: isHovered ? 0.8 : 0.6
            }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Weights & Metrics Visual Gauge */}
        <div 
          className="grid grid-cols-2 gap-4 w-full mt-6 bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 shadow-md"
          style={{ transform: 'translateZ(15px)' }}
        >
          <div className="text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Gross Weight</span>
            <span className="text-base font-black text-slate-100 mt-1 block">{weight.toFixed(2)} kg</span>
          </div>
          <div className="text-center border-l border-slate-800/60">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Net Gas Weight</span>
            <span className="text-base font-black text-sky-400 mt-1 block">
              {Math.max(0, weight - 15.0).toFixed(2)} kg
            </span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
