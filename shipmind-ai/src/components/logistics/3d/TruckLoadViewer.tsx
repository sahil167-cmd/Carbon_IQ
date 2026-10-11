import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  RotateCcw,
  Eye,
  Maximize2,
  AlertCircle,
  Package,
  Truck,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { LoadPlanItem } from '../../../types/logistics';
import {
  extractTruckDimensions,
  extractPlacements,
  transformPlacementTo3D,
  calculateCameraFit,
  type TransformedBox3D,
} from '../../../utils/coordinate-transform';
import RealisticTruckModel3D from './RealisticTruckModel3D';
import CargoBox3D from './CargoBox3D';

interface TruckLoadViewerProps {
  loadPlan: LoadPlanItem;
  selectedInstanceId: string | null;
  onSelectCargo: (instanceId: string) => void;
}

export default function TruckLoadViewer({
  loadPlan,
  selectedInstanceId,
  onSelectCargo,
}: TruckLoadViewerProps) {
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(null);
  const [isRealisticTruck, setIsRealisticTruck] = useState(true);
  const controlsRef = useRef<any>(null);

  // Extract truck dimensions
  const truck = useMemo(() => extractTruckDimensions(loadPlan), [loadPlan]);

  // Extract and transform cargo placements
  const { transformedBoxes, invalidPlacementCount } = useMemo(() => {
    const rawPlacements = extractPlacements(loadPlan);
    let invalidCount = 0;
    const boxes: TransformedBox3D[] = [];

    for (const p of rawPlacements) {
      const transformed = transformPlacementTo3D(p, truck || undefined);
      if (transformed) {
        boxes.push(transformed);
      } else {
        invalidCount++;
      }
    }

    return { transformedBoxes: boxes, invalidPlacementCount: invalidCount };
  }, [loadPlan, truck]);

  // Box Placement Animation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);
  const [animationStep, setAnimationStep] = useState<number>(transformedBoxes.length);

  // Sync animation step when load plan changes
  useEffect(() => {
    setAnimationStep(transformedBoxes.length);
    setIsPlaying(false);
  }, [loadPlan.id, transformedBoxes.length]);

  // Automatic sequential placement timer
  useEffect(() => {
    if (!isPlaying) return;
    if (animationStep >= transformedBoxes.length) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = Math.max(35, Math.floor(400 / playbackSpeed));
    const timer = setInterval(() => {
      setAnimationStep((prev) => {
        if (prev >= transformedBoxes.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, animationStep, transformedBoxes.length, playbackSpeed]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (animationStep >= transformedBoxes.length) {
        setAnimationStep(1); // restart from 1
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setAnimationStep(0);
  };

  const handleShowAll = () => {
    setIsPlaying(false);
    setAnimationStep(transformedBoxes.length);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setAnimationStep((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setAnimationStep((prev) => Math.min(transformedBoxes.length, prev + 1));
  };

  // Only boxes up to animationStep are visible
  const visibleBoxes = useMemo(() => {
    return transformedBoxes.slice(0, animationStep);
  }, [transformedBoxes, animationStep]);

  // Initial camera perspective fit
  const cameraConfig = useMemo(() => {
    if (!truck) {
      return { position: [6, -6, 5] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
    }
    return calculateCameraFit(truck);
  }, [truck]);

  // Camera presets
  const handleResetCamera = () => {
    if (!controlsRef.current || !truck) return;
    controlsRef.current.reset();
    const fit = calculateCameraFit(truck);
    controlsRef.current.object.position.set(...fit.position);
    controlsRef.current.target.set(0, 0, truck.heightM / 2);
    controlsRef.current.update();
  };

  const handleSetView = (view: 'TOP' | 'SIDE' | 'REAR' | 'PERSPECTIVE') => {
    if (!controlsRef.current || !truck) return;
    const dist = Math.max(truck.lengthM, truck.widthM, truck.heightM) * 2;
    const midZ = truck.heightM / 2;

    switch (view) {
      case 'TOP':
        // Looking down along +Z
        controlsRef.current.object.position.set(0, 0.001, dist * 1.3);
        controlsRef.current.target.set(0, 0, midZ);
        break;
      case 'SIDE':
        // Looking laterally along -Y (seeing length and height)
        controlsRef.current.object.position.set(0, -dist * 1.2, midZ);
        controlsRef.current.target.set(0, 0, midZ);
        break;
      case 'REAR':
        // Looking from door (+X) towards bulkhead (-X)
        controlsRef.current.object.position.set(dist * 1.2, 0, midZ);
        controlsRef.current.target.set(0, 0, midZ);
        break;
      case 'PERSPECTIVE':
      default:
        handleResetCamera();
        return;
    }
    controlsRef.current.update();
  };

  if (!truck) {
    return (
      <div className="w-full h-[520px] bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
        <h4 className="text-[15px] font-bold text-white mb-1">
          Vehicle Specification Unavailable
        </h4>
        <p className="text-[12.5px] text-slate-400 max-w-md">
          Internal dimensions (length, width, height) could not be resolved for Vehicle #{loadPlan.vehicleSequence}. The 3D container cannot be constructed without authentic physical dimensions.
        </p>
      </div>
    );
  }

  // Centering offset: offset group so truck center sits at scene origin (0, 0, 0)
  const offsetX = -truck.lengthM / 2;
  const offsetY = -truck.widthM / 2;
  const offsetZ = 0; // Bed sits at Z = 0

  return (
    <div className="relative w-full h-[540px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Vehicle Dimensions & Specs */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 shadow-lg text-white text-[12px] pointer-events-auto">
          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" />
            {truck.name}
          </div>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-300">
            {Number(truck.lengthM || 0).toFixed(2)}m × {Number(truck.widthM || 0).toFixed(2)}m × {Number(truck.heightM || 0).toFixed(2)}m
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-300">
            Max: {truck.maxPayloadKg.toLocaleString()} kg
          </span>
        </div>

        {/* Right: Camera Presets & Real Truck Toggle */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsRealisticTruck(!isRealisticTruck)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-semibold rounded-lg transition-all cursor-pointer ${
              isRealisticTruck
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Realistic 3D Commercial Truck Body vs Wireframe X-Ray"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{isRealisticTruck ? 'Realistic Truck' : 'X-Ray Hold'}</span>
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => handleSetView('PERSPECTIVE')}
            className="px-2.5 py-1 text-[11.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Perspective View"
          >
            Iso
          </button>
          <button
            type="button"
            onClick={() => handleSetView('TOP')}
            className="px-2.5 py-1 text-[11.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Top / Plan View"
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => handleSetView('SIDE')}
            className="px-2.5 py-1 text-[11.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Side View"
          >
            Side
          </button>
          <button
            type="button"
            onClick={() => handleSetView('REAR')}
            className="px-2.5 py-1 text-[11.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Loading Doors View"
          >
            Rear
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 3D Box Loading Sequence Animation Toolbar ── */}
      <div className="absolute top-16 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
        {/* Playback action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayToggle}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
            }`}
            title={isPlaying ? 'Pause placement' : 'Animate box placement into truck'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : animationStep >= transformedBoxes.length ? 'Replay Loading' : 'Play Loading'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Empty truck"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleStepBack}
            disabled={animationStep <= 0}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            title="Step back 1 package"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleStepForward}
            disabled={animationStep >= transformedBoxes.length}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            title="Step forward 1 package"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleShowAll}
            className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Place all packages"
          >
            All Packed
          </button>
        </div>

        {/* Step scrubbing slider & sequence badge */}
        <div className="flex-1 min-w-[140px] max-w-xs flex items-center gap-2.5">
          <input
            type="range"
            min={0}
            max={transformedBoxes.length}
            value={animationStep}
            onChange={(e) => {
              setIsPlaying(false);
              setAnimationStep(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            title={`Loading sequence step: ${animationStep} of ${transformedBoxes.length}`}
          />
          <span className="text-[11.5px] font-mono text-emerald-400 whitespace-nowrap">
            {animationStep}/{transformedBoxes.length}
          </span>
        </div>

        {/* Speed multiplier */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-[11px]">
          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                playbackSpeed === spd
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Floating Stats / Badges */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg text-[12px] text-white pointer-events-auto">
          <Package className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <strong className="text-emerald-400 font-mono">{visibleBoxes.length}</strong> / {transformedBoxes.length} packages packed
          </span>
        </div>

        {invalidPlacementCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-800/80 shadow-lg text-[11.5px] text-amber-300 pointer-events-auto">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{invalidPlacementCount} malformed placement(s) excluded</span>
          </div>
        )}
      </div>

      {/* Interactive 3D Canvas */}
      <Canvas
        camera={{
          position: cameraConfig.position,
          up: [0, 0, 1], // Strict requirement: +Z is vertical height
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        onPointerDown={(e) => {
          // If clicked background, clear selection
          if (e.target === e.currentTarget) {
            // Background click
          }
        }}
      >
        <Suspense fallback={null}>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            target={[0, 0, truck.heightM / 2]}
            minDistance={1.5}
            maxDistance={50}
            enableDamping
            dampingFactor={0.08}
          />

          {/* Lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[12, -12, 18]}
            intensity={1.2}
            castShadow
          />
          <directionalLight
            position={[-12, 12, 8]}
            intensity={0.4}
          />

          {/* Centered Vehicle & Cargo Group */}
          <group position={[offsetX, offsetY, offsetZ]}>
            {/* Realistic Commercial Truck / X-Ray Wireframe Body */}
            <RealisticTruckModel3D truck={truck} isRealisticMode={isRealisticTruck} />

            {/* Real Placed Cargo Instances (Sequentially Animated) */}
            {visibleBoxes.map((box, idx) => (
              <CargoBox3D
                key={box.instanceId}
                box={box}
                isSelected={box.instanceId === selectedInstanceId}
                isHovered={box.instanceId === hoveredInstanceId}
                isJustPlaced={idx === animationStep - 1 && isPlaying}
                onSelect={onSelectCargo}
                onHover={setHoveredInstanceId}
              />
            ))}
          </group>
        </Suspense>
      </Canvas>

      {/* Orbit Helper Tip */}
      <div className="absolute bottom-4 right-4 z-10 text-[11px] text-slate-500 bg-slate-950/70 backdrop-blur-sm px-2.5 py-1 rounded-lg pointer-events-none flex items-center gap-1.5">
        <Eye className="w-3 h-3 text-slate-400" />
        Left-click to rotate • Right-click to pan • Scroll to zoom
      </div>
    </div>
  );
}
