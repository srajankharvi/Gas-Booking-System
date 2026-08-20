import { Cpu, Wifi, Cloud, Monitor, ArrowRight, Scale, CircuitBoard } from 'lucide-react';

interface IoTSystemStatusProps {
  isOnline: boolean;
  isEstimated: boolean;
  lastSeen: string;
}

interface PipelineNode {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  status: 'online' | 'offline' | 'estimated';
}

/**
 * Horizontal pipeline visualization showing the complete IoT data flow:
 * Load Cell → HX711 → ESP32 → Wi-Fi → Cloud → Dashboard
 *
 * Each node shows a live connection indicator.
 */
export default function IoTSystemStatus({ isOnline, isEstimated, lastSeen }: IoTSystemStatusProps) {
  const getNodeStatus = (stage: 'sensor' | 'amplifier' | 'mcu' | 'wifi' | 'cloud' | 'dashboard'): 'online' | 'offline' | 'estimated' => {
    if (isOnline) return 'online';
    if (isEstimated) {
      // When estimated, sensor → wifi are offline, cloud → dashboard still work
      if (['sensor', 'amplifier', 'mcu', 'wifi'].includes(stage)) return 'offline';
      return 'estimated';
    }
    return 'offline';
  };

  const nodes: PipelineNode[] = [
    { icon: Scale, label: 'Load Cell', sublabel: '40 kg', status: getNodeStatus('sensor') },
    { icon: CircuitBoard, label: 'HX711', sublabel: 'Amplifier', status: getNodeStatus('amplifier') },
    { icon: Cpu, label: 'ESP32', sublabel: 'Controller', status: getNodeStatus('mcu') },
    { icon: Wifi, label: 'Wi-Fi', sublabel: 'Network', status: getNodeStatus('wifi') },
    { icon: Cloud, label: 'Cloud', sublabel: 'Server', status: getNodeStatus('cloud') },
    { icon: Monitor, label: 'Dashboard', sublabel: 'Website', status: getNodeStatus('dashboard') },
  ];

  const statusDotColor = (s: PipelineNode['status']) => {
    switch (s) {
      case 'online': return 'bg-emerald-500';
      case 'estimated': return 'bg-amber-500';
      case 'offline': return 'bg-rose-500';
    }
  };

  const statusBorderColor = (s: PipelineNode['status']) => {
    switch (s) {
      case 'online': return 'border-emerald-500/20';
      case 'estimated': return 'border-amber-500/20';
      case 'offline': return 'border-rose-500/20';
    }
  };

  const statusIconColor = (s: PipelineNode['status']) => {
    switch (s) {
      case 'online': return 'text-emerald-400';
      case 'estimated': return 'text-amber-400';
      case 'offline': return 'text-rose-400';
    }
  };

  const arrowColor = (fromStatus: PipelineNode['status'], toStatus: PipelineNode['status']) => {
    if (fromStatus === 'online' && toStatus === 'online') return 'text-emerald-500/40';
    if (fromStatus === 'offline' || toStatus === 'offline') return 'text-slate-700';
    return 'text-amber-500/40';
  };

  const formatLastSeen = (ls: string) => {
    if (!ls || ls === 'Just now') return 'Just now';
    try {
      const diff = Date.now() - new Date(ls).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ago`;
    } catch {
      return ls;
    }
  };

  return (
    <div className="bg-slate-850 border border-slate-800 rounded-3xl p-5 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="font-bold text-sm text-slate-100">IoT System Architecture</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Real-time data pipeline from physical sensor to web dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full border ${
            isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            isEstimated ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
            'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : isEstimated ? 'bg-amber-500' : 'bg-rose-500'}`} />
            {isOnline ? 'All Systems Online' : isEstimated ? 'Estimating' : 'Device Offline'}
          </span>
          <span className="text-[9px] text-slate-600 font-semibold">
            Last sync: {formatLastSeen(lastSeen)}
          </span>
        </div>
      </div>

      {/* Pipeline */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {nodes.map((node, idx) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="flex items-center gap-1 shrink-0">
              {/* Node */}
              <div className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border bg-slate-900/60 min-w-[72px] ${statusBorderColor(node.status)}`}>
                <div className="relative">
                  <Icon size={18} className={statusIconColor(node.status)} />
                  <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${statusDotColor(node.status)} ${node.status === 'online' ? 'animate-pulse' : ''}`} />
                </div>
                <span className="text-[10px] font-bold text-slate-200 leading-none">{node.label}</span>
                <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider leading-none">{node.sublabel}</span>
              </div>

              {/* Arrow between nodes */}
              {idx < nodes.length - 1 && (
                <ArrowRight size={14} className={`shrink-0 ${arrowColor(node.status, nodes[idx + 1].status)}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Offline explanation */}
      {!isOnline && isEstimated && (
        <div className="mt-4 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <p className="text-[10px] text-amber-400 font-semibold">
            ESP32 is temporarily offline. Gas level is being estimated from previous usage and consumption history. Value will be corrected once the device reconnects.
          </p>
        </div>
      )}

      {!isOnline && !isEstimated && (
        <div className="mt-4 px-4 py-3 bg-rose-500/5 border border-rose-500/15 rounded-xl">
          <p className="text-[10px] text-rose-400 font-semibold">
            Connection lost. No recent sensor data available. Check your ESP32 device and Wi-Fi connection.
          </p>
        </div>
      )}
    </div>
  );
}
