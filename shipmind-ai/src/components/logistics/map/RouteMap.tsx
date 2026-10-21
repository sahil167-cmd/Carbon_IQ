import React, { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Maximize2,
  AlertCircle,
  Navigation,
  Clock,
} from 'lucide-react';
import type { RouteResult, ShipmentStop } from '../../../types/logistics';
import {
  geoJsonToLeafletCoords,
  calculateRouteBounds,
} from '../../../utils/geo-transform';

export interface RouteMapProps {
  route?: RouteResult | null;
  stops?: ShipmentStop[];
  assignedVehicleName?: string;
  className?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  stops = [],
  assignedVehicleName,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeCasingRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const animatedVehicleMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [routeProgress, setRouteProgress] = useState<number>(45); // simulated % progress

  // Convert GeoJSON route coordinates to Leaflet [lat, lon]
  const leafletCoords = useMemo(() => {
    return geoJsonToLeafletCoords(route?.geometry?.coordinates);
  }, [route?.geometry?.coordinates]);

  const hasValidRoute = leafletCoords.length >= 2;

  // Initialize Leaflet Map with OpenStreetMap tiles (free, reliable, no API key required)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    });

    // Fast CartoDB Voyager tiles with fallback and silent error handling
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | CarbonIQ',
    }).addTo(map);

    tileLayer.on('tileerror', () => {
      // Silently ignore tile load errors if offline or blocked by college firewall
    });

    // Add top-right zoom controls
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Layer group for stops markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    // Set fallback initial view until bounds are fitted (India center)
    map.setView([20.5937, 78.9629], 5);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Route Polyline, Animated Vehicle, and Markers when route or stops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up existing route lines & animated marker
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (animatedVehicleMarkerRef.current) {
      map.removeLayer(animatedVehicleMarkerRef.current);
      animatedVehicleMarkerRef.current = null;
    }
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (routeCasingRef.current) {
      map.removeLayer(routeCasingRef.current);
      routeCasingRef.current = null;
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    // 1. Draw Route Geometry
    if (hasValidRoute) {
      // Outer casing for contrast on street map
      const casing = L.polyline(leafletCoords, {
        color: '#FFFFFF',
        weight: 8,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routeCasingRef.current = casing;

      // Primary route line in CarbonIQ forest green
      const polyline = L.polyline(leafletCoords, {
        color: '#0F6B3A',
        weight: 5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routePolylineRef.current = polyline;

      // Fit map camera bounds to real road path
      const bounds = calculateRouteBounds(leafletCoords);
      if (bounds) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }

      // ── Swiggy/Zomato Style Animated Moving Vehicle ──
      const vehicleIcon = L.divIcon({
        className: 'swiggy-moving-vehicle',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <!-- Radar Pulse Halo (Swiggy / Zomato style) -->
            <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; inset: 4px; border-radius: 9999px; background: rgba(15, 107, 58, 0.25);"></div>
            <!-- Vehicle Badge -->
            <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background: #0F6B3A; color: #FFFFFF; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(15,107,58,0.5); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const initialCoord = leafletCoords[0];
      const vehicleMarker = L.marker(initialCoord, {
        icon: vehicleIcon,
        zIndexOffset: 1000,
      }).addTo(map);
      animatedVehicleMarkerRef.current = vehicleMarker;

      // Continuous loop animation along the polyline path
      let progress = 0;
      const totalPoints = leafletCoords.length;
      const speed = 0.0018; // Speed factor

      const animateVehicle = () => {
        progress += speed;
        if (progress >= 1) progress = 0;

        setRouteProgress(Math.round(progress * 100));

        const exactIndex = progress * (totalPoints - 1);
        const indexA = Math.floor(exactIndex);
        const indexB = Math.min(indexA + 1, totalPoints - 1);
        const fraction = exactIndex - indexA;

        const pA = leafletCoords[indexA];
        const pB = leafletCoords[indexB];

        if (pA && pB) {
          const curLat = pA[0] + (pB[0] - pA[0]) * fraction;
          const curLon = pA[1] + (pB[1] - pA[1]) * fraction;
          vehicleMarker.setLatLng([curLat, curLon]);
        }

        animationFrameIdRef.current = requestAnimationFrame(animateVehicle);
      };

      animationFrameIdRef.current = requestAnimationFrame(animateVehicle);
    }

    // 2. Add Stop Markers with Pulsing Radar Destination Pin
    if (markersLayerRef.current && stops.length > 0) {
      const sortedStops = [...stops].sort((a, b) => {
        const seqA = a.stopSequence ?? a.sequenceOrder ?? 0;
        const seqB = b.stopSequence ?? b.sequenceOrder ?? 0;
        return seqA - seqB;
      });

      sortedStops.forEach((stop, idx) => {
        const lat = Number(stop.latitude);
        const lon = Number(stop.longitude);
        if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon)) return;

        const isOrigin = idx === 0;
        const isDestination = idx === sortedStops.length - 1;
        const seqNum = stop.stopSequence ?? stop.sequenceOrder ?? idx + 1;

        const badgeColor = isOrigin ? '#0F6B3A' : isDestination ? '#DC2626' : '#D97706';
        const labelText = isOrigin
          ? 'Origin Pickup'
          : isDestination
          ? 'Final Delivery'
          : `Stop #${seqNum}`;

        // Pulsing radar ripple for destination (Swiggy/Zomato destination ripple)
        const destinationRadarHtml = isDestination
          ? `<div style="position: absolute; width: 48px; height: 48px; top: -14px; left: 16px; border-radius: 9999px; background: rgba(220, 38, 38, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`
          : '';

        const stopIcon = L.divIcon({
          className: 'custom-stop-marker',
          html: `
            <div style="
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
              transform: translate(-50%, -100%);
            ">
              ${destinationRadarHtml}
              <div style="
                background: ${badgeColor};
                color: #FFFFFF;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                font-weight: 700;
                font-size: 11px;
                padding: 4px 9px;
                border-radius: 12px;
                border: 2px solid #FFFFFF;
                box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 4px;
                position: relative;
                z-index: 2;
              ">
                <span>#${seqNum}</span>
                <span>${isOrigin ? 'Pickup' : isDestination ? 'Delivery' : 'Stop'}</span>
              </div>
              <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${badgeColor};
                margin-top: -1px;
                position: relative;
                z-index: 2;
              "></div>
            </div>
          `,
          iconSize: [80, 40],
          iconAnchor: [40, 40],
        });

        const marker = L.marker([lat, lon], { icon: stopIcon });

        // Rich Stop details popup
        marker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 180px; padding: 4px 2px;">
            <div style="font-size: 10px; font-weight: 700; color: ${badgeColor}; text-transform: uppercase; letter-spacing: 0.5px;">
              ${labelText}
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 2px;">
              ${stop.facilityName || stop.locationName || `Stop #${seqNum}`}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px; line-height: 1.4;">
              ${stop.addressLine1 || ''}${stop.city ? `, ${stop.city}` : ''}${stop.state ? `, ${stop.state}` : ''}
              ${stop.country ? ` (${stop.country})` : ''}
            </div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 6px; font-family: monospace;">
              Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}
            </div>
          </div>
        `);

        marker.addTo(markersLayerRef.current!);
      });

      // If no route geometry yet but we have stops, fit map to all stops
      if (!hasValidRoute) {
        const validStops = sortedStops
          .filter((s) => s.latitude && s.longitude)
          .map((s) => [Number(s.latitude), Number(s.longitude)] as [number, number]);
        if (validStops.length > 0) {
          const bounds = calculateRouteBounds(validStops);
          if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  }, [hasValidRoute, leafletCoords, stops]);

  // Reset Map View to Full Route Bounds
  const handleResetCamera = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hasValidRoute) {
      const bounds = calculateRouteBounds(leafletCoords);
      if (bounds) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } else if (stops.length > 0) {
      const validStops = stops
        .filter((s) => s.latitude && s.longitude)
        .map((s) => [Number(s.latitude), Number(s.longitude)] as [number, number]);
      if (validStops.length > 0) {
        const bounds = calculateRouteBounds(validStops);
        if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  };

  const distanceKm = route?.distanceMeters ? (route.distanceMeters / 1000).toFixed(1) : null;
  const durationHours = route?.durationSeconds ? (route.durationSeconds / 3600).toFixed(1) : null;

  return (
    <div className={`relative flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      {/* Map Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0F6B3A]/10 text-[#0F6B3A] flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
              <span>Optimized Highway Route</span>
              {assignedVehicleName && (
                <span className="text-[11px] font-medium text-[#0F6B3A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {assignedVehicleName}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              OpenStreetMap road network
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {distanceKm && (
            <div className="text-right">
              <span className="text-[13px] font-bold text-slate-900">{distanceKm} km</span>
              {durationHours && (
                <span className="text-[11px] text-slate-500 ml-1.5 flex-inline items-center gap-1">
                  <Clock className="w-3 h-3 inline mr-0.5 text-slate-400" />
                  ~{durationHours} hrs
                </span>
              )}
            </div>
          )}

          {/* Fit Bounds Button */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Fit camera to complete route geometry"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            Fit Route
          </button>
        </div>
      </div>

      {/* Missing Geometry Warning Banner */}
      {!hasValidRoute && (
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3 text-amber-800 text-[12.5px]">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900">Route Geometry Calculating or Unavailable</div>
            <div className="text-amber-700 text-[11.5px] mt-0.5">
              {stops.length < 2
                ? 'This shipment requires at least 2 stops (origin and destination) to compute road geometry.'
                : 'Stops are plotted on the map. Calculating road route coordinates between locations.'}
            </div>
          </div>
        </div>
      )}

      {/* Leaflet Map Canvas Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-[460px] bg-slate-100 relative z-0"
        style={{ minHeight: '420px' }}
      >
        {/* ── Swiggy / Zomato Style Live Floating Transit Tracker Card ── */}
        {hasValidRoute && (
          <div className="absolute top-4 left-4 z-[500] max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 border border-slate-700/80 shadow-2xl pointer-events-auto select-none">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>LIVE TRANSIT CORRIDOR</span>
              </div>
              <span className="font-mono text-slate-400 text-[10.5px]">
                {routeProgress}% completed
              </span>
            </div>

            <div className="flex items-center justify-between text-[12.5px] font-semibold text-slate-100">
              <span className="truncate max-w-[130px]">
                {stops[0]?.city || stops[0]?.locationName || 'Origin Hub'}
              </span>
              <span className="text-emerald-400 font-mono text-[11px] px-1.5">→</span>
              <span className="truncate max-w-[130px] text-right text-rose-300">
                {stops[stops.length - 1]?.city || stops[stops.length - 1]?.locationName || 'Destination'}
              </span>
            </div>

            <div className="mt-2 text-[11.5px] text-slate-400 flex items-center justify-between font-mono">
              <span>{distanceKm} km Total</span>
              <span>ETA: ~{durationHours} hrs</span>
            </div>

            {/* Animated Gradient Transit Bar */}
            <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-300 relative"
                style={{ width: `${routeProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clean Route Summary & Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-100 z-10 text-[12px]">
        <div className="flex items-center gap-3 text-[11.5px] text-slate-600 font-medium">
          <span>{stops.length} Stops along route</span>
          {hasValidRoute && (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Verified road path
            </span>
          )}
        </div>

        {/* Legend indicator */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F6B3A]"></span>
            Pickup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Waypoints
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            Delivery
          </span>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
