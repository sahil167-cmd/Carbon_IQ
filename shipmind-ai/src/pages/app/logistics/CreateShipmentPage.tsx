import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import AppLayout from '../../../components/layout/AppLayout';
import StopListEditor from '../../../components/logistics/StopListEditor';
import SimplifiedCargoEditor, {
  type SimplifiedCargoLine,
  createDefaultCargoLine,
  mapSimplifiedCargoToBackend,
} from '../../../components/logistics/SimplifiedCargoEditor';
import ShipmentWizardProgress, {
  type WizardStepId,
} from '../../../components/logistics/wizard/ShipmentWizardProgress';
import LogisticsService from '../../../services/logistics.service';
import type { CreateShipmentInput, ShipmentStop, Shipment } from '../../../types/logistics';

export default function CreateShipmentPage() {
  const navigate = useNavigate();

  // Wizard state: Step 1 = 'shipment', Step 2 = 'cargo'
  const [currentStep, setCurrentStep] = useState<WizardStepId>('shipment');
  const [createdShipment, setCreatedShipment] = useState<Shipment | null>(null);

  // ── Step 1: Shipment & Route State ─────────────────────────────────────────
  const [referenceNumber, setReferenceNumber] = useState('');
  const [customerPo, setCustomerPo] = useState('');
  const [description, setDescription] = useState('');
  const [plannedPickupDate, setPlannedPickupDate] = useState('');
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState('');

  // Stops: start empty — user must search and confirm their own locations
  const [stops, setStops] = useState<ShipmentStop[]>([
    {
      sequenceOrder: 1,
      stopType: 'PICKUP',
      country: 'India',
    },
    {
      sequenceOrder: 2,
      stopType: 'DROPOFF',
      country: 'India',
    },
  ]);

  // ── Step 2: Cargo Manifest State ──────────────────────────────────────────
  const [cargoItems, setCargoItems] = useState<SimplifiedCargoLine[]>([
    createDefaultCargoLine(1),
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  // ── Chronological Date Validation ─────────────────────────────────────────
  const handlePickupDateChange = (val: string) => {
    setPlannedPickupDate(val);
    if (plannedDeliveryDate && val) {
      if (new Date(plannedDeliveryDate) < new Date(val)) {
        setDateError('Delivery date must be after pickup date.');
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  };

  const handleDeliveryDateChange = (val: string) => {
    setPlannedDeliveryDate(val);
    if (plannedPickupDate && val) {
      if (new Date(val) < new Date(plannedPickupDate)) {
        setDateError('Delivery date must be after pickup date.');
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  };

  // ── Step 1 Submit: Create Shipment & Advance to Cargo ──────────────────────
  const handleShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Date chronological check
    if (plannedPickupDate && plannedDeliveryDate) {
      if (new Date(plannedDeliveryDate) < new Date(plannedPickupDate)) {
        setError('Delivery date must be after pickup date.');
        return;
      }
    }

    // 2. Route stops validation
    if (stops.length < 2) {
      setError('A shipment requires at least 2 stops: Origin Pickup and Destination Delivery.');
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s.city && !s.locationName && !s.addressLine1) {
        setError(`Stop #${i + 1} requires a valid Location, City, or Address.`);
        return;
      }
    }

    const payload: CreateShipmentInput = {
      shipmentNumber: referenceNumber.trim() || undefined,
      referenceNumber: customerPo.trim() || undefined,
      description: description.trim() || undefined,
      plannedPickupDate: plannedPickupDate ? new Date(plannedPickupDate).toISOString() : undefined,
      plannedDeliveryDate: plannedDeliveryDate ? new Date(plannedDeliveryDate).toISOString() : undefined,
      stops: stops.map((s, idx) => {
        const fallbackAddress = s.addressLine1?.trim() || s.locationName?.trim() || s.city?.trim() || `Stop ${idx + 1}`;
        return {
          stopSequence: idx + 1,
          stopType: s.stopType,
          facilityName: s.locationName?.trim() || s.facilityName?.trim() || undefined,
          addressLine1: fallbackAddress,
          city: s.city?.trim() || undefined,
          state: s.state?.trim() || undefined,
          country: s.country || 'India',
          latitude: typeof s.latitude === 'number' && !isNaN(s.latitude) ? s.latitude : undefined,
          longitude: typeof s.longitude === 'number' && !isNaN(s.longitude) ? s.longitude : undefined,
        };
      }),
    };

    setSubmitting(true);
    try {
      const created = await LogisticsService.createShipment(payload);
      setCreatedShipment(created);
      // Advance to Step 2: Cargo
      setCurrentStep('cargo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to create shipment. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2 Submit: Save Cargo & Proceed to Operations Dashboard ───────────
  const handleCargoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdShipment) return;
    setError('');

    if (cargoItems.length === 0) {
      setError('Please add at least one cargo item to the manifest.');
      return;
    }

    for (let i = 0; i < cargoItems.length; i++) {
      const item = cargoItems[i];
      if (!item.name || !item.name.trim()) {
        setError(`Cargo item #${i + 1} requires a name.`);
        return;
      }
      if (item.lengthCm <= 0 || item.widthCm <= 0 || item.heightCm <= 0) {
        setError(`Cargo item #${i + 1} dimensions must be greater than zero.`);
        return;
      }
      if (item.weightKg <= 0) {
        setError(`Cargo item #${i + 1} weight must be greater than zero.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Save all cargo lines to the shipment in the database
      for (const line of cargoItems) {
        const payload = mapSimplifiedCargoToBackend(line);
        await LogisticsService.addCargoItem(createdShipment.id, payload);
      }
      // Navigate directly to the shipment operational workspace to select Indian truck & optimize
      navigate(`/app/shipments/${createdShipment.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save cargo manifest. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Logistics Operations"
      subtitle="Create Shipment & Cargo Manifest"
    >
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            to="/app/shipments"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shipments
          </Link>
        </div>

        {/* 5-Step Visible Progress Indicator */}
        <ShipmentWizardProgress
          currentStep={currentStep}
          completedSteps={createdShipment ? ['shipment'] : []}
        />

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold">Please Check Your Inputs</p>
              <p className="text-[13px] text-rose-600">{error}</p>
            </div>
          </div>
        )}

        {/* ── STEP 1: Shipment & Route ─────────────────────────────────────── */}
        {currentStep === 'shipment' && (
          <form onSubmit={handleShipmentSubmit} className="space-y-6">
            {/* Card: Shipment Details */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Step 1: Shipment Information
                  </h2>
                  <p className="text-[12.5px] text-slate-500">
                    Provide basic freight references and scheduling dates.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F6B3A] flex items-center justify-center font-bold">
                  1
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Shipment Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Auto-generated if empty (e.g. SHP-...)"
                    className="w-full text-[13.5px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Internal consignment tracking code.
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Customer / PO Reference
                  </label>
                  <input
                    type="text"
                    value={customerPo}
                    onChange={(e) => setCustomerPo(e.target.value)}
                    placeholder="e.g. PO-2026-IND-0824"
                    className="w-full text-[13.5px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sales order or customer purchase order reference.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Description / Freight Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Regional distribution of packaged electronics & retail goods"
                    className="w-full text-[13.5px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Pickup Date
                  </label>
                  <input
                    type="datetime-local"
                    value={plannedPickupDate}
                    onChange={(e) => handlePickupDateChange(e.target.value)}
                    className="w-full text-[13.5px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="datetime-local"
                    min={plannedPickupDate || undefined}
                    value={plannedDeliveryDate}
                    onChange={(e) => handleDeliveryDateChange(e.target.value)}
                    className="w-full text-[13.5px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
                  />
                  {dateError && (
                    <p className="text-[11.5px] text-rose-600 font-medium mt-1">
                      {dateError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Card: Friendly Location & Route Stops */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <StopListEditor stops={stops} onChange={setStops} />
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to="/app/shipments"
                className="px-5 py-2.5 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || Boolean(dateError)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
              >
                <span>{submitting ? 'Saving Shipment...' : 'Save & Continue to Cargo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: Cargo Manifest ───────────────────────────────────────── */}
        {currentStep === 'cargo' && (
          <form onSubmit={handleCargoSubmit} className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Step 2: Add Cargo Items
                  </h2>
                  <p className="text-[12.5px] text-slate-500">
                    Specify package dimensions (cm) and weights (kg). CarbonIQ calculates exact volume and vehicle suitability.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F6B3A] flex items-center justify-center font-bold">
                  2
                </div>
              </div>

              {/* Simplified Cargo Editor */}
              <SimplifiedCargoEditor
                items={cargoItems}
                onChange={setCargoItems}
              />
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('shipment')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Shipment Details
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
              >
                <span>{submitting ? 'Saving Manifest...' : 'Save Cargo & Proceed to Fleet'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
