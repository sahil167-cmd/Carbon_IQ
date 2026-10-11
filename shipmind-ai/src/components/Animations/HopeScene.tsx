import { motion } from 'framer-motion';

interface HopeSceneProps {
  co2eKg: number;
}

export function HopeScene({ co2eKg }: HopeSceneProps) {
  const reducedKg = Math.round(co2eKg * 0.7); // 30% reduction -> 70% remaining
  const savedKg = Math.round(co2eKg * 0.3);

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold uppercase tracking-widest rounded-full shadow-lg flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-base">eco</span>
        <span>Decarbonization Potential</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="space-y-3"
      >
        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-300 to-white tracking-tight">
          Reducing emissions by 30% could prevent this impact.
        </h2>

        <p className="text-sm md:text-base font-semibold text-emerald-200/90 font-mono">
          Save <span className="text-emerald-400 font-bold">{savedKg.toLocaleString()} kg CO₂e</span> per billing cycle
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-950/80 border border-emerald-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-around gap-4 w-full shadow-2xl backdrop-blur-md"
      >
        <div className="text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Current Footprint</span>
          <span className="text-xl font-extrabold text-white font-mono">{co2eKg.toLocaleString()} kg</span>
        </div>

        <div className="text-emerald-400 text-2xl font-bold">➔</div>

        <div className="text-center">
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Target 30% Reduced</span>
          <span className="text-xl font-extrabold text-emerald-300 font-mono">{reducedKg.toLocaleString()} kg</span>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs text-slate-300 max-w-md leading-relaxed font-sans"
      >
        Optimizing logistics routes, acquiring renewable energy contracts, and enhancing equipment efficiency stabilizes ecosystem resilience.
      </motion.p>
    </div>
  );
}
