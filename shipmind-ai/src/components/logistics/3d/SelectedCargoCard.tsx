import { Box, Layers, Scale, Move, Compass, X } from 'lucide-react';
import type { TransformedBox3D } from '../../../utils/coordinate-transform';

interface SelectedCargoCardProps {
  selectedBox: TransformedBox3D | null;
  assignedVehicleName: string;
  onClearSelection?: () => void;
}

export default function SelectedCargoCard({
  selectedBox,
  assignedVehicleName,
  onClearSelection,
}: SelectedCargoCardProps) {
  if (!selectedBox) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-400 flex flex-col items-center justify-center text-center min-h-[220px]">
        <Box className="w-8 h-8 text-slate-600 mb-2" />
        <div className="text-[13.5px] font-bold text-slate-300">No Cargo Item Selected</div>
        <p className="text-[12px] text-slate-500 max-w-xs mt-1">
          Click any 3D box inside the truck or select an item from the manifest below to inspect coordinates, dimensions, and orientation.
        </p>
      </div>
    );
  }

  const { raw, lengthM, widthM, heightM, weightKg, orientation, instanceId, description, loadingSequence } = selectedBox;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[12px]">
            #{loadingSequence}
          </div>
          <div>
            <div className="text-[14px] font-bold text-white leading-tight">
              {description || instanceId}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Instance: {instanceId}
            </div>
          </div>
        </div>

        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid of Key Attributes */}
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        {/* Dimensions */}
        <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Oriented Dimensions
          </div>
          <div className="font-mono font-bold text-white">
            {raw.lengthMm} × {raw.widthMm} × {raw.heightMm} mm
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {lengthM.toFixed(2)} × {widthM.toFixed(2)} × {heightM.toFixed(2)} m
          </div>
        </div>

        {/* Weight */}
        <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Scale className="w-3.5 h-3.5 text-slate-500" />
            Item Weight
          </div>
          <div className="font-mono font-bold text-emerald-400">
            {weightKg.toFixed(1)} kg
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {(raw.weightGrams).toLocaleString()} grams
          </div>
        </div>

        {/* Spatial Coordinates */}
        <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Move className="w-3.5 h-3.5 text-slate-500" />
            Lower-Corner Origin
          </div>
          <div className="font-mono font-bold text-white">
            X:{raw.xMm} Y:{raw.yMm} Z:{raw.zMm} mm
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Elevated {(raw.zMm / 1000).toFixed(2)}m off bed
          </div>
        </div>

        {/* Orientation & Vehicle */}
        <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            Orientation
          </div>
          <div className="font-mono text-emerald-300 truncate text-[11px]">
            {orientation}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {assignedVehicleName}
          </div>
        </div>
      </div>
    </div>
  );
}
