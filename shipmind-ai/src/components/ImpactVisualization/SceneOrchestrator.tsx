import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';

import { ProceduralEarth } from '../Earth/ProceduralEarth';
import { StarField } from '../Particles/StarField';
import { CO2ParticleSystem } from '../Particles/CO2ParticleSystem';

import { TypographyReveal } from '../Animations/TypographyReveal';
import { TemperatureGauge } from '../Animations/TemperatureGauge';
import { ForestTransition } from '../Animations/ForestTransition';
import { SeaLevelRise } from '../Animations/SeaLevelRise';
import { WildlifeFade } from '../Animations/WildlifeFade';
import { RelatableEquivalents } from '../Animations/RelatableEquivalents';
import { HopeScene } from '../Animations/HopeScene';

import type { SceneId } from '../../hooks/useSceneTimeline';
import { scaleImpact } from '../../utils/impactScaler';

interface SceneOrchestratorProps {
  co2eKg: number;
  currentScene: SceneId;
  scenarioMode: 'CURRENT' | 'REDUCED' | 'NET_ZERO';
}

export function SceneOrchestrator({ co2eKg, currentScene, scenarioMode }: SceneOrchestratorProps) {
  // Adjust effective CO2e based on selected interactive scenario mode
  const effectiveKg = useMemo(() => {
    if (scenarioMode === 'NET_ZERO') return 0;
    if (scenarioMode === 'REDUCED') return Math.round(co2eKg * 0.7);
    return co2eKg;
  }, [co2eKg, scenarioMode]);

  // Scaled visual parameters
  const impact = useMemo(() => scaleImpact(effectiveKg), [effectiveKg]);

  // Scene-dependent visual state calculation
  const showCO2Particles = currentScene >= 3 && currentScene <= 8 && effectiveKg > 0;
  const redTint = (currentScene >= 3 && currentScene <= 8) ? impact.redTintIntensity : (currentScene === 10 ? 0 : 0.1);
  const forestDamage = (currentScene >= 6 && currentScene <= 8) ? impact.forestDamageLevel : (currentScene === 10 ? 0.05 : 0);
  const iceMelt = (currentScene >= 5 && currentScene <= 8) ? impact.iceMeltRatio : (currentScene === 10 ? 0.05 : 0);

  return (
    <div className="relative w-full h-full min-h-[550px] flex items-center justify-center overflow-hidden">
      {/* 3D WebGL Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 6.2], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 3, 5]} intensity={1.2} />
          <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#38bdf8" />

          <Suspense fallback={null}>
            <StarField />

            {/* 3D Procedural Earth */}
            <ProceduralEarth
              radius={2.0}
              redTintIntensity={redTint}
              forestDamageLevel={forestDamage}
              iceMeltRatio={iceMelt}
              rotationSpeed={currentScene === 1 ? 0.15 : 0.08}
            />

            {/* CO2 Particle Flow System */}
            <CO2ParticleSystem
              count={impact.particleCount}
              speed={impact.particleSpeed}
              active={showCO2Particles}
            />

            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={3.5}
              maxDistance={12}
              rotateSpeed={0.6}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* HTML / Framer Motion Overlay Layer */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 pointer-events-none">
        <AnimatePresence mode="wait">
          {currentScene === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-2 pointer-events-auto bg-slate-950/70 p-6 rounded-3xl backdrop-blur-md border border-white/10"
            >
              <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-widest px-3 py-1 bg-cyan-950/80 rounded-full border border-cyan-500/30">
                Pristine Environmental Baseline
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Earth's Atmospheric Equilibrium
              </h2>
            </motion.div>
          )}

          {currentScene === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.8 }}
              className="pointer-events-auto"
            >
              <TypographyReveal co2eKg={effectiveKg} />
            </motion.div>
          )}

          {currentScene === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-2 pointer-events-auto bg-slate-950/80 p-6 rounded-3xl backdrop-blur-md border border-orange-500/30 max-w-xl"
            >
              <span className="text-xs font-extrabold text-orange-400 uppercase tracking-widest px-3.5 py-1 bg-orange-950/90 rounded-full border border-orange-500/40">
                Atmospheric Particle Influx
              </span>
              <h2 className="text-3xl font-black text-white">
                {impact.particleCount.toLocaleString()} CO₂ Particles Converge
              </h2>
              <p className="text-xs text-slate-300">
                Emitted greenhouse gas molecules accumulate within the troposphere, thickening the heat-trapping blanket.
              </p>
            </motion.div>
          )}

          {currentScene === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pointer-events-auto"
            >
              <TemperatureGauge targetTempRise={impact.temperatureRise} />
            </motion.div>
          )}

          {currentScene === 5 && (
            <motion.div
              key="scene-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-2 pointer-events-auto bg-slate-950/80 p-6 rounded-3xl backdrop-blur-md border border-sky-500/30 max-w-xl"
            >
              <span className="text-xs font-extrabold text-sky-400 uppercase tracking-widest px-3.5 py-1 bg-sky-950/90 rounded-full border border-sky-500/40">
                Cryosphere Degradation
              </span>
              <h2 className="text-3xl font-black text-white">
                Polar Ice Sheet Mass Loss
              </h2>
              <p className="text-xs text-slate-300">
                Accelerated thermal absorption melts glacial reserves, reducing planetary albedo.
              </p>
            </motion.div>
          )}

          {currentScene === 6 && (
            <motion.div
              key="scene-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pointer-events-auto"
            >
              <ForestTransition damageLevel={impact.forestDamageLevel} />
            </motion.div>
          )}

          {currentScene === 7 && (
            <motion.div
              key="scene-7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pointer-events-auto"
            >
              <SeaLevelRise seaLevelMeters={impact.seaLevelRiseMeters} />
            </motion.div>
          )}

          {currentScene === 8 && (
            <motion.div
              key="scene-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pointer-events-auto"
            >
              <WildlifeFade />
            </motion.div>
          )}

          {currentScene === 9 && (
            <motion.div
              key="scene-9"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pointer-events-auto"
            >
              <RelatableEquivalents co2eKg={effectiveKg} />
            </motion.div>
          )}

          {currentScene === 10 && (
            <motion.div
              key="scene-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pointer-events-auto"
            >
              <HopeScene co2eKg={co2eKg} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
