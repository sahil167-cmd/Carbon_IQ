import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

export type SceneId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SceneTimelineState {
  currentScene: SceneId;
  progress: number; // 0 to 1
  isPlaying: boolean;
  speed: number; // 1, 1.5, 2
  scenarioMode: 'CURRENT' | 'REDUCED' | 'NET_ZERO';
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  replay: () => void;
  setSpeed: (speed: number) => void;
  setScenarioMode: (mode: 'CURRENT' | 'REDUCED' | 'NET_ZERO') => void;
  jumpToScene: (scene: SceneId) => void;
}

const SCENE_DURATIONS = [
  4, // Scene 1: Pristine Earth
  4, // Scene 2: Emission Statement
  4, // Scene 3: CO2 Particle Invasion
  4, // Scene 4: Temperature Rise
  4, // Scene 5: Ice Caps Melting
  4, // Scene 6: Forest Disappearance
  4, // Scene 7: Sea Level Rise
  4, // Scene 8: Wildlife Fading
  6, // Scene 9: Relatable Equivalents
  6, // Scene 10: Hope & Recovery
];

const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0); // 44s total

export function useSceneTimeline(autoPlay = true): SceneTimelineState {
  const [currentScene, setCurrentScene] = useState<SceneId>(1);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeedState] = useState(1);
  const [scenarioMode, setScenarioMode] = useState<'CURRENT' | 'REDUCED' | 'NET_ZERO'>('CURRENT');

  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Build GSAP master timeline
    const tl = gsap.timeline({
      paused: !autoPlay,
      onUpdate: () => {
        const prog = tl.progress();
        setProgress(prog);

        // Determine current scene index
        const currentTime = prog * TOTAL_DURATION;
        let accumulated = 0;
        let foundScene: SceneId = 1;

        for (let i = 0; i < SCENE_DURATIONS.length; i++) {
          accumulated += SCENE_DURATIONS[i];
          if (currentTime <= accumulated) {
            foundScene = (i + 1) as SceneId;
            break;
          }
        }
        setCurrentScene(foundScene);
      },
      onComplete: () => {
        setIsPlaying(false);
      },
    });

    // Add dummy tween to span TOTAL_DURATION
    tl.to({}, { duration: TOTAL_DURATION, ease: 'none' });
    timelineRef.current = tl;

    return () => {
      tl.kill();
    };
  }, []);

  const play = useCallback(() => {
    if (timelineRef.current) {
      if (timelineRef.current.progress() >= 1) {
        timelineRef.current.restart();
      } else {
        timelineRef.current.play();
      }
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const replay = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.restart();
      setIsPlaying(true);
    }
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    if (timelineRef.current) {
      timelineRef.current.timeScale(newSpeed);
    }
  }, []);

  const jumpToScene = useCallback((scene: SceneId) => {
    if (!timelineRef.current) return;
    let accumulated = 0;
    for (let i = 0; i < scene - 1; i++) {
      accumulated += SCENE_DURATIONS[i];
    }
    const targetProgress = accumulated / TOTAL_DURATION;
    timelineRef.current.progress(targetProgress);
    setCurrentScene(scene);
  }, []);

  return {
    currentScene,
    progress,
    isPlaying,
    speed,
    scenarioMode,
    play,
    pause,
    togglePlayPause,
    replay,
    setSpeed,
    setScenarioMode,
    jumpToScene,
  };
}
