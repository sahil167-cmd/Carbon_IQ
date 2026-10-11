import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useImpactEquivalents } from '../../hooks/useImpactEquivalents';

interface RelatableEquivalentsProps {
  co2eKg: number;
}

export function RelatableEquivalents({ co2eKg }: RelatableEquivalentsProps) {
  const equivalents = useImpactEquivalents(co2eKg);

  const [counterProgress, setCounterProgress] = useState(0);

  useEffect(() => {
    const duration = 2200;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      setCounterProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [co2eKg]);

  const currKm = Math.round(equivalents.drivingKm * counterProgress).toLocaleString();
  const currTrees = (equivalents.treesCutDownYears * counterProgress).toFixed(1);
  const currHomes = (equivalents.homesElectricityYears * counterProgress).toFixed(2);
  const currFlights = (equivalents.flightsNYtoLondon * counterProgress).toFixed(1);
  const currDiesel = Math.round(equivalents.litersDieselBurned * counterProgress).toLocaleString();

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 max-w-4xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-1.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold uppercase tracking-widest rounded-full shadow-lg"
      >
        Real-World Environmental Equivalents
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl md:text-3xl font-extrabold text-white tracking-tight"
      >
        Your emissions of <span className="text-emerald-400 font-mono">{co2eKg.toLocaleString()} kg CO₂e</span> equal approximately:
      </motion.h2>

      {/* 5 Real-World Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
        {/* 🚗 Driving */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-950/90 border border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center justify-between space-y-2 shadow-xl backdrop-blur-md"
        >
          <span className="text-2xl">🚗</span>
          <div className="text-2xl font-extrabold text-white font-mono">{currKm}</div>
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Kilometers Driven</span>
          <span className="text-[9px] text-slate-400">Avg Passenger Vehicle</span>
        </motion.div>

        {/* 🌳 Mature Trees */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-950/90 border border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center justify-between space-y-2 shadow-xl backdrop-blur-md"
        >
          <span className="text-2xl">🌳</span>
          <div className="text-2xl font-extrabold text-white font-mono">{currTrees}</div>
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Mature Trees</span>
          <span className="text-[9px] text-slate-400">Absorbing for 1 Full Year</span>
        </motion.div>

        {/* ⚡ Homes Electricity */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-slate-950/90 border border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center justify-between space-y-2 shadow-xl backdrop-blur-md"
        >
          <span className="text-2xl">⚡</span>
          <div className="text-2xl font-extrabold text-white font-mono">{currHomes}</div>
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Homes' Electricity</span>
          <span className="text-[9px] text-slate-400">Annual Energy Demand</span>
        </motion.div>

        {/* ✈ Flights */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-slate-950/90 border border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center justify-between space-y-2 shadow-xl backdrop-blur-md"
        >
          <span className="text-2xl">✈</span>
          <div className="text-2xl font-extrabold text-white font-mono">{currFlights}</div>
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Flights</span>
          <span className="text-[9px] text-slate-400">NY ↔ London Passenger</span>
        </motion.div>

        {/* 🛢 Fuel Burned */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-slate-950/90 border border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center justify-between space-y-2 shadow-xl backdrop-blur-md"
        >
          <span className="text-2xl">🛢</span>
          <div className="text-2xl font-extrabold text-white font-mono">{currDiesel}</div>
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Liters of Fuel</span>
          <span className="text-[9px] text-slate-400">Ultra-Low Sulfur Diesel</span>
        </motion.div>
      </div>
    </div>
  );
}
