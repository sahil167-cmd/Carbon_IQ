import React from 'react';
import {
  MapPin,
  Clock,
  Gauge,
  Calendar,
  AlertTriangle,
  Info,
  Truck,
  Layers,
} from 'lucide-react';
import type { RouteResult, TrafficETAResult, ShipmentStop, LoadPlanItem } from '../../../types/logistics';
import { formatDistance, formatDuration } from '../../../utils/geo-transform';

export interface RouteInfoPanelProps {
  route?: RouteResult | null;
  trafficETA?: TrafficETAResult | null;
  stops?: ShipmentStop[];
  selectedLoadPlan?: LoadPlanItem | null;
  isLoading?: boolean;
}

export const RouteInfoPanel: React.FC<RouteInfoPanelProps> = ({
  route,
  trafficETA,
  stops = [],
  selectedLoadPlan,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const distanceMeters = route?.distanceMeters ?? trafficETA?.baseRouteDistanceMeters ?? 0;
  const durationSeconds = trafficETA?.trafficDurationSeconds ?? route?.durationSeconds ?? 0;
  const provider = route?.provider || 'OpenRouteService';
  const appliedProfile = (route?.metadata?.appliedProfile as string) || 'driving-hgv';

  const trafficStatus = trafficETA?.status || 'BASELINE';
  const isLive = trafficETA?.isLiveTraffic || false;

  const departureTimeStr = trafficETA?.departureTime
    ? new Date(trafficETA.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const etaStr = trafficETA?.estimatedTimeOfArrival
    ? new Date(trafficETA.estimatedTimeOfArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0F6B3A] flex items-center justify-center font-bold">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">
              Route Execution & Trajectory Metrics
            </h3>
            <p className="text-[11px] text-slate-400">
              Calculated via backend routing layer ({provider})
            </p>
          </div>
        </div>

        {/* Traffic Status Honest Disclosure Badge */}
        <div className="flex items-center gap-2">
          {trafficStatus === 'LIVE' && isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Traffic Aware
            </span>
          ) : trafficStatus === 'BASELINE' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold">
              <Info className="w-3 h-3 text-slate-500" />
              Baseline ETA (Free Flow)
            </span>
          ) : trafficStatus === 'PREDICTED' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold">
              <Clock className="w-3 h-3 text-amber-600" />
              Statistical / Predicted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11px] font-bold">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              Traffic Unavailable
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Road Distance */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            Road Distance
          </div>
          <div className="text-[17px] font-bold text-slate-900 mt-1">
            {formatDistance(distanceMeters)}
          </div>
          <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
            {distanceMeters.toLocaleString()} m total
          </div>
        </div>

        {/* Travel Duration */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Transit Time
          </div>
          <div className="text-[17px] font-bold text-slate-900 mt-1">
            {formatDuration(durationSeconds)}
          </div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">
            {trafficStatus === 'BASELINE' ? 'Free-flow duration' : 'Traffic-adjusted'}
          </div>
        </div>

        {/* Waypoints & Stops */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Consignment Stops
          </div>
          <div className="text-[17px] font-bold text-slate-900 mt-1">
            {stops.length} Stops
          </div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">
            {route?.legs ? `${route.legs.length} trajectory legs` : 'Direct corridor'}
          </div>
        </div>

        {/* Routing Specification Profile */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Truck className="w-3 h-3 text-slate-400" />
            Routing Profile
          </div>
          <div className="text-[14px] font-bold text-slate-900 mt-1 font-mono uppercase truncate">
            {appliedProfile}
          </div>
          <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
            Provider: {provider}
          </div>
        </div>
      </div>

      {/* ETA Schedule Breakdown (If departure/arrival exists) */}
      {(departureTimeStr || etaStr) && (
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#0F6B3A] flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900">
                Departure: <span className="font-mono text-emerald-800">{departureTimeStr || 'Scheduled'}</span>
                {' → '}
                Estimated Arrival: <span className="font-mono text-emerald-800">{etaStr || 'Calculated'}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {trafficStatus === 'BASELINE'
                  ? 'Showing baseline routing duration without live traffic delay sensors.'
                  : `Assessed delay: ${trafficETA?.trafficDelaySeconds ?? 0} seconds.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Leg Route Breakdown */}
      {route?.legs && route.legs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Route Leg Segments ({route.legs.length})
          </div>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-[11.5px]">
            {route.legs.map((leg, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800">
                    Leg {idx + 1}: Stop #{idx + 1} → Stop #{idx + 2}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-500 font-mono">
                  <span>{formatDistance(leg.distanceMeters)}</span>
                  <span>•</span>
                  <span>{formatDuration(leg.durationSeconds)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Fleet Vehicle Association Banner */}
      {selectedLoadPlan && (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-[11.5px]">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#0F6B3A]" />
            <span className="font-bold text-slate-800">
              Vehicle #{selectedLoadPlan.vehicleSequence}:
            </span>
            <span className="text-slate-600">
              {selectedLoadPlan.vehicleType?.name || selectedLoadPlan.vehicleTypeId || 'Fleet Spec'}
              {selectedLoadPlan.vehicle?.registrationNumber ? ` (${selectedLoadPlan.vehicle.registrationNumber})` : ''}
            </span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Payload: {Number(selectedLoadPlan.loadedWeightKg).toLocaleString()} kg
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteInfoPanel;
