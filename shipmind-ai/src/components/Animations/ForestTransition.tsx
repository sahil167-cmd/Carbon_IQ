import { motion } from 'framer-motion';

interface ForestTransitionProps {
  damageLevel: number; // 0 to 1
}

export function ForestTransition({ damageLevel = 0.5 }: ForestTransitionProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-5 max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3.5 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest rounded-full"
      >
        Vegetation & Canopy Degradation
      </motion.div>

      {/* 3-State Stage Indicator Cards */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {/* Stage 1: Healthy */}
        <motion.div
          animate={{
            scale: damageLevel < 0.35 ? 1.05 : 0.95,
            opacity: damageLevel < 0.35 ? 1 : 0.4,
          }}
          className="bg-emerald-950/80 border border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <span className="material-symbols-outlined text-3xl text-emerald-400">park</span>
          <span className="text-xs font-bold text-emerald-200">Healthy Canopy</span>
          <span className="text-[10px] text-emerald-400/80">Active Carbon Sink</span>
        </motion.div>

        {/* Stage 2: Dry */}
        <motion.div
          animate={{
            scale: damageLevel >= 0.35 && damageLevel < 0.7 ? 1.05 : 0.95,
            opacity: damageLevel >= 0.35 && damageLevel < 0.7 ? 1 : 0.4,
          }}
          className="bg-amber-950/80 border border-amber-500/30 p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <span className="material-symbols-outlined text-3xl text-amber-400">eco</span>
          <span className="text-xs font-bold text-amber-200">Dry Woodland</span>
          <span className="text-[10px] text-amber-400/80">Severe Moisture Deficit</span>
        </motion.div>

        {/* Stage 3: Burned */}
        <motion.div
          animate={{
            scale: damageLevel >= 0.7 ? 1.05 : 0.95,
            opacity: damageLevel >= 0.7 ? 1 : 0.4,
          }}
          className="bg-red-950/80 border border-red-500/30 p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <span className="material-symbols-outlined text-3xl text-red-500">local_fire_department</span>
          <span className="text-xs font-bold text-red-200">Burned Forest</span>
          <span className="text-[10px] text-red-400/80">Net Carbon Emitter</span>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-slate-300 max-w-md leading-relaxed font-sans"
      >
        Elevated thermal stress degrades primary forest biomes, turning natural carbon sinks into net carbon sources.
      </motion.p>
    </div>
  );
}
