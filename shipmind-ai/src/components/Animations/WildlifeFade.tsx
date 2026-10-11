import { motion } from 'framer-motion';

export function WildlifeFade() {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3.5 py-1 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-widest rounded-full"
      >
        Biodiversity & Habitat Disruption
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* Avian Loss */}
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0.35, scale: 0.95 }}
          transition={{ duration: 2.2 }}
          className="bg-slate-900/80 border border-rose-500/20 p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <span className="material-symbols-outlined text-4xl text-rose-400">flutter_dash</span>
          <span className="text-xs font-bold text-slate-200">Avian Populations</span>
          <span className="text-[10px] text-rose-400">Migratory Route Shift</span>
        </motion.div>

        {/* Coral Bleaching */}
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0.3, scale: 0.95 }}
          transition={{ duration: 2.5, delay: 0.2 }}
          className="bg-slate-900/80 border border-rose-500/20 p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <span className="material-symbols-outlined text-4xl text-teal-300">water_drop</span>
          <span className="text-xs font-bold text-slate-200">Coral Reef Ecosystems</span>
          <span className="text-[10px] text-teal-400">Thermal Bleaching Event</span>
        </motion.div>

        {/* Marine Life Disruption */}
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0.25, scale: 0.95 }}
          transition={{ duration: 2.8, delay: 0.4 }}
          className="bg-slate-900/80 border border-rose-500/20 p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <span className="material-symbols-outlined text-4xl text-sky-400">set_meal</span>
          <span className="text-xs font-bold text-slate-200">Marine Species</span>
          <span className="text-[10px] text-sky-400">Ocean Acidification</span>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-slate-300 max-w-md leading-relaxed"
      >
        Ocean warming and habitat fragmentation accelerate extinction risks across vulnerable flora and fauna.
      </motion.p>
    </div>
  );
}
