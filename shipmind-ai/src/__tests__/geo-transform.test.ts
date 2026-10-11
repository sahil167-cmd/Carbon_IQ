import { describe, it, expect } from 'vitest';
import {
  validateLatLng,
  geoJsonToLeafletCoords,
  calculateRouteBounds,
  formatDistance,
  formatDuration,
  interpolateRoutePoint,
} from '../utils/geo-transform';

describe('Phase 7E: Geospatial Transformation Utilities', () => {
  describe('Coordinate Validation', () => {
    it('accepts valid WGS-84 coordinates', () => {
      expect(validateLatLng(19.076, 72.8777)).toBe(true); // Mumbai
      expect(validateLatLng(28.6139, 77.209)).toBe(true); // Delhi
      expect(validateLatLng(0, 0)).toBe(true);
      expect(validateLatLng(90, 180)).toBe(true);
      expect(validateLatLng(-90, -180)).toBe(true);
    });

    it('rejects out-of-range latitudes', () => {
      expect(validateLatLng(90.1, 72.8777)).toBe(false);
      expect(validateLatLng(-90.1, 72.8777)).toBe(false);
      expect(validateLatLng(120, 72.8777)).toBe(false);
    });

    it('rejects out-of-range longitudes', () => {
      expect(validateLatLng(19.076, 180.1)).toBe(false);
      expect(validateLatLng(19.076, -180.1)).toBe(false);
      expect(validateLatLng(19.076, 200)).toBe(false);
    });

    it('rejects null, undefined, NaN, and non-numeric coordinates safely', () => {
      expect(validateLatLng(null, 72.8777)).toBe(false);
      expect(validateLatLng(19.076, undefined)).toBe(false);
      expect(validateLatLng(NaN, 72.8777)).toBe(false);
      expect(validateLatLng('invalid', 'coords')).toBe(false);
    });
  });

  describe('GeoJSON to Leaflet Coordinate Conversion', () => {
    it('converts GeoJSON [lon, lat] pairs to Leaflet [lat, lon] pairs', () => {
      const geoJsonCoords: [number, number][] = [
        [72.8777, 19.076], // Mumbai: lon, lat
        [73.8567, 18.5204], // Pune: lon, lat
      ];

      const leafletCoords = geoJsonToLeafletCoords(geoJsonCoords);

      expect(leafletCoords).toHaveLength(2);
      expect(leafletCoords[0]).toEqual([19.076, 72.8777]); // lat, lon
      expect(leafletCoords[1]).toEqual([18.5204, 73.8567]); // lat, lon
    });

    it('filters out malformed or out-of-bounds pairs without crashing', () => {
      const corrupted: any = [
        [72.8777, 19.076],
        ['bad', 19.076],
        [72.8777, 999], // invalid lat
        null,
        [73.8567, 18.5204],
      ];

      const result = geoJsonToLeafletCoords(corrupted);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([19.076, 72.8777]);
      expect(result[1]).toEqual([18.5204, 73.8567]);
    });

    it('returns empty array when input is null or empty', () => {
      expect(geoJsonToLeafletCoords(null)).toEqual([]);
      expect(geoJsonToLeafletCoords([])).toEqual([]);
    });
  });

  describe('Route Bounds Calculation', () => {
    it('calculates bounding box from arbitrary coordinates without hardcoded bias', () => {
      const coords: [number, number][] = [
        [19.076, 72.8777],
        [18.5204, 73.8567],
        [19.2, 73.1],
      ];

      const bounds = calculateRouteBounds(coords);
      expect(bounds).not.toBeNull();
      expect(bounds![0]).toEqual([18.5204, 72.8777]); // minLat, minLon
      expect(bounds![1]).toEqual([19.2, 73.8567]); // maxLat, maxLon
    });

    it('returns null for empty coordinate list', () => {
      expect(calculateRouteBounds([])).toBeNull();
    });
  });

  describe('Distance and Duration Formatting', () => {
    it('formats meters to km with one decimal place for distances >= 1000m', () => {
      expect(formatDistance(148500)).toBe('148.5 km');
      expect(formatDistance(1200)).toBe('1.2 km');
      expect(formatDistance(1000)).toBe('1.0 km');
    });

    it('formats meters directly for distances < 1000m', () => {
      expect(formatDistance(750)).toBe('750 m');
      expect(formatDistance(0)).toBe('0 m');
    });

    it('formats duration in hours and minutes', () => {
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(300)).toBe('5m');
      expect(formatDuration(0)).toBe('0m');
    });
  });

  describe('Route Vertex Interpolation for Playback Animation', () => {
    const polyline: [number, number][] = [
      [10, 10],
      [10, 20],
      [20, 20],
    ];

    it('returns start coordinate at 0% progress', () => {
      expect(interpolateRoutePoint(polyline, 0)).toEqual([10, 10]);
    });

    it('returns end coordinate at 100% progress', () => {
      expect(interpolateRoutePoint(polyline, 1)).toEqual([20, 20]);
    });

    it('interpolates midpoint along first segment at 25% total distance', () => {
      // Total path length = 10 + 10 = 20.
      // At progress 0.25, targetDist = 5 (midpoint of [10, 10] -> [10, 20]).
      const mid = interpolateRoutePoint(polyline, 0.25);
      expect(mid).not.toBeNull();
      expect(mid![0]).toBeCloseTo(10);
      expect(mid![1]).toBeCloseTo(15);
    });

    it('interpolates midpoint along second segment at 75% total distance', () => {
      // At progress 0.75, targetDist = 15 (midpoint of [10, 20] -> [20, 20]).
      const mid = interpolateRoutePoint(polyline, 0.75);
      expect(mid).not.toBeNull();
      expect(mid![0]).toBeCloseTo(15);
      expect(mid![1]).toBeCloseTo(20);
    });
  });
});
