import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  Scale,
  Maximize2,
  MapPin,
  AlertCircle,
  Plus,
  RefreshCw,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Navigation,
  Truck,
  Calendar,
  Layers,
  Activity,
} from 'lucide-react';
import AppLayout from '../../../components/layout/AppLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import CargoTable from '../../../components/logistics/CargoTable';
import CargoModal from '../../../components/logistics/CargoModal';
import OptimizationModal from '../../../components/logistics/OptimizationModal';
import ShipmentWizardProgress, { type WizardStepId } from '../../../components/logistics/wizard/ShipmentWizardProgress';
import ShipmentWorkflowBar from '../../../components/logistics/workspace/ShipmentWorkflowBar';
import ShipmentCarbonCard from '../../../components/logistics/workspace/ShipmentCarbonCard';
import ChooseIndianTruckSection from '../../../components/logistics/ChooseIndianTruckSection';
import LogisticsService from '../../../services/logistics.service';
import type {
  Shipment,
  CargoItem,
  CreateCargoItemInput,
  ShipmentStatus,
  OptimizeShipmentRequest,
  RouteResult,
  TrafficETAResult,
  LogisticsCarbonImpactResult,
} from '../../../types/logistics';
import { formatDistance, formatDuration } from '../../../utils/geo-transform';
import { formatNum, formatCoord, formatWeight, formatVolume, formatPercent } from '../../../utils/number-utils';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Cargo Modal State
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [editingCargoItem, setEditingCargoItem] = useState<CargoItem | null>(null);

  // Optimization Modal & Truck Selection State
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [showTruckSelector, setShowTruckSelector] = useState(false);

  // Auxiliary Real-Data States (Isolated so one failure does not break the workspace)
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [trafficResult, setTrafficResult] = useState<TrafficETAResult | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState<string | null>(null);

  const [carbonResult, setCarbonResult] = useState<LogisticsCarbonImpactResult | null>(null);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [carbonError, setCarbonError] = useState<string | null>(null);

  const fetchAuxiliaryData = useCallback(async (currentShipment: Shipment) => {
    const hasStops = (currentShipment.stops?.length || 0) >= 2;
    const latestOptId = currentShipment.optimizationRuns?.[0]?.id;

    if (hasStops) {
      // 1. Fetch Authoritative Road Route
      setRouteLoading(true);
      setRouteError(null);
      LogisticsService.getShipmentRoute(currentShipment.id)
        .then((res) => setRouteResult(res))
        .catch((err) => {
          setRouteResult(null);
          setRouteError(err.message || 'Route calculation unavailable');
        })
        .finally(() => setRouteLoading(false));

      // 2. Fetch Traffic / ETA Assessment
      setTrafficLoading(true);
      setTrafficError(null);
      LogisticsService.getShipmentTrafficETA(currentShipment.id)
        .then((res) => setTrafficResult(res))
        .catch((err) => {
          setTrafficResult(null);
          setTrafficError(err.message || 'Traffic data unavailable');
        })
        .finally(() => setTrafficLoading(false));
    } else {
      setRouteResult(null);
      setTrafficResult(null);
      setRouteError(null);
      setTrafficError(null);
    }

    // 3. Fetch Authoritative Carbon Impact via Carbon Engine
    setCarbonLoading(true);
    setCarbonError(null);
    LogisticsService.getShipmentCarbon(currentShipment.id, {
      optimizationRunId: latestOptId,
    })
      .then((res) => setCarbonResult(res))
      .catch((err) => {
        setCarbonResult(null);
        setCarbonError(err.message || 'Carbon calculation unavailable');
      })
      .finally(() => setCarbonLoading(false));
  }, []);

  const fetchShipment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await LogisticsService.getShipment(id);
      setShipment(data);
      fetchAuxiliaryData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  }, [id, fetchAuxiliaryData]);

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  // Handle Cargo Addition or Update
  const handleSaveCargo = async (cargoData: CreateCargoItemInput) => {
    if (!shipment) return;

    if (editingCargoItem) {
      const res = await LogisticsService.updateCargoItem(shipment.id, editingCargoItem.id, cargoData);
      const desc = res?.cargoItem?.description || (res as any)?.description || cargoData.description || 'Item';
      setSuccessBanner(`Updated cargo item: ${desc}`);
    } else {
      const res = await LogisticsService.addCargoItem(shipment.id, cargoData);
      const desc = res?.cargoItem?.description || (res as any)?.description || cargoData.description || 'Item';
      setSuccessBanner(`Added cargo item: ${desc}`);
    }

    await fetchShipment();
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  // Handle Cargo Deletion
  const handleDeleteCargo = async (cargoItem: CargoItem) => {
    if (!shipment) return;
    await LogisticsService.deleteCargoItem(shipment.id, cargoItem.id);
    const desc = cargoItem?.description || 'Item';
    setSuccessBanner(`Removed cargo item: ${desc}`);
    await fetchShipment();
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  // Handle Shipment Status Transition
  const handleStatusChange = async (newStatus: ShipmentStatus) => {
    if (!shipment || shipment.status === newStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await LogisticsService.updateShipment(shipment.id, { status: newStatus });
      setShipment(updated);
      setSuccessBanner(`Shipment status transitioned to ${newStatus}`);
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err: any) {
      alert(`Status update rejected by backend: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle Open Optimize Modal
  const handleOpenOptimize = () => {
    if (!shipment?.cargoItems || shipment.cargoItems.length === 0) {
      setError('Cannot optimize fleet: please add at least one cargo item to the manifest first.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setIsOptimizationModalOpen(true);
  };

  // Handle Execute Optimization
  const handleExecuteOptimization = async (options: OptimizeShipmentRequest) => {
    if (!shipment) return;
    const result = await LogisticsService.optimizeShipment(shipment.id, options);
    setIsOptimizationModalOpen(false);
    if (result.optimizationRunId) {
      navigate(`/app/shipments/${shipment.id}/optimization/${result.optimizationRunId}`);
    } else {
      await fetchShipment();
      setSuccessBanner('Fleet optimization completed successfully.');
      setTimeout(() => setSuccessBanner(''), 4000);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Shipment Details" subtitle="Loading freight manifest...">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (error || !shipment) {
    return (
      <AppLayout title="Shipment Details" subtitle="Freight Consignment">
        <div className="max-w-xl mx-auto px-6 py-16 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Shipment Not Found</h2>
          <p className="text-[13.5px] text-slate-500">{error || 'The requested shipment could not be found.'}</p>
          <div>
            <Link
              to="/app/shipments"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F6B3A] text-white text-[13.5px] font-semibold rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Shipments
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const cargoItems = shipment.cargoItems || [];
  const stops = shipment.stops || [];
  const latestOptRun = shipment.optimizationRuns?.[0] || null;

  // 5-Step guided progress state
  const wizardStep: WizardStepId = latestOptRun
    ? 'results'
    : cargoItems.length > 0
    ? 'truck'
    : 'cargo';
  const completedSteps: WizardStepId[] = [
    'shipment',
    ...(cargoItems.length > 0 ? (['cargo'] as WizardStepId[]) : []),
    ...(latestOptRun ? (['truck', 'optimize', 'results'] as WizardStepId[]) : []),
  ];

  // Origin and destination overview
  const originStop = stops.find((s) => s.stopType === 'PICKUP') || stops[0];
  const destinationStop = stops.slice().reverse().find((s) => s.stopType === 'DROPOFF') || stops[stops.length - 1];

  return (
    <AppLayout
      title={`Shipment #${shipment.shipmentNumber}`}
      subtitle={`Logistics Operations Workspace — ${shipment.status}`}
    >
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* 5-Step Guided Progress Indicator */}
        <ShipmentWizardProgress
          currentStep={wizardStep}
          completedSteps={completedSteps}
          onStepClick={(step) => {
            if (step === 'results' && latestOptRun) {
              navigate(`/app/shipments/${shipment.id}/optimization/${latestOptRun.id}`);
            }
          }}
        />

        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
            <Link to="/app/shipments" className="hover:text-slate-900 transition-colors">
              Logistics
            </Link>
            <span className="text-slate-300">/</span>
            <Link to="/app/shipments" className="hover:text-slate-900 transition-colors">
              Shipments
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{shipment.shipmentNumber}</span>
          </nav>

          <button
            type="button"
            onClick={fetchShipment}
            disabled={loading}
            aria-label="Synchronize consignment from server"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync from Server
          </button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-[13px] font-medium shadow-sm animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Shipment Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {shipment.shipmentNumber}
              </h1>
              <StatusBadge status={shipment.status} />
              {shipment.createdAt && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {new Date(shipment.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
              {shipment.referenceNumber && (
                <span>
                  Reference:{' '}
                  <span className="font-semibold text-slate-800">{shipment.referenceNumber}</span>
                </span>
              )}
              {originStop && destinationStop && (
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span>{originStop.city || originStop.locationName || 'Origin'}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{destinationStop.city || destinationStop.locationName || 'Destination'}</span>
                </span>
              )}
              {shipment.description && (
                <span className="text-slate-600 truncate max-w-sm">• {shipment.description}</span>
              )}
            </div>
          </div>

          {/* Status Changer & Optimization CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="shipment-status-select" className="text-[12px] font-semibold text-slate-500">
                Status:
              </label>
              <select
                id="shipment-status-select"
                disabled={statusUpdating}
                value={shipment.status}
                onChange={(e) => handleStatusChange(e.target.value as ShipmentStatus)}
                className="text-[13px] font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#0F6B3A] disabled:opacity-50"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PLANNED">PLANNED</option>
                <option value="OPTIMIZED">OPTIMIZED</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenOptimize}
              aria-label="Optimize Fleet for this shipment"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              <Cpu className="w-4 h-4 text-white" />
              Optimize Fleet
            </button>
          </div>
        </div>

        {/* Operational Guidance State Bar */}
        <ShipmentWorkflowBar
          shipment={shipment}
          hasRoute={!!routeResult}
          routeResult={routeResult}
        />

        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Total Packages</span>
              <Box className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {cargoItems.reduce((sum, item) => sum + (item.quantity || 1), 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {cargoItems.length} distinct item types
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Total Weight</span>
              <Scale className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatWeight(shipment.totalWeightKg, false, '0 kg')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {shipment.totalWeightKg != null
                ? `${formatWeight(shipment.totalWeightKg, true)} metric tonnes`
                : 'No weight recorded'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Total Volume</span>
              <Maximize2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatVolume(shipment.totalVolumeM3, 2, '0 m³')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Calculated 3D bounding volume</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Route Stops</span>
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stops.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {routeResult
                ? `${formatDistance(routeResult.distanceMeters)} road path`
                : shipment.totalDistanceKm
                ? `${formatNum(shipment.totalDistanceKm, 1)} km estimated`
                : 'OpenRouteService profile'}
            </div>
          </div>
        </div>

        {/* Consignment Stops Sequence Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0F6B3A]" />
              Consignment Route Stops Manifest
            </h2>
            <span className="text-[12px] text-slate-500">
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'} configured
            </span>
          </div>

          {stops.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-[13px] text-slate-500">
              No stops configured yet. Add origin and destination stops to enable road route calculation.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {stops.map((stop, index) => {
                const isPickup = stop.stopType === 'PICKUP';
                const isDelivery = stop.stopType === 'DROPOFF';

                return (
                  <div key={stop.id || index} className="flex items-center gap-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                          isPickup
                            ? 'bg-blue-600 text-white'
                            : isDelivery
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {stop.sequenceOrder}
                      </span>
                      <div>
                        <div className="text-[13px] font-bold text-slate-800">
                          {stop.city || stop.locationName || `Stop #${stop.sequenceOrder}`}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold uppercase tracking-wider">{stop.stopType}</span>
                          {stop.locationName && stop.city && (
                            <span>• {stop.locationName}</span>
                          )}
                          {stop.latitude != null && stop.longitude != null && (
                            <span className="font-mono text-[10px] text-slate-400">
                              ({formatCoord(stop.latitude, 2)}, {formatCoord(stop.longitude, 2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {index < stops.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cargo Freight Manifest Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-[#0F6B3A]" />
                Cargo Freight Manifest
              </h2>
              <p className="text-[13px] text-slate-500">
                Manage packages, boxes, pallets, and physical cargo constraints for 3D load planning.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingCargoItem(null);
                setIsCargoModalOpen(true);
              }}
              aria-label="Add cargo item to manifest"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Cargo Item
            </button>
          </div>

          {cargoItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-[#0F6B3A] rounded-2xl flex items-center justify-center mx-auto">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No cargo has been added</h3>
              <p className="text-[13px] text-slate-500 max-w-md mx-auto">
                Add cargo before optimizing the shipment. You can configure dimensions, weights, stackability, and fragile constraints.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCargoItem(null);
                    setIsCargoModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F6B3A] text-white text-[13px] font-semibold rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Add First Item
                </button>
              </div>
            </div>
          ) : (
            <CargoTable
              items={cargoItems}
              onEdit={(item) => {
                setEditingCargoItem(item);
                setIsCargoModalOpen(true);
              }}
              onDelete={handleDeleteCargo}
              onAddCargoClick={() => {
                setEditingCargoItem(null);
                setIsCargoModalOpen(true);
              }}
            />
          )}
        </div>

        {/* Fleet Optimization & Allocation Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#0F6B3A]" />
                Fleet Optimization & Load Planning
              </h2>
              <p className="text-[13px] text-slate-500">
                Multi-objective solver results, 3D truck packing manifests, and historical runs.
              </p>
            </div>

            {latestOptRun && (
              <Link
                to={`/app/shipments/${shipment.id}/optimization/${latestOptRun.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm"
              >
                <Layers className="w-4 h-4" />
                View 3D Packing & Route Map
              </Link>
            )}
          </div>

          {latestOptRun ? (
            /* Latest Optimization Highlight Card */
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4 bg-gradient-to-br from-white via-emerald-50/20 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-[15px]">
                        {latestOptRun.scenarioName || 'Active Fleet Allocation'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {latestOptRun.status}
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-500">
                      Executed {new Date(latestOptRun.createdAt).toLocaleString()} • Run ID: {latestOptRun.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTruckSelector(!showTruckSelector)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {showTruckSelector ? 'Hide Truck Selector' : 'Change Indian Truck'}
                  </button>

                  <Link
                    to={`/app/shipments/${shipment.id}/optimization/${latestOptRun.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[12.5px] font-semibold rounded-xl transition-colors shrink-0 shadow-xs"
                  >
                    Inspect 3D Load Plan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Vehicles Allocated</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {latestOptRun.optimizedTruckCount}{' '}
                    <span className="text-[12px] text-slate-400 font-normal">
                      (vs {latestOptRun.baselineTruckCount} baseline)
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Payload Util.</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatPercent(latestOptRun.overallWeightUtilizationPct, 1, '—')}
                  </div>
                </div>

                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Volume Util.</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatPercent(latestOptRun.overallVolumeUtilizationPct, 1, '—')}
                  </div>
                </div>

                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Loaded Weight</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatWeight(latestOptRun.totalLoadedWeightKg, true, '—')}
                  </div>
                </div>
              </div>

              {/* Collapsible Truck Selector */}
              {showTruckSelector && (
                <div className="pt-4 border-t border-slate-100">
                  <ChooseIndianTruckSection
                    shipmentId={shipment.id}
                    shipmentNumber={shipment.shipmentNumber}
                    totalCargoWeightKg={shipment.totalWeightKg || 0}
                    totalCargoVolumeM3={shipment.totalVolumeM3 || 0}
                    onOptimizationComplete={(runId) => {
                      setShowTruckSelector(false);
                      navigate(`/app/shipments/${shipment.id}/optimization/${runId}`);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Step 3: Choose Indian Truck & Step 4: Optimize My Load */
            <ChooseIndianTruckSection
              shipmentId={shipment.id}
              shipmentNumber={shipment.shipmentNumber}
              totalCargoWeightKg={shipment.totalWeightKg || 0}
              totalCargoVolumeM3={shipment.totalVolumeM3 || 0}
              onOptimizationComplete={(runId) => {
                navigate(`/app/shipments/${shipment.id}/optimization/${runId}`);
              }}
            />
          )}

          {/* Historical Runs Table */}
          {shipment.optimizationRuns && shipment.optimizationRuns.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Scenario / ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Trucks (Opt / Base)</th>
                      <th className="py-3 px-4">Payload Util.</th>
                      <th className="py-3 px-4">Volume Util.</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {shipment.optimizationRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{run.scenarioName || 'Fleet Allocation'}</div>
                          <div className="text-[11px] font-mono text-slate-400">{run.id.slice(0, 8)}...</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              run.status === 'FEASIBLE' || run.status === 'OPTIMAL'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-bold text-slate-900">{run.optimizedTruckCount}</span> / {run.baselineTruckCount}
                          {run.optimizedTruckCount < run.baselineTruckCount && (
                            <span className="ml-1 text-[11px] text-emerald-600 font-bold">
                              (-{run.baselineTruckCount - run.optimizedTruckCount})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {formatPercent(run.overallWeightUtilizationPct, 1, '—')}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {formatPercent(run.overallVolumeUtilizationPct, 1, '—')}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[12px]">
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/app/shipments/${shipment.id}/optimization/${run.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-semibold rounded-lg transition-colors"
                          >
                            View Result
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Road Route & Traffic / ETA Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#0F6B3A]" />
                Road Routing & Traffic Assessment
              </h2>
              <p className="text-[12.5px] text-slate-500">
                Authoritative road network distance and free-flow duration via OpenRouteService (HGV Highway profile).
              </p>
            </div>

            {latestOptRun && (
              <Link
                to={`/app/shipments/${shipment.id}/optimization/${latestOptRun.id}`}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F6B3A] hover:underline"
              >
                Inspect on Interactive Map
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {routeLoading || trafficLoading ? (
            <div className="py-6 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
              <div className="text-[13px] text-slate-500">Loading road route and traffic assessment...</div>
            </div>
          ) : routeError ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-[13px]">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Route calculation notice: </span>
                {routeError}. Ensure that pickup and delivery stops have valid WGS-84 geographic coordinates.
              </div>
            </div>
          ) : !routeResult ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="text-[14px] font-bold text-slate-900">No route has been calculated yet</div>
              <div className="text-[12.5px] text-slate-500 max-w-sm mx-auto">
                At least 2 consignment stops (origin pickup and final delivery) with valid latitude and longitude coordinates are required to compute physical road paths.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Road Distance</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatDistance(routeResult.distanceMeters)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Physical highway trajectory</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Transit Time</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatDuration(routeResult.durationSeconds)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Legal freight truck speed</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Traffic Status</div>
                  <div className="mt-1">
                    {trafficResult?.status === 'LIVE' ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Activity className="w-3 h-3 text-emerald-600" />
                        Live Traffic
                      </span>
                    ) : trafficResult?.status === 'PREDICTED' ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Predicted Flow
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                        Baseline ETA (Free Flow)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {trafficResult?.isLiveTraffic ? 'Real-time telemetry' : 'Free-flow standard'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Routing Engine</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 truncate">
                    OpenRouteService
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(routeResult.metadata?.query as any)?.profile || 'driving-hgv'}
                  </div>
                </div>
              </div>

              {/* Honest Traffic Disclosure */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-[12px] text-slate-600">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Traffic ETA Disclosure:</strong>{' '}
                  {trafficResult?.isLiveTraffic
                    ? 'Transit duration incorporates real-time telemetry from available traffic feeds.'
                    : 'Duration is an authoritative free-flow baseline computed based on legal road speed limits for heavy goods vehicles without live GPS tracking.'}
                </div>
              </div>
            </div>
          )}

          {trafficError && (
            <div className="text-[11px] text-slate-400 italic">
              Traffic telemetry notice: {trafficError} (falling back to legal road speed limits).
            </div>
          )}
        </div>

        {/* Authoritative Carbon Footprint Section */}
        <ShipmentCarbonCard
          carbonResult={carbonResult}
          loading={carbonLoading}
          error={carbonError}
          onRetry={() => fetchAuxiliaryData(shipment)}
        />
      </div>

      {/* Cargo Add/Edit Modal */}
      <CargoModal
        isOpen={isCargoModalOpen}
        onClose={() => {
          setIsCargoModalOpen(false);
          setEditingCargoItem(null);
        }}
        onSubmit={handleSaveCargo}
        initialData={editingCargoItem}
        shipmentNumber={shipment.shipmentNumber}
      />

      {/* Optimization Modal */}
      <OptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={() => setIsOptimizationModalOpen(false)}
        onOptimize={handleExecuteOptimization}
        shipmentNumber={shipment.shipmentNumber}
        cargoCount={cargoItems.length}
      />
    </AppLayout>
  );
}
