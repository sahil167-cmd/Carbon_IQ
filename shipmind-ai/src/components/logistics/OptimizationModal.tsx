import { useState } from 'react';
import { X, Cpu, AlertCircle, Check, Truck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { OptimizeShipmentRequest } from '../../types/logistics';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOptimize: (request: OptimizeShipmentRequest) => Promise<void>;
  shipmentNumber: string;
  cargoCount: number;
}

interface TruckOption {
  id: string;
  name: string;
  category: string;
  capacityPayload: string;
  capacityVolume: string;
  badge: string;
  badgeColor: string;
  suitableFor: string;
}

const INDIAN_TRUCK_OPTIONS: TruckOption[] = [
  {
    id: 'AUTO_OPTIMAL',
    name: 'Auto-Select Best Indian Fleet Truck',
    category: 'Optimal Selection',
    capacityPayload: 'Auto-allocated to match cargo',
    capacityVolume: 'Minimized empty space',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    suitableFor: 'Evaluates entire fleet to find minimal truck count & lowest emissions',
  },
  {
    id: 'EV_URBAN',
    name: 'Electric 7.5t Urban Carrier',
    category: 'Clean / Low Emission',
    capacityPayload: 'Up to 3,500 kg',
    capacityVolume: '19.8 m³ hold',
    badge: 'Zero Tailpipe Emissions',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    suitableFor: 'Ideal for Mumbai-Pune corridor, urban distribution, and green logistics',
  },
  {
    id: 'LIGHT_TRUCK',
    name: 'Tata 407 Light Commercial (4.5t)',
    category: 'Intra-City Express',
    capacityPayload: 'Up to 2,250 kg',
    capacityVolume: '10.8 m³ hold',
    badge: 'Fast Dispatch',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    suitableFor: 'Best for smaller express cargo, city deliveries, and agile transfers',
  },
  {
    id: 'MEDIUM_TRUCK',
    name: 'Eicher Pro 14t Medium Hauler',
    category: 'Regional Highway',
    capacityPayload: 'Up to 8,500 kg',
    capacityVolume: '36.5 m³ hold',
    badge: 'Balanced Volume',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    suitableFor: 'Recommended for multi-pallet regional freight across highway corridors',
  },
  {
    id: 'HEAVY_TRUCK',
    name: 'Tata Signa 28t Heavy Freight Multi-Axle',
    category: 'Inter-State Heavy',
    capacityPayload: 'Up to 19,000 kg',
    capacityVolume: '58.0 m³ hold',
    badge: 'Bulk Freight',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    suitableFor: 'Heavy machinery, high-volume industrial consignments, and long-haul loads',
  },
];

export default function OptimizationModal({
  isOpen,
  onClose,
  onOptimize,
  shipmentNumber,
  cargoCount,
}: OptimizationModalProps) {
  const [selectedTruckId, setSelectedTruckId] = useState('AUTO_OPTIMAL');
  const [scenarioName, setScenarioName] = useState(`Optimization - ${shipmentNumber}`);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Hidden/advanced defaults
  const [maxExecutionSeconds, setMaxExecutionSeconds] = useState(5);
  const [allowMultiVehicleFallback, setAllowMultiVehicleFallback] = useState(true);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const request: OptimizeShipmentRequest = {
      scenarioName: scenarioName.trim() || `Optimal Fleet - ${shipmentNumber}`,
      options: {
        maxVehiclesToConsider: 8,
        maxCandidateSolutions: 50,
        maxExecutionTimeMs: (Number(maxExecutionSeconds) || 5) * 1000,
        allowMultiVehicleFallback,
      },
      persistOptimizationRun: true,
    };

    setIsOptimizing(true);
    try {
      await onOptimize(request);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Optimization failed. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] text-[#0F6B3A] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Select Fleet & Optimize</h2>
              <p className="text-[12.5px] text-slate-500">
                Consignment <span className="font-semibold text-slate-800">{shipmentNumber}</span> ({cargoCount} cargo items)
              </p>
            </div>
          </div>
          {!isOptimizing && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Loading / Execution State */}
        {isOptimizing ? (
          <div className="py-10 text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#0F6B3A] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#0F6B3A]">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">Computing 3D Load Plan & Route…</h3>
              <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                Evaluating truck payload limits, testing 3D box orientations, and calculating road carbon savings.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-[13px]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Fleet Truck Selection Cards */}
            <div className="space-y-2.5">
              <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                Select Indian Fleet Truck Preference
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {INDIAN_TRUCK_OPTIONS.map((truck) => {
                  const isSelected = selectedTruckId === truck.id;
                  return (
                    <div
                      key={truck.id}
                      onClick={() => setSelectedTruckId(truck.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#0F6B3A] bg-emerald-50/40 ring-2 ring-[#0F6B3A]/10 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-[13.5px]">
                            {truck.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10.5px] font-bold rounded-full border ${truck.badgeColor}`}
                          >
                            {truck.badge}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500">
                          {truck.suitableFor}
                        </p>
                        <div className="text-[11.5px] text-slate-400 font-mono">
                          Payload: {truck.capacityPayload} • Volume: {truck.capacityVolume}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#0F6B3A] border-[#0F6B3A] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scenario Name */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Scenario Label
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Standard Dispatch"
                className="w-full text-[13px] px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
              />
            </div>

            {/* Collapsible Advanced Parameters */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
              >
                <span>Advanced parameters</span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvanced && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Multi-Vehicle Fallback</div>
                      <div className="text-slate-400 text-[11px]">
                        Automatically split across multiple trucks if cargo exceeds one
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowMultiVehicleFallback}
                      onChange={(e) => setAllowMultiVehicleFallback(e.target.checked)}
                      className="w-4 h-4 text-[#0F6B3A] rounded border-slate-300 focus:ring-[#0F6B3A]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Search Timeout (Seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={maxExecutionSeconds}
                      onChange={(e) => setMaxExecutionSeconds(parseInt(e.target.value, 10) || 5)}
                      className="w-24 px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                Run 3D Load Optimization
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
