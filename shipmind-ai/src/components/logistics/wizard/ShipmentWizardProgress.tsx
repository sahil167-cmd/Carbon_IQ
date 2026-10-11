import React from 'react';
import { Check, FileText, Package, Truck, Cpu, BarChart3 } from 'lucide-react';

export type WizardStepId = 'shipment' | 'cargo' | 'truck' | 'optimize' | 'results';

interface StepDefinition {
  id: WizardStepId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDefinition[] = [
  { id: 'shipment', label: '1. Shipment', sublabel: 'Details & Route', icon: FileText },
  { id: 'cargo', label: '2. Cargo', sublabel: 'Packaging SKUs', icon: Package },
  { id: 'truck', label: '3. Truck', sublabel: 'Indian Fleet', icon: Truck },
  { id: 'optimize', label: '4. Optimize', sublabel: '3D Placement', icon: Cpu },
  { id: 'results', label: '5. Results', sublabel: 'Carbon & Map', icon: BarChart3 },
];

interface ShipmentWizardProgressProps {
  currentStep: WizardStepId;
  completedSteps?: WizardStepId[];
  onStepClick?: (step: WizardStepId) => void;
  className?: string;
}

export default function ShipmentWizardProgress({
  currentStep,
  completedSteps = [],
  onStepClick,
  className = '',
}: ShipmentWizardProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className={`w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting Progress Line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 -z-0">
          <div
            className="h-full bg-[#0F6B3A] transition-all duration-300"
            style={{
              width: `${(Math.max(0, currentIndex) / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id) || idx < currentIndex;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center relative z-10 transition-all ${
                onStepClick && isCompleted ? 'cursor-pointer hover:opacity-90' : ''
              }`}
              onClick={() => {
                if (onStepClick && (isCompleted || isCurrent)) {
                  onStepClick(step.id);
                }
              }}
            >
              {/* Step Circle Indicator */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-[#0F6B3A] text-white border-2 border-[#0F6B3A]'
                    : isCurrent
                    ? 'bg-emerald-50 text-[#0F6B3A] border-2 border-[#0F6B3A] ring-4 ring-emerald-50'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
              </div>

              {/* Step Labels */}
              <div className="text-center mt-2">
                <div
                  className={`text-[12.5px] font-bold tracking-tight ${
                    isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  {step.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
