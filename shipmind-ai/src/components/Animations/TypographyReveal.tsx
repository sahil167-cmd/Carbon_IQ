import { motion } from 'framer-motion';

interface TypographyRevealProps {
  co2eKg: number;
}

export function TypographyReveal({ co2eKg }: TypographyRevealProps) {
  const formattedKg = (co2eKg || 0).toLocaleString();
  const formattedTonnes = ((co2eKg || 0) / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-3xl mx-auto">
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-xs font-extrabold tracking-[0.25em] text-emerald-400 uppercase bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-lg"
      >
        Carbon Accounting Engine Output
      </motion.span>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-2"
      >
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-200 tracking-tight leading-none drop-shadow-2xl">
          {formattedKg} <span className="text-emerald-400">kg CO₂e</span>
        </h1>

        <p className="text-lg md:text-xl font-medium text-emerald-200/80 tracking-wide font-mono">
          Equivalent to <span className="text-white font-bold">{formattedTonnes} Metric Tonnes</span> of GHG emissions
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="text-xs text-slate-400 max-w-lg leading-relaxed font-sans"
      >
        This activity record triggers deterministic greenhouse gas forcing. Watch how this mass of carbon alters Earth's atmospheric balance.
      </motion.p>
    </div>
  );
}
