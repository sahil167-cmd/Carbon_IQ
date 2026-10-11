/**
 * Pure Geospatial Utilities for CarbonIQ Logistics Route & Map Visualization
 */

/**
 * Validates that latitude and longitude are valid finite numbers within WGS-84 ranges:
 * - Latitude: [-90, 90]
 * - Longitude: [-180, 180]
 */
export function validateLatLng(lat: unknown, lon: unknown): boolean {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return false;
  }
  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return false;
  }

  if (latNum < -90 || latNum > 90) {
    return false;
  }

  if (lonNum < -180 || lonNum > 180) {
    return false;
  }

  return true;
}

/**
 * Converts GeoJSON [longitude, latitude] coordinate pairs into
 * Leaflet-compatible [latitude, longitude] pairs.
 * Filters out any malformed or out-of-range coordinates safely.
 */
export function geoJsonToLeafletCoords(
  coords?: [number, number][] | null
): [number, number][] {
  if (!coords || !Array.isArray(coords)) {
    return [];
  }

  const result: [number, number][] = [];

  for (let i = 0; i < coords.length; i++) {
    const pair = coords[i];
    if (!Array.isArray(pair) || pair.length < 2) continue;

    const lon = Number(pair[0]);
    const lat = Number(pair[1]);

    if (validateLatLng(lat, lon)) {
      result.push([lat, lon]);
    }
  }

  return result;
}

/**
 * Computes bounding box [[minLat, minLon], [maxLat, maxLon]] from Leaflet [lat, lon] coordinates.
 * Returns null if no valid coordinates are provided.
 */
export function calculateRouteBounds(
  coords: [number, number][]
): [[number, number], [number, number]] | null {
  if (!coords || coords.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const [lat, lon] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return null;
  }

  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}

/**
 * Human-readable distance formatter.
 * >= 1000m -> "XX.X km", < 1000m -> "XXX m"
 */
export function formatDistance(meters?: number | null): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return '0 km';
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

/**
 * Human-readable travel duration formatter.
 * e.g. 7400s -> "2h 3m", 150s -> "3m"
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return '0m';
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return `${mins}m`;
}

/**
 * Approximate Euclidean distance in degrees between two [lat, lon] points.
 * Used for proportional interpolation along road vertices.
 */
function distSq(p1: [number, number], p2: [number, number]): number {
  const dLat = p1[0] - p2[0];
  const dLon = p1[1] - p2[1];
  return dLat * dLat + dLon * dLon;
}

/**
 * Smoothly interpolates an exact [lat, lon] location along the road vertices
 * for a progress percentage between 0.0 and 1.0.
 */
export function interpolateRoutePoint(
  coords: [number, number][],
  progress: number
): [number, number] | null {
  if (!coords || coords.length === 0) return null;
  if (coords.length === 1) return coords[0];

  const clampedProgress = Math.max(0, Math.min(1, progress));
  if (clampedProgress <= 0) return coords[0];
  if (clampedProgress >= 1) return coords[coords.length - 1];

  // Calculate cumulative segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const d = Math.sqrt(distSq(coords[i], coords[i + 1]));
    segmentLengths.push(d);
    totalLength += d;
  }

  if (totalLength === 0) return coords[0];

  const targetDist = clampedProgress * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist) {
      const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const start = coords[i];
      const end = coords[i + 1];

      const lat = start[0] + (end[0] - start[0]) * segProgress;
      const lon = start[1] + (end[1] - start[1]) * segProgress;

      return [lat, lon];
    }
    accumulated += segLen;
  }

  return coords[coords.length - 1];
}
