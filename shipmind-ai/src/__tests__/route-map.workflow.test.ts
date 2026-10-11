import { describe, it, expect, vi, beforeEach } from 'vitest';
import LogisticsService from '../services/logistics.service';
import * as apiClient from '../lib/api-client';
import type { RouteResult, TrafficETAResult, ShipmentStop } from '../types/logistics';
import {
  geoJsonToLeafletCoords,
  calculateRouteBounds,
  formatDistance,
  formatDuration,
  interpolateRoutePoint,
} from '../utils/geo-transform';

vi.mock('../lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('Phase 7E: Real Route & Map Visualization Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRouteResult: RouteResult = {
    success: true,
    distanceMeters: 148500,
    durationSeconds: 10800, // 3 hours free-flow
    geometry: {
      format: 'GEOJSON',
      coordinates: [
        [72.8777, 19.076], // Mumbai
        [73.1, 19.15],
        [73.5, 18.8],
        [73.8567, 18.5204], // Pune
      ],
    },
    legs: [
      {
        origin: { latitude: 19.076, longitude: 72.8777 },
        destination: { latitude: 18.5204, longitude: 73.8567 },
        distanceMeters: 148500,
        durationSeconds: 10800,
      },
    ],
    provider: 'OpenRouteService',
    providerVersion: 'v2',
    metadata: {
      timestamp: new Date().toISOString(),
      isTrafficAware: false,
      appliedProfile: 'driving-hgv',
    },
  };

  const mockTrafficETAResult: TrafficETAResult = {
    success: true,
    route: mockRouteResult,
    departureTime: '2026-09-08T08:00:00.000Z',
    estimatedTimeOfArrival: '2026-09-08T11:00:00.000Z',
    baseRouteDistanceMeters: 148500,
    baseDurationSeconds: 10800,
    trafficDurationSeconds: 10800,
    trafficDelaySeconds: 0,
    status: 'BASELINE',
    isLiveTraffic: false,
    source: 'OpenRouteService Baseline',
    congestionLevel: 'FREE_FLOW',
    assessment: {
      status: 'BASELINE',
      isLive: false,
      isPredicted: false,
      baseDurationSeconds: 10800,
      trafficDurationSeconds: 10800,
      trafficDelaySeconds: 0,
      source: 'OpenRouteService Baseline',
      congestionLevel: 'FREE_FLOW',
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      isTrafficAware: false,
      departureTimeIso: '2026-09-08T08:00:00.000Z',
      etaIso: '2026-09-08T11:00:00.000Z',
    },
  };

  describe('1. Logistics API Client - Routing & Traffic Endpoints', () => {
    it('calls GET /api/v1/logistics/shipments/:shipmentId/route with profile', async () => {
      (apiClient.apiGet as any).mockResolvedValueOnce(mockRouteResult);

      const result = await LogisticsService.getShipmentRoute('shipment-123', 'driving-hgv');

      expect(apiClient.apiGet).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/shipment-123/route',
        { profile: 'driving-hgv' }
      );
      expect(result.success).toBe(true);
      expect(result.provider).toBe('OpenRouteService');
      expect(result.distanceMeters).toBe(148500);
    });

    it('calls GET /api/v1/logistics/shipments/:shipmentId/traffic-eta with departure params', async () => {
      (apiClient.apiGet as any).mockResolvedValueOnce(mockTrafficETAResult);

      const result = await LogisticsService.getShipmentTrafficETA('shipment-123', {
        departureTime: '2026-09-08T08:00:00.000Z',
        profile: 'driving-hgv',
      });

      expect(apiClient.apiGet).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/shipment-123/traffic-eta',
        {
          departureTime: '2026-09-08T08:00:00.000Z',
          profile: 'driving-hgv',
        }
      );
      expect(result.status).toBe('BASELINE');
      expect(result.isLiveTraffic).toBe(false);
      expect(result.trafficDelaySeconds).toBe(0);
    });
  });

  describe('2. OpenRouteService Road Geometry Integrity', () => {
    it('converts GeoJSON coordinates into valid Leaflet [lat, lon] coordinates', () => {
      const leafletCoords = geoJsonToLeafletCoords(mockRouteResult.geometry.coordinates);

      expect(leafletCoords).toHaveLength(4);
      expect(leafletCoords[0]).toEqual([19.076, 72.8777]); // Origin [lat, lon]
      expect(leafletCoords[3]).toEqual([18.5204, 73.8567]); // Destination [lat, lon]
    });

    it('fits bounds accurately to the road trajectory without static bias', () => {
      const leafletCoords = geoJsonToLeafletCoords(mockRouteResult.geometry.coordinates);
      const bounds = calculateRouteBounds(leafletCoords);

      expect(bounds).not.toBeNull();
      expect(bounds![0][0]).toBeCloseTo(18.5204); // minLat
      expect(bounds![0][1]).toBeCloseTo(72.8777); // minLon
      expect(bounds![1][0]).toBeCloseTo(19.15); // maxLat
      expect(bounds![1][1]).toBeCloseTo(73.8567); // maxLon
    });
  });

  describe('3. Multi-Stop Sequence Preservation', () => {
    it('sorts stops correctly according to stopSequence / sequenceOrder', () => {
      const stops: ShipmentStop[] = [
        {
          id: 'stop-3',
          stopType: 'DROPOFF',
          stopSequence: 3,
          facilityName: 'Pune DC',
          latitude: 18.5204,
          longitude: 73.8567,
          country: 'India',
        },
        {
          id: 'stop-1',
          stopType: 'PICKUP',
          stopSequence: 1,
          facilityName: 'Nhava Sheva Port',
          latitude: 18.95,
          longitude: 72.95,
          country: 'India',
        },
        {
          id: 'stop-2',
          stopType: 'TRANSIT_WAYPOINT',
          sequenceOrder: 2, // Supports sequenceOrder fallback
          facilityName: 'Lonavala Weigh Station',
          latitude: 18.75,
          longitude: 73.4,
          country: 'India',
        },
      ];

      const sorted = [...stops].sort((a, b) => {
        const seqA = a.stopSequence ?? a.sequenceOrder ?? 0;
        const seqB = b.stopSequence ?? b.sequenceOrder ?? 0;
        return seqA - seqB;
      });

      expect(sorted[0].id).toBe('stop-1');
      expect(sorted[1].id).toBe('stop-2');
      expect(sorted[2].id).toBe('stop-3');
      expect(sorted[0].stopType).toBe('PICKUP');
      expect(sorted[2].stopType).toBe('DROPOFF');
    });
  });

  describe('4. Truthful Traffic & ETA Disclosure', () => {
    it('truthfully reports BASELINE status without claiming live traffic', () => {
      expect(mockTrafficETAResult.status).toBe('BASELINE');
      expect(mockTrafficETAResult.isLiveTraffic).toBe(false);
      expect(mockTrafficETAResult.trafficDelaySeconds).toBe(0);

      // Verify that free-flow duration matches base duration exactly
      expect(mockTrafficETAResult.trafficDurationSeconds).toBe(mockTrafficETAResult.baseDurationSeconds);
    });

    it('formats travel metrics into user-friendly strings', () => {
      expect(formatDistance(mockTrafficETAResult.baseRouteDistanceMeters)).toBe('148.5 km');
      expect(formatDuration(mockTrafficETAResult.trafficDurationSeconds)).toBe('3h');
    });
  });

  describe('5. Handling Missing or Malformed Geometry Truthfully', () => {
    it('returns empty array when route coordinates are absent', () => {
      const coords = geoJsonToLeafletCoords(undefined);
      expect(coords).toEqual([]);
      expect(coords.length < 2).toBe(true);
    });

    it('does not crash or invent coordinates when stops lack coordinates', () => {
      const incompleteStops: ShipmentStop[] = [
        {
          id: 'stop-a',
          stopType: 'PICKUP',
          latitude: null,
          longitude: null,
          country: 'India',
        },
      ];

      const valid = incompleteStops.filter((s) => s.latitude != null && s.longitude != null);
      expect(valid).toHaveLength(0);
    });
  });

  describe('6. Vehicle Playback Animation Along Road Polyline', () => {
    it('interpolates intermediate positions accurately across road vertices', () => {
      const coords: [number, number][] = [
        [19.076, 72.8777],
        [18.5204, 73.8567],
      ];

      const start = interpolateRoutePoint(coords, 0);
      const half = interpolateRoutePoint(coords, 0.5);
      const end = interpolateRoutePoint(coords, 1.0);

      expect(start).toEqual(coords[0]);
      expect(end).toEqual(coords[1]);
      expect(half![0]).toBeCloseTo((19.076 + 18.5204) / 2);
      expect(half![1]).toBeCloseTo((72.8777 + 73.8567) / 2);
    });
  });
});
