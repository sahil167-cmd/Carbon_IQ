import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Cpu,
  Truck,
  Scale,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Box,
  MapPin,
  HelpCircle,
  RefreshCw,
  BoxSelect,
  Navigation,
  Info,
  Sliders,
  Leaf,
} from 'lucide-react';
import AppLayout from '../../../components/layout/AppLayout';
import LogisticsService from '../../../services/logistics.service';
import type {
  PersistedOptimizationRun,
  Shipment,
  RouteResult,
  TrafficETAResult,
  LogisticsCarbonImpactResult,
} from '../../../types/logistics';
import TruckLoadViewer from '../../../components/logistics/3d/TruckLoadViewer';
import SelectedCargoCard from '../../../components/logistics/3d/SelectedCargoCard';
import CargoManifestLegend from '../../../components/logistics/3d/CargoManifestLegend';
import UnplacedCargoSection from '../../../components/logistics/3d/UnplacedCargoSection';
import RouteMap from '../../../components/logistics/map/RouteMap';
import { formatPercent, formatVolume, formatWeight, formatNum } from '../../../utils/number-utils';
import RouteInfoPanel from '../../../components/logistics/map/RouteInfoPanel';
import ShipmentCarbonCard from '../../../components/logistics/workspace/ShipmentCarbonCard';
import {
  extractTruckDimensions,
  extractPlacements,
  transformPlacementTo3D,
  type TransformedBox3D,
} from '../../../utils/coordinate-transform';

export default function OptimizationResultPage() {
  const { shipmentId, optimizationId } = useParams<{ shipmentId: string; optimizationId: string }>();

  const [run, setRun] = useState<PersistedOptimizationRun | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Route & Geospatial State
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [trafficETA, setTrafficETA] = useState<TrafficETAResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const routeSectionRef = useRef<HTMLDivElement>(null);

  // Carbon Impact State (Carbon Engine as Single Source of Truth)
  const [carbonResult, setCarbonResult] = useState<LogisticsCarbonImpactResult | null>(null);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [carbonError, setCarbonError] = useState<string | null>(null);

  const fetchCarbonData = useCallback(async (targetShipmentId: string, optId: string, distKm?: number) => {
    setCarbonLoading(true);
    setCarbonError(null);
    try {
      const res = await LogisticsService.getShipmentCarbon(targetShipmentId, {
        optimizationRunId: optId,
        distanceKm: distKm,
      });
      setCarbonResult(res);
    } catch (err: any) {
      setCarbonResult(null);
      setCarbonError(err.message || 'Carbon calculation unavailable');
    } finally {
      setCarbonLoading(false);
    }
  }, []);

  const fetchRouteData = useCallback(async (targetShipmentId: string, optId?: string) => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const [routeRes, trafficRes] = await Promise.all([
        LogisticsService.getShipmentRoute(targetShipmentId).catch(() => null),
        LogisticsService.getShipmentTrafficETA(targetShipmentId).catch(() => null),
      ]);
      setRoute(routeRes);
      setTrafficETA(trafficRes);
      if (!routeRes && !trafficRes) {
        setRouteError('No route could be calculated for this shipment. Please verify shipment stops and coordinates.');
      } else if (routeRes?.distanceMeters && optId) {
        fetchCarbonData(targetShipmentId, optId, routeRes.distanceMeters / 1000);
      }
    } catch (err: any) {
      setRouteError(err.message || 'Failed to calculate shipment route');
    } finally {
      setRouteLoading(false);
    }
  }, [fetchCarbonData]);

  const fetchData = useCallback(async () => {
    if (!optimizationId) return;
    setLoading(true);
    setError('');
    try {
      const [runData, shipmentData] = await Promise.all([
        LogisticsService.getOptimizationResult(optimizationId),
        shipmentId ? LogisticsService.getShipment(shipmentId) : Promise.resolve(null),
      ]);
      setRun(runData);
      setShipment(shipmentData);

      if (shipmentId) {
        fetchRouteData(shipmentId, optimizationId);
        const initialDist = shipmentData?.totalDistanceKm ? Number(shipmentData.totalDistanceKm) : undefined;
        fetchCarbonData(shipmentId, optimizationId, initialDist);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load optimization run results');
    } finally {
      setLoading(false);
    }
  }, [optimizationId, shipmentId, fetchRouteData, fetchCarbonData]);

  // 3D Vehicle Selection & Active Load Plan Derivations — MUST be declared unconditionally before any early returns
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadPlans = run?.loadPlans || [];
  const baselineTruckCount = run?.baselineTruckCount ?? loadPlans.length;
  const optimizedTruckCount = run?.optimizedTruckCount ?? loadPlans.length;
  const trucksSaved = baselineTruckCount - optimizedTruckCount;
  const isAllCargoAllocated = (run?.unassignedItemsCount ?? 0) === 0;

  const activeLoadPlan = loadPlans[selectedVehicleIndex] || loadPlans[0] || null;
  const activeTruck = useMemo(() => (activeLoadPlan ? extractTruckDimensions(activeLoadPlan) : null), [activeLoadPlan]);

  const activeTransformedBoxes = useMemo(() => {
    if (!activeLoadPlan) return [];
    const rawPlacements = extractPlacements(activeLoadPlan);
    return rawPlacements
      .map((p) => transformPlacementTo3D(p, activeTruck || undefined))
      .filter(Boolean) as TransformedBox3D[];
  }, [activeLoadPlan, activeTruck]);

  const activeSelectedBox = useMemo(() => {
    if (!selectedInstanceId) return null;
    return activeTransformedBoxes.find((b) => b.instanceId === selectedInstanceId) || null;
  }, [selectedInstanceId, activeTransformedBoxes]);

  const unallocatedCargoList = useMemo(() => {
    if (run?.violationsJson && typeof run.violationsJson === 'object' && Array.isArray(run.violationsJson.unallocatedCargo)) {
      return run.violationsJson.unallocatedCargo;
    }
    return [];
  }, [run?.violationsJson]);

  if (loading) {
    return (
      <AppLayout title="Fleet Optimization Result" subtitle="Retrieving algorithmic allocation...">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          </div>
          <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (error || !run) {
    return (
      <AppLayout title="Optimization Result" subtitle="Fleet Allocation">
        <div className="max-w-xl mx-auto px-6 py-16 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Optimization Result Not Found</h2>
          <p className="text-[13.5px] text-slate-500">{error || 'The requested optimization run could not be found.'}</p>
          <div>
            <Link
              to={shipmentId ? `/app/shipments/${shipmentId}` : '/app/shipments'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F6B3A] text-white text-[13.5px] font-semibold rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Shipment
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Optimization Result — ${run.scenarioName || 'Fleet Allocation'}`}
      subtitle={`Run ID: ${run.id} • Algorithm: ${run.algorithmVersion}`}
    >
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Navigation Breadcrumb & Quick Jumps */}
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
            <Link to={shipmentId ? `/app/shipments/${shipmentId}` : '/app/shipments'} className="hover:text-slate-900 transition-colors">
              {shipment ? `Shipment #${shipment.shipmentNumber}` : `Shipment #${shipmentId?.slice(0, 8)}`}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">Optimization Result</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => viewerRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <BoxSelect className="w-3.5 h-3.5 text-[#0F6B3A]" />
              3D Viewer
            </button>
            <button
              type="button"
              onClick={() => routeSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5 text-[#0F6B3A]" />
              Route & Map
            </button>
            <button
              type="button"
              onClick={fetchData}
              aria-label="Refresh results"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Optimality Guarantee & Bounded Search Transparency Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">
                  {run.scenarioName || 'Bounded Fleet Optimization Solution'}
                </h1>
                <div className="text-[12px] text-slate-400 flex flex-wrap items-center gap-2">
                  <span>Run ID: <span className="font-mono text-slate-300">{run.id}</span></span>
                  <span>•</span>
                  <span>Executed: {new Date(run.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold ${
                  run.status === 'COMPLETED' || run.status === 'OPTIMAL' || run.status === 'FEASIBLE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {run.status}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[12.5px] text-slate-300 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Optimization Quality:</strong> Best solution found within configured optimization bounds. Computed via deterministic combinatorial fleet allocation and 3D heuristic packing (<code className="text-emerald-400 text-[11px]">{run.algorithmVersion}</code>).
            </span>
          </div>
        </div>

        {/* High-Level KPI Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Trucks KPI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Fleet Assigned</span>
              <Truck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{optimizedTruckCount}</span>
              <span className="text-[12px] text-slate-500 font-medium">/ {baselineTruckCount} baseline</span>
            </div>
            <div className="mt-1">
              {trucksSaved > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {trucksSaved} vehicle{trucksSaved > 1 ? 's' : ''} saved
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">Baseline fleet requirement</span>
              )}
            </div>
          </div>

          {/* Payload Utilization KPI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Payload Utilization</span>
              <Scale className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatPercent(run.overallWeightUtilizationPct, 1, '—')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {run.totalLoadedWeightKg != null
                ? `${formatWeight(run.totalLoadedWeightKg, false)} loaded`
                : 'No weight data'}
            </div>
          </div>

          {/* Volume Utilization KPI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Volume Utilization</span>
              <Maximize2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatPercent(run.overallVolumeUtilizationPct, 1, '—')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {run.totalLoadedVolumeM3 != null ? `${formatVolume(run.totalLoadedVolumeM3, 2)} loaded` : 'No volume data'}
            </div>
          </div>

          {/* Carbon Footprint KPI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-[12px] font-semibold mb-1">
              <span>Carbon Footprint</span>
              <Leaf className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {carbonResult && carbonResult.totalCo2e > 0
                ? `${formatNum(carbonResult.totalCo2e, 1)}`
                : carbonLoading
                ? '...'
                : 'Pending'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {carbonResult && carbonResult.totalCo2e > 0
                ? `${carbonResult.co2eUnit || 'kg CO₂e'} · Scope 3`
                : carbonLoading
                ? 'Calculating...'
                : 'Pending road route'}
            </div>
          </div>
        </div>

        {/* Cargo Allocation Integrity Status Banner */}
        {isAllCargoAllocated ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-[13px] shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-900">100% Cargo Allocated</div>
              <div className="text-emerald-700 text-[12px] mt-0.5">
                All freight items from shipment consignment have been successfully assigned and packed into the selected vehicles without constraint violations.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-[13px] shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900">Unallocated Cargo Warning</div>
              <div className="text-amber-700 text-[12px] mt-0.5">
                {run.unassignedItemsCount} item(s) could not be packed into the assigned fleet vehicles within the specified bounds and volumetric constraints. Please consider allocating additional vehicles or re-running with multi-vehicle fallback enabled.
              </div>
            </div>
          </div>
        )}
        {/* CarbonIQ Optimization Impact Summary */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-[15px] font-bold text-white">CarbonIQ Optimization Impact</h2>
            <span className="text-[11px] text-slate-400 ml-1">What did we actually improve?</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Vehicle count */}
            <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3.5 border border-white/10">
              <span className="text-emerald-400 font-bold text-lg leading-none mt-0.5">✓</span>
              <div>
                <div className="text-[13px] font-bold text-white">Fleet allocated</div>
                <div className="text-[12px] text-slate-300 mt-0.5">
                  {optimizedTruckCount} vehicle{optimizedTruckCount !== 1 ? 's' : ''} required
                  {trucksSaved > 0 && (
                    <span className="ml-1 text-emerald-400 font-semibold">({trucksSaved} saved vs. baseline)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Payload utilization */}
            {run.overallWeightUtilizationPct != null && (
              <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3.5 border border-white/10">
                <span className="text-emerald-400 font-bold text-lg leading-none mt-0.5">✓</span>
                <div>
                  <div className="text-[13px] font-bold text-white">Payload utilization</div>
                  <div className="text-[12px] text-slate-300 mt-0.5">
                    {formatPercent(run.overallWeightUtilizationPct, 1)} of payload capacity
                    {run.totalLoadedWeightKg != null && ` · ${formatWeight(run.totalLoadedWeightKg, false)} loaded`}
                  </div>
                </div>
              </div>
            )}

            {/* Volume utilization */}
            {run.overallVolumeUtilizationPct != null && (
              <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3.5 border border-white/10">
                <span className="text-emerald-400 font-bold text-lg leading-none mt-0.5">✓</span>
                <div>
                  <div className="text-[13px] font-bold text-white">Volume utilization</div>
                  <div className="text-[12px] text-slate-300 mt-0.5">
                    {formatPercent(run.overallVolumeUtilizationPct, 1)} of cargo space used
                    {run.totalLoadedVolumeM3 != null && ` · ${formatVolume(run.totalLoadedVolumeM3, 2)} loaded`}
                  </div>
                </div>
              </div>
            )}

            {/* 3D placement */}
            {loadPlans.length > 0 && (
              <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3.5 border border-white/10">
                <span className="text-emerald-400 font-bold text-lg leading-none mt-0.5">✓</span>
                <div>
                  <div className="text-[13px] font-bold text-white">3D cargo placement</div>
                  <div className="text-[12px] text-slate-300 mt-0.5">
                    {isAllCargoAllocated ? 'All cargo items packed successfully' : `${run.unassignedItemsCount ?? 0} item(s) could not be allocated`}
                    {` · ${loadPlans.length} load plan${loadPlans.length !== 1 ? 's' : ''} generated`}
                  </div>
                </div>
              </div>
            )}

            {/* Route distance */}
            {route && route.distanceMeters > 0 && (
              <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3.5 border border-white/10">
                <span className="text-emerald-400 font-bold text-lg leading-none mt-0.5">✓</span>
                <div>
                  <div className="text-[13px] font-bold text-white">Route calculated</div>
                  <div className="text-[12px] text-slate-300 mt-0.5">
                    {formatNum(route.distanceMeters / 1000, 1)} km real road route
                    {route.durationSeconds > 0 && ` · ~${Math.round(route.durationSeconds / 3600)} h transit`}
                  </div>
                </div>
              </div>
            )}

            {/* Carbon */}
            {carbonResult && (
              <div className="flex items-start gap-2.5 bg-white/5 rounded-xl p-3.5 border border-white/10">
                <span className="text-emerald-400 font-bold text-lg leading-none mt-0.5">✓</span>
                <div>
                  <div className="text-[13px] font-bold text-white">Carbon footprint</div>
                  <div className="text-[12px] text-slate-300 mt-0.5">
                    {formatNum(carbonResult.totalCo2e, 2)} {carbonResult.co2eUnit || 'kg CO₂e'} · Scope 3 Freight
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Authoritative Carbon Footprint Impact (GLEC Scope 3) */}
        <ShipmentCarbonCard
          carbonResult={carbonResult}
          loading={carbonLoading}
          error={carbonError}
          onRetry={() => {
            if (shipmentId && optimizationId) {
              fetchCarbonData(shipmentId, optimizationId);
            }
          }}
          optimizationMetrics={{
            payloadUtilPct: run.overallWeightUtilizationPct ?? undefined,
            volumeUtilPct: run.overallVolumeUtilizationPct ?? undefined,
            vehicleCount: optimizedTruckCount,
            routeDistanceKm: route ? route.distanceMeters / 1000 : undefined,
            totalTonneKm: carbonResult?.totalTonneKm ?? undefined,
            baselineTruckCount: baselineTruckCount,
            optimizedTruckCount: optimizedTruckCount,
          }}
        />

        {/* Spatial & Geospatial Correlation Bridge Notice */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-slate-700 text-[13px]">
          <Info className="w-5 h-5 text-[#0F6B3A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-900">Spatial Packing & Transit Alignment</div>
            <p className="text-slate-600 text-[12.5px] leading-relaxed">
              The <strong>3D Load Plan</strong> below renders the exact volumetric cargo placement inside the cargo hold of{' '}
              <span className="font-semibold text-[#0F6B3A]">Vehicle #{activeLoadPlan?.vehicleSequence || 1}</span>.
              The <strong>Road Route & Map</strong> further down visualizes the actual highway route coordinates and stop sequencing across the transport corridor.
            </p>
          </div>
        </div>

        {/* Interactive 3D Truck Loading Section */}
        {loadPlans.length > 0 && activeLoadPlan && (
          <div ref={viewerRef} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BoxSelect className="w-5 h-5 text-[#0F6B3A]" />
                  Interactive 3D Truck Loading & Spatial Arrangement
                </h2>
                <p className="text-[13px] text-slate-500">
                  Authoritative 3D packing plan showing container bounds, package coordinates, and orientation in physical space.
                </p>
              </div>

              {/* Multi-vehicle tab switcher if > 1 vehicle */}
              {loadPlans.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                  {loadPlans.map((plan, idx) => {
                    const isSelected = idx === selectedVehicleIndex;
                    return (
                      <button
                        key={plan.id || idx}
                        type="button"
                        onClick={() => {
                          setSelectedVehicleIndex(idx);
                          setSelectedInstanceId(null);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#0F6B3A] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Vehicle #{plan.vehicleSequence}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Vehicle Utilization Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              {/* Payload Metrics */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Payload Capacity: {Number(activeLoadPlan.loadedWeightKg).toLocaleString()} / {activeTruck ? activeTruck.maxPayloadKg.toLocaleString() : (Number(activeLoadPlan.loadedWeightKg) / (Number(activeLoadPlan.weightUtilizationPct) / 100 || 1)).toFixed(0)} kg
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    {Number(activeLoadPlan.weightUtilizationPct).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0F6B3A] rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(2, Number(activeLoadPlan.weightUtilizationPct)))}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 text-right">
                  Headroom: {Math.max(0, (activeTruck?.maxPayloadKg || 0) - Number(activeLoadPlan.loadedWeightKg)).toLocaleString()} kg remaining
                </div>
              </div>

              {/* Volume Metrics */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                    Volume Capacity: {Number(activeLoadPlan.loadedVolumeM3).toFixed(2)} / {activeTruck ? (activeTruck.lengthM * activeTruck.widthM * activeTruck.heightM).toFixed(2) : (Number(activeLoadPlan.loadedVolumeM3) / (Number(activeLoadPlan.volumeUtilizationPct) / 100 || 1)).toFixed(2)} m³
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    {Number(activeLoadPlan.volumeUtilizationPct).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(2, Number(activeLoadPlan.volumeUtilizationPct)))}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 text-right">
                  Headroom: {Math.max(0, (activeTruck ? activeTruck.lengthM * activeTruck.widthM * activeTruck.heightM : 0) - Number(activeLoadPlan.loadedVolumeM3)).toFixed(2)} m³ remaining
                </div>
              </div>
            </div>

            {/* 3D Visualizer & Inspector Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8">
                <TruckLoadViewer
                  loadPlan={activeLoadPlan}
                  selectedInstanceId={selectedInstanceId}
                  onSelectCargo={setSelectedInstanceId}
                />
              </div>

              <div className="lg:col-span-4 flex flex-col justify-start">
                <SelectedCargoCard
                  selectedBox={activeSelectedBox}
                  assignedVehicleName={activeTruck?.name || `Vehicle #${activeLoadPlan.vehicleSequence}`}
                  onClearSelection={() => setSelectedInstanceId(null)}
                />
              </div>
            </div>

            {/* Cargo Manifest Legend */}
            <CargoManifestLegend
              boxes={activeTransformedBoxes}
              selectedId={selectedInstanceId}
              onSelect={setSelectedInstanceId}
            />
          </div>
        )}

        {/* Unplaced Cargo Consignment Section */}
        <UnplacedCargoSection
          unplacedItems={unallocatedCargoList}
          unplacedCount={run.unassignedItemsCount || 0}
        />

        {/* Selected Fleet Load Plans Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F6B3A]" />
                Selected Fleet & Vehicle Load Plans ({loadPlans.length})
              </h2>
              <p className="text-[13px] text-slate-500">
                Detailed utilization breakdowns, remaining headspace, and cargo manifests for each assigned vehicle.
              </p>
            </div>
          </div>

          {loadPlans.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <Truck className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-[14px] font-bold text-slate-700">No Vehicles Allocated</div>
              <p className="text-[12.5px] text-slate-500 max-w-md mx-auto">
                The optimization engine could not find a feasible vehicle configuration within the configured constraints.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {loadPlans.map((plan, idx) => {
                const weightPct = Number(plan.weightUtilizationPct) || 0;
                const volumePct = Number(plan.volumeUtilizationPct) || 0;
                const loadedWeightKg = Number(plan.loadedWeightKg) || 0;
                const loadedVolumeM3 = Number(plan.loadedVolumeM3) || 0;

                // Estimate capacity from utilization percentage
                const estimatedMaxWeightKg = weightPct > 0 ? (loadedWeightKg / (weightPct / 100)) : loadedWeightKg;
                const remainingWeightHeadroomKg = Math.max(0, estimatedMaxWeightKg - loadedWeightKg);

                const estimatedMaxVolumeM3 = volumePct > 0 ? (loadedVolumeM3 / (volumePct / 100)) : loadedVolumeM3;
                const remainingVolumeHeadroomM3 = Math.max(0, estimatedMaxVolumeM3 - loadedVolumeM3);

                // Parse placements if available
                let placementsList: any[] = [];
                if (plan.placementsJson) {
                  if (Array.isArray(plan.placementsJson)) {
                    placementsList = plan.placementsJson;
                  } else if (Array.isArray(plan.placementsJson.placements)) {
                    placementsList = plan.placementsJson.placements;
                  }
                }

                return (
                  <div
                    key={plan.id || plan.vehicleSequence}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 hover:border-slate-300 transition-colors"
                  >
                    {/* Vehicle Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F6B3A]/10 text-[#0F6B3A] flex items-center justify-center font-bold text-[14px]">
                          #{plan.vehicleSequence}
                        </div>
                        <div>
                          <div className="text-[14.5px] font-bold text-slate-900">
                            Vehicle #{plan.vehicleSequence}
                          </div>
                          <div className="text-[11.5px] text-slate-400 font-mono">
                            {plan.vehicleTypeId ? `Type: ${plan.vehicleTypeId}` : 'Fleet Spec'}
                            {plan.vehicleId ? ` • ID: ${plan.vehicleId}` : ''}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        Assigned
                      </span>
                    </div>

                    {/* Utilization Gauges */}
                    <div className="space-y-4">
                      {/* Weight Gauge */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-slate-400" />
                            Payload Utilization
                          </span>
                          <span className="font-bold text-slate-900">{weightPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              weightPct > 95
                                ? 'bg-amber-500'
                                : weightPct > 80
                                ? 'bg-emerald-600'
                                : 'bg-[#0F6B3A]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, weightPct))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Loaded: <strong className="text-slate-700">{loadedWeightKg.toLocaleString()} kg</strong></span>
                          <span>Headroom: <strong className="text-emerald-700">{remainingWeightHeadroomKg.toFixed(0)} kg</strong></span>
                        </div>
                      </div>

                      {/* Volume Gauge */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                            Volume Utilization
                          </span>
                          <span className="font-bold text-slate-900">{volumePct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              volumePct > 95
                                ? 'bg-amber-500'
                                : volumePct > 80
                                ? 'bg-emerald-600'
                                : 'bg-[#0F6B3A]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, volumePct))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Loaded: <strong className="text-slate-700">{loadedVolumeM3.toFixed(2)} m³</strong></span>
                          <span>Headroom: <strong className="text-emerald-700">{remainingVolumeHeadroomM3.toFixed(2)} m³</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Placements / Cargo Summary */}
                    {placementsList.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="text-[12px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-slate-400" />
                            Assigned Freight Items ({placementsList.length})
                          </span>
                        </div>
                        <div className="max-h-28 overflow-y-auto space-y-1 text-[11.5px] pr-1">
                          {placementsList.slice(0, 5).map((p, idx) => (
                            <div
                              key={p.instanceId || idx}
                              className="p-1.5 bg-slate-50 rounded-lg flex items-center justify-between text-slate-600"
                            >
                              <span className="font-medium truncate max-w-[200px]">
                                {p.description || `Item #${idx + 1}`}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {p.lengthMm && p.widthMm && p.heightMm
                                  ? `${p.lengthMm}x${p.widthMm}x${p.heightMm}mm`
                                  : 'Packed'}
                              </span>
                            </div>
                          ))}
                          {placementsList.length > 5 && (
                            <div className="text-center text-[10.5px] text-slate-400 py-0.5">
                              + {placementsList.length - 5} more items packed
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVehicleIndex(idx);
                            setSelectedInstanceId(null);
                            viewerRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-full py-2 px-3 border rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            selectedVehicleIndex === idx
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border-slate-200 text-slate-700'
                          }`}
                        >
                          <BoxSelect className="w-3.5 h-3.5 text-[#0F6B3A]" />
                          {selectedVehicleIndex === idx ? 'Viewing in 3D' : 'View 3D Load'}
                        </button>
                      </div>

                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVehicleIndex(idx);
                            routeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#0F6B3A]" />
                          View Route Map
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Authoritative Route & Map Visualization Section */}
        <div ref={routeSectionRef} className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#0F6B3A]" />
                Road Route & Geospatial Visualization
              </h2>
              <p className="text-[13px] text-slate-500">
                Authoritative road path from OpenRouteService with multi-leg segments and arrival metrics.
              </p>
            </div>

            {shipmentId && (
              <button
                type="button"
                onClick={() => fetchRouteData(shipmentId)}
                disabled={routeLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-700 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${routeLoading ? 'animate-spin' : ''}`} />
                {route ? 'Recalculate Route' : 'Load Route'}
              </button>
            )}
          </div>

          {/* Insufficient Stops Alert */}
          {shipment && (!shipment.stops || shipment.stops.length < 2) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-[13px]">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-900">Insufficient Shipment Stops</div>
                <div className="text-amber-700 text-[12px] mt-0.5">
                  No route can be displayed because this shipment has fewer than 2 stops. Please configure origin and destination stops in the Shipment Detail page.
                </div>
              </div>
            </div>
          )}

          {/* Route Error Alert */}
          {routeError && !route && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-[13px]">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-900">Route Calculation Notice</div>
                <div className="text-rose-700 text-[12px] mt-0.5">{routeError}</div>
              </div>
            </div>
          )}

          {/* Interactive Route Map */}
          <RouteMap
            route={route}
            stops={shipment?.stops || []}
            assignedVehicleName={activeTruck?.name || (activeLoadPlan ? `Vehicle #${activeLoadPlan.vehicleSequence}` : undefined)}
          />

          {/* Route & Traffic Info Panel */}
          <RouteInfoPanel
            route={route}
            trafficETA={trafficETA}
            stops={shipment?.stops || []}
            selectedLoadPlan={activeLoadPlan}
            isLoading={routeLoading}
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Link
            to={shipmentId ? `/app/shipments/${shipmentId}` : '/app/shipments'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shipment
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
