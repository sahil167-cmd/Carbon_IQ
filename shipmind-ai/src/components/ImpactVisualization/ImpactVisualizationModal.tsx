import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SceneOrchestrator } from './SceneOrchestrator';
import { useSceneTimeline, type SceneId } from '../../hooks/useSceneTimeline';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RelatableEquivalents } from '../Animations/RelatableEquivalents';

interface ImpactVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  co2eKg: number;
}

export function ImpactVisualizationModal({ isOpen, onClose, co2eKg }: ImpactVisualizationModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const timeline = useSceneTimeline(true);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        timeline.togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, timeline]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl text-white overflow-hidden select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Environmental Impact Visualization 3D Simulation"
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-slate-950/90 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="material-symbols-outlined text-xl">public</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">CarbonIQ Environmental Simulation</h3>
              <p className="text-[10px] text-emerald-300/80 font-mono">
                Cinematic Storytelling • Scene {timeline.currentScene} of 10
              </p>
            </div>
          </div>

          {/* Interactive Scenario Switcher */}
          <div className="hidden md:flex items-center p-1 bg-slate-900/90 border border-white/10 rounded-2xl text-xs">
            <button
              onClick={() => timeline.setScenarioMode('CURRENT')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeline.scenarioMode === 'CURRENT'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Current Footprint
            </button>

            <button
              onClick={() => timeline.setScenarioMode('REDUCED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeline.scenarioMode === 'REDUCED'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Reduced (-30%)
            </button>

            <button
              onClick={() => timeline.setScenarioMode('NET_ZERO')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeline.scenarioMode === 'NET_ZERO'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Net Zero (0 kg)
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Close modal (Escape)"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Reduced Motion Accessibility Fallback vs 3D Scene */}
        {prefersReducedMotion ? (
          <div className="relative z-10 max-w-4xl mx-auto p-6 text-center space-y-6">
            <h2 className="text-3xl font-extrabold text-white">Environmental Impact Summary</h2>
            <RelatableEquivalents co2eKg={co2eKg} />
          </div>
        ) : (
          <SceneOrchestrator
            co2eKg={co2eKg}
            currentScene={timeline.currentScene}
            scenarioMode={timeline.scenarioMode}
          />
        )}

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-3 px-6 py-5 bg-gradient-to-t from-slate-950/90 to-transparent">
          
          {/* Progress Timeline Bar */}
          <div className="w-full max-w-3xl h-1.5 bg-white/10 rounded-full overflow-hidden flex cursor-pointer">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full transition-all duration-100"
              style={{ width: `${timeline.progress * 100}%` }}
            />
          </div>

          {/* Control Buttons Bar */}
          <div className="flex items-center justify-between w-full max-w-3xl">
            {/* Play/Pause & Replay */}
            <div className="flex items-center gap-2">
              <button
                onClick={timeline.togglePlayPause}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-lg active:scale-95"
                aria-label={timeline.isPlaying ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
              >
                <span className="material-symbols-outlined text-xl">
                  {timeline.isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <button
                onClick={timeline.replay}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Replay simulation"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>

              {/* Speed Switcher */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs font-mono">
                {[1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => timeline.setSpeed(s)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      timeline.speed === s ? 'bg-white/20 font-bold text-emerald-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Selector Jump Chips */}
            <div className="hidden lg:flex items-center gap-1">
              {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as SceneId[]).map((num) => (
                <button
                  key={num}
                  onClick={() => timeline.jumpToScene(num)}
                  className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                    timeline.currentScene === num
                      ? 'bg-emerald-500 text-slate-950 font-extrabold scale-110'
                      : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
                  }`}
                  aria-label={`Jump to scene ${num}`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400 font-mono">
              ESC to Exit • Space to Pause
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
