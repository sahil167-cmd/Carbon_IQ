import { useState } from 'react';
import { X, Sliders, AlertCircle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import LogisticsService from '../../../services/logistics.service';
import type { CreateScenarioRequest, EvaluatedScenarioSummary } from '../../../types/logistics';

interface WhatIfScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (scenario: EvaluatedScenarioSummary) => void;
  shipmentId: string;
  shipmentNumber: string;
  cargoCount: number;
}

export default function WhatIfScenarioModal({
  isOpen,
  onClose,
  onSuccess,
  shipmentId,
  shipmentNumber,
  cargoCount,
}: WhatIfScenarioModalProps) {
  const [scenarioName, setScenarioName] = useState(`What-If: Alternative Allocation (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
  const [maxVehiclesToConsider, setMaxVehiclesToConsider] = useState<number | ''>(4);
  const [maxCandidateSolutions, setMaxCandidateSolutions] = useState<number | ''>(50);
  const [maxExecutionSeconds, setMaxExecutionSeconds] = useState<number | ''>(5);
  const [allowMultiVehicleFallback, setAllowMultiVehicleFallback] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) {
      setError('Scenario name is required.');
      return;
    }
    setError('');

    const payload: CreateScenarioRequest = {
      scenarioName: scenarioName.trim(),
      options: {
        maxVehiclesToConsider: maxVehiclesToConsider !== '' ? Number(maxVehiclesToConsider) : undefined,
        maxCandidateSolutions: maxCandidateSolutions !== '' ? Number(maxCandidateSolutions) : undefined,
        maxExecutionTimeMs: maxExecutionSeconds !== '' ? Number(maxExecutionSeconds) * 1000 : undefined,
        allowMultiVehicleFallback,
      },
    };

    setIsLoading(true);
    try {
      const created = await LogisticsService.createShipmentScenario(shipmentId, payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute what-if scenario optimization.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="whatif-modal-title">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="whatif-modal-title" className="text-lg font-bold text-slate-900">Run What-If Scenario</h2>
              <p className="text-[12.5px] text-slate-500">
                Shipment <span className="font-semibold text-slate-800">{shipmentNumber}</span> ({cargoCount} cargo items)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close what-if scenario modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Scenario Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scenario Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g. Strict 3-Truck Cap / Minimal Fleet"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-colors"
            />
            <p className="text-[11.5px] text-slate-400 mt-1">
              Descriptive label used to identify this scenario in comparison metrics and win-loss summaries.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Supported Bounded What-If Constraints
            </div>

            {/* Max Vehicles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Vehicles Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxVehiclesToConsider}
                  onChange={(e) => setMaxVehiclesToConsider(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Default (8)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">Caps active search fleet size</p>
              </div>

              {/* Max Candidate Solutions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Solutions
                </label>
                <input
                  type="number"
                  min={5}
                  max={250}
                  value={maxCandidateSolutions}
                  onChange={(e) => setMaxCandidateSolutions(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Default (50)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">Evaluations before cutoff</p>
              </div>
            </div>

            {/* Search Timeout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Compute Budget
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={maxExecutionSeconds}
                    onChange={(e) => setMaxExecutionSeconds(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="5"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">sec</span>
                </div>
              </div>

              {/* Multi-vehicle Fallback */}
              <div className="flex flex-col justify-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowMultiVehicleFallback}
                    onChange={(e) => setAllowMultiVehicleFallback(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">Multi-Vehicle Fallback</span>
                </label>
                <p className="text-[10.5px] text-slate-400 mt-1 ml-6">
                  Allows distributing cargo across multiple trucks if single vehicle fails
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Simulating Permutations...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Run & Save Scenario
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
