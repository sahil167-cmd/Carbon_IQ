import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TemperatureGaugeProps {
  targetTempRise: number; // e.g. 0.05
}

export function TemperatureGauge({ targetTempRise = 0.05 }: TemperatureGaugeProps) {
  const [currentTemp, setCurrentTemp] = useState(0);

  useEffect(() => {
    const duration = 2500; // ms
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const val = Number((progress * targetTempRise).toFixed(3));
      setCurrentTemp(val);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    const animId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animId);
  }, [targetTempRise]);

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-400 text-xs font-extrabold uppercase tracking-widest"
      >
        <span className="material-symbols-outlined text-sm animate-pulse">thermostat</span>
        <span>Atmospheric Thermal Forcing</span>
      </motion.div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="relative"
      >
        {/* Heat wave distortion ring */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-orange-500/20 via-red-500/30 to-amber-500/20 blur-xl animate-pulse" />

        <div className="relative bg-slate-950/90 border border-orange-500/30 p-8 rounded-3xl backdrop-blur-md shadow-2xl space-y-2">
          <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-orange-400 to-red-500 font-mono tracking-tighter">
            +{currentTemp.toFixed(2)}°C
          </div>

          <p className="text-xs font-semibold text-orange-300/80 uppercase tracking-widest">
            Global Average Temperature Increment
          </p>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="text-xs text-slate-300 max-w-sm leading-relaxed"
      >
        Cumulative atmospheric heat trapping increases oceanic kinetic energy, fueling extreme meteorological events.
      </motion.p>
    </div>
  );
}
