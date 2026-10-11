import { Scale, Maximize2, Eye } from 'lucide-react';
import type { VehicleCargoAssignment } from '../../types/logistics';

interface VehicleUtilizationCardProps {
  assignment: VehicleCargoAssignment;
  onView3D?: () => void;
}

export default function VehicleUtilizationCard({ assignment, onView3D }: VehicleUtilizationCardProps) {
  const { vehicle, vehicleSequence, assignedInstances, packingResult } = assignment;

  // Weight accounting
  const loadedWeightKg = assignment.assignedCargoWeightGrams / 1000;
  const maxPayloadKg = assignment.payloadCapacityGrams / 1000;
  const payloadPct = Math.min(100, Math.max(0, assignment.payloadUtilizationPct));
  const unusedWeightKg = Math.max(0, assignment.unusedPayloadGrams / 1000);

  // Volume accounting
  const loadedVolumeM3 = assignment.assignedCargoVolumeMm3 / 1e9;
  const totalVolumeM3 = assignment.cargoSpaceVolumeMm3 / 1e9;
  const volumePct = Math.min(100, Math.max(0, assignment.volumeUtilizationPct));
  const unusedVolumeM3 = Math.max(0, assignment.unusedVolumeMm3 / 1e9);

  // Group cargo by description / cargoId
  const cargoGroupMap = new Map<string, { description: string; count: number; weightKg: number }>();
  for (const inst of assignedInstances) {
    const key = inst.description || inst.cargoId;
    const existing = cargoGroupMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.weightKg += inst.weightGrams / 1000;
    } else {
      cargoGroupMap.set(key, {
        description: inst.description || 'Cargo Item',
        count: 1,
        weightKg: inst.weightGrams / 1000,
      });
    }
  }
  const cargoGroups = Array.from(cargoGroupMap.values());

  // Utility color for utilization bars
  const getBarColor = (pct: number) => {
    if (pct > 95) return 'bg-amber-500';
    if (pct >= 70) return 'bg-[#0F6B3A]';
    return 'bg-blue-600';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
      {/* Vehicle Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-[14px] shrink-0">
            #{vehicleSequence}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {vehicle.name || vehicle.registrationNumber || `Truck ${vehicleSequence}`}
            </h3>
            <p className="text-[12px] text-slate-500">
              {vehicle.registrationNumber ? `Reg: ${vehicle.registrationNumber}` : 'Standard Fleet Template'}{' '}
              {vehicle.lengthMm ? `• ${(vehicle.lengthMm / 1000).toFixed(1)}m × ${(vehicle.widthMm / 1000).toFixed(1)}m × ${(vehicle.heightMm / 1000).toFixed(1)}m` : ''}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {packingResult.placedCount} Placed
          </span>
        </div>
      </div>

      {/* Utilization Bars */}
      <div className="space-y-3">
        {/* Payload Utilization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              Payload Capacity
            </span>
            <span className="font-bold text-slate-900">{payloadPct.toFixed(1)}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(payloadPct)}`}
              style={{ width: `${payloadPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>
              {loadedWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg /{' '}
              {maxPayloadKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
            </span>
            <span>{unusedWeightKg.toFixed(1)} kg headroom</span>
          </div>
        </div>

        {/* Volume Utilization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              Cubic Volume Capacity
            </span>
            <span className="font-bold text-slate-900">{volumePct.toFixed(1)}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(volumePct)}`}
              style={{ width: `${volumePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>
              {loadedVolumeM3.toFixed(2)} m³ / {totalVolumeM3.toFixed(2)} m³
            </span>
            <span>{unusedVolumeM3.toFixed(2)} m³ headroom</span>
          </div>
        </div>
      </div>

      {/* Assigned Cargo Items Summary */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>Assigned Cargo Manifest</span>
          <span className="font-bold text-slate-800">{assignedInstances.length} packages</span>
        </div>

        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
          {cargoGroups.map((group, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-[12.5px] p-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <div className="font-medium text-slate-800 truncate max-w-[200px]">
                {group.description}
              </div>
              <div className="flex items-center gap-3 text-slate-600 shrink-0 font-mono text-[11.5px]">
                <span className="font-bold text-slate-900">×{group.count}</span>
                <span>{Number(group.weightKg || 0).toFixed(1)} kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View 3D Load Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onView3D}
          disabled={!onView3D}
          className={`w-full py-2 px-3 text-[12.5px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-none ${
            onView3D
              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer active:scale-[0.98]'
              : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          View 3D Load Plan
        </button>
      </div>
    </div>
  );
}
