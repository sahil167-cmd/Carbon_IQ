import { motion } from 'framer-motion';

interface SeaLevelRiseProps {
  seaLevelMeters: number; // e.g. 0.45m
}

export function SeaLevelRise({ seaLevelMeters = 0.45 }: SeaLevelRiseProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3.5 py-1 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-widest rounded-full flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-sm">tsunami</span>
        <span>Eustatic Sea Level Elevation</span>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-950/90 border border-cyan-500/30 p-6 rounded-3xl backdrop-blur-md w-full space-y-4 shadow-2xl"
      >
        <div className="flex justify-between items-baseline border-b border-cyan-500/20 pb-3">
          <span className="text-xs text-slate-300 font-semibold">Predicted Mean Elevation Rise:</span>
          <span className="text-3xl font-extrabold text-cyan-300 font-mono">+{seaLevelMeters.toFixed(2)} meters</span>
        </div>

        {/* Coastal City Inundation Visual */}
        <div className="relative h-28 bg-slate-900 rounded-xl overflow-hidden border border-white/10 flex items-end justify-around px-4 pb-2">
          {/* City Silhouettes */}
          <div className="w-8 h-16 bg-slate-700 rounded-t-sm" />
          <div className="w-12 h-22 bg-slate-600 rounded-t-sm" />
          <div className="w-10 h-18 bg-slate-700 rounded-t-sm" />
          <div className="w-14 h-24 bg-slate-500 rounded-t-sm" />
          <div className="w-9 h-14 bg-slate-700 rounded-t-sm" />

          {/* Animated Water Level Overlay */}
          <motion.div
            initial={{ height: '10%' }}
            animate={{ height: `${Math.min(75, 15 + seaLevelMeters * 22)}%` }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600/80 via-teal-500/60 to-cyan-400/40 backdrop-blur-xs border-t border-cyan-300"
          >
            <div className="w-full text-center text-[10px] font-mono font-bold text-white pt-1">
              Coastal Inundation Zone
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-slate-300 max-w-sm leading-relaxed"
      >
        Thermal expansion and ice sheet mass loss displace coastal communities and inundate low-lying urban infrastructure.
      </motion.p>
    </div>
  );
}
