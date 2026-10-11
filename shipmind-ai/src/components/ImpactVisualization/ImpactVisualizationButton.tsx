import { motion } from 'framer-motion';

interface ImpactVisualizationButtonProps {
  co2eKg: number;
  onClick: () => void;
}

export function ImpactVisualizationButton({ co2eKg, onClick }: ImpactVisualizationButtonProps) {
  const formattedKg = (co2eKg || 0).toLocaleString();

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group overflow-hidden rounded-2xl p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
      aria-label="Visualize Environmental Impact in 3D"
    >
      {/* Animated Glowing Border Gradient */}
      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-2xl animate-gradient-x opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Outer Glow Effect */}
      <span className="absolute -inset-1 rounded-2xl bg-emerald-500/30 blur-md group-hover:bg-emerald-400/50 transition-all duration-500" />

      {/* Floating Glass Inner Container */}
      <div className="relative flex items-center gap-3 px-6 py-3.5 rounded-[15px] bg-slate-950/85 backdrop-blur-xl border border-emerald-500/30 text-white font-bold text-xs shadow-2xl transition-all duration-300">
        
        {/* Pulsing Earth Icon */}
        <div className="relative flex items-center justify-center">
          <span className="absolute -inset-1 rounded-full bg-emerald-400/40 animate-ping opacity-75" />
          <span className="material-symbols-outlined text-emerald-400 text-lg relative z-10">public</span>
        </div>

        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-white group-hover:text-emerald-300 transition-colors">
            <span>✨ Visualize Environmental Impact</span>
          </div>
          <span className="text-[10px] text-emerald-300/80 font-mono">
            Interactive 3D Simulation • {formattedKg} kg CO₂e
          </span>
        </div>

        {/* Hover Arrow Indicator */}
        <span className="material-symbols-outlined text-emerald-400 text-base ml-2 transform group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </div>
    </motion.button>
  );
}
