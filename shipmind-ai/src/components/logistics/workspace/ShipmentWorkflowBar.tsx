import { CheckCircle2, Circle, Clock, MapPin, Box, Cpu, Navigation, FileText } from 'lucide-react';
import type { Shipment, RouteResult } from '../../../types/logistics';

export type WorkflowStage =
  | 'DRAFT'
  | 'STOPS_CONFIGURED'
  | 'CARGO_CONFIGURED'
  | 'READY_FOR_OPTIMIZATION'
  | 'OPTIMIZED'
  | 'ROUTE_CALCULATED';

interface ShipmentWorkflowBarProps {
  shipment: Shipment;
  hasRoute?: boolean;
  routeResult?: RouteResult | null;
}

export default function ShipmentWorkflowBar({
  shipment,
  hasRoute = false,
  routeResult = null,
}: ShipmentWorkflowBarProps) {
  const hasStops = (shipment.stops?.length || 0) >= 2;
  const hasCargo = (shipment.cargoItems?.length || 0) > 0;
  const hasOptimization = (shipment.optimizationRuns?.length || 0) > 0;
  const routeCalculated = hasRoute || !!routeResult || (shipment.totalDistanceKm != null && shipment.totalDistanceKm > 0);

  // Compute active stage
  let currentStage: WorkflowStage = 'DRAFT';
  if (routeCalculated && hasOptimization) {
    currentStage = 'ROUTE_CALCULATED';
  } else if (hasOptimization) {
    currentStage = 'OPTIMIZED';
  } else if (hasStops && hasCargo) {
    currentStage = 'READY_FOR_OPTIMIZATION';
  } else if (hasCargo) {
    currentStage = 'CARGO_CONFIGURED';
  } else if (hasStops) {
    currentStage = 'STOPS_CONFIGURED';
  }

  const steps = [
    {
      id: 'DRAFT',
      label: 'Draft Created',
      description: 'Shipment record initialized',
      icon: FileText,
      completed: true, // Always completed if viewing shipment
      active: currentStage === 'DRAFT',
    },
    {
      id: 'STOPS_CONFIGURED',
      label: 'Stops Configured',
      description: `${shipment.stops?.length || 0} stops assigned`,
      icon: MapPin,
      completed: hasStops,
      active: currentStage === 'STOPS_CONFIGURED',
    },
    {
      id: 'CARGO_CONFIGURED',
      label: 'Cargo Consigned',
      description: `${shipment.cargoItems?.length || 0} items on manifest`,
      icon: Box,
      completed: hasCargo,
      active: currentStage === 'CARGO_CONFIGURED',
    },
    {
      id: 'READY_FOR_OPTIMIZATION',
      label: 'Ready to Optimize',
      description: hasStops && hasCargo ? 'Manifest complete' : 'Requires stops & cargo',
      icon: Clock,
      completed: hasStops && hasCargo,
      active: currentStage === 'READY_FOR_OPTIMIZATION',
    },
    {
      id: 'OPTIMIZED',
      label: 'Fleet Optimized',
      description: hasOptimization
        ? `${shipment.optimizationRuns?.length || 1} run(s) executed`
        : 'Awaiting solver run',
      icon: Cpu,
      completed: hasOptimization,
      active: currentStage === 'OPTIMIZED',
    },
    {
      id: 'ROUTE_CALCULATED',
      label: 'Route Calculated',
      description: routeCalculated ? 'Road trajectory ready' : 'Requires coordinates',
      icon: Navigation,
      completed: routeCalculated,
      active: currentStage === 'ROUTE_CALCULATED',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0F6B3A]" />
            Consignment Operational Progression
          </h2>
          <p className="text-[12px] text-slate-500">
            Real readiness milestones determined by actual consignment configuration and solver runs.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Readiness:</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {steps.filter((s) => s.completed).length} / {steps.length} Milestones
          </span>
        </div>
      </div>

      {/* Progress Stepper Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                step.completed
                  ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                  : step.active
                  ? 'bg-amber-50/60 border-amber-200 text-amber-950 ring-1 ring-amber-300'
                  : 'bg-slate-50/70 border-slate-200/70 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                    step.completed
                      ? 'bg-emerald-600 text-white'
                      : step.active
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {idx + 1}
                </div>

                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </div>

              <div className="flex items-center gap-1 text-[12.5px] font-bold text-slate-900 leading-tight">
                <StepIcon className={`w-3.5 h-3.5 shrink-0 ${step.completed ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span className="truncate">{step.label}</span>
              </div>

              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {step.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
