import { AppError } from '../../../../core/errors/app.error';

/**
 * Coordinate pair representing geographic position on WGS84 ellipsoid.
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Validates a coordinate pair strictly according to geographic range boundaries.
 * Latitude must be within [-90.0, 90.0].
 * Longitude must be within [-180.0, 180.0].
 */
export function validateCoordinate(coord: unknown, label = 'Coordinate'): Coordinate {
  if (!coord || typeof coord !== 'object') {
    throw new RoutingError(`${label} is required and must be an object`, 'MISSING_COORDINATE', 400);
  }

  const { latitude, longitude } = coord as Record<string, unknown>;

  if (latitude === undefined || latitude === null) {
    throw new RoutingError(`${label} latitude is missing`, 'MISSING_COORDINATE', 400);
  }

  if (longitude === undefined || longitude === null) {
    throw new RoutingError(`${label} longitude is missing`, 'MISSING_COORDINATE', 400);
  }

  const latNum = Number(latitude);
  const lonNum = Number(longitude);

  if (!Number.isFinite(latNum)) {
    throw new RoutingError(`${label} latitude must be a finite number`, 'INVALID_COORDINATE', 400);
  }

  if (!Number.isFinite(lonNum)) {
    throw new RoutingError(`${label} longitude must be a finite number`, 'INVALID_COORDINATE', 400);
  }

  if (latNum < -90 || latNum > 90) {
    throw new RoutingError(
      `${label} latitude (${latNum}) out of valid range [-90.0, 90.0]`,
      'INVALID_COORDINATE',
      400,
    );
  }

  if (lonNum < -180 || lonNum > 180) {
    throw new RoutingError(
      `${label} longitude (${lonNum}) out of valid range [-180.0, 180.0]`,
      'INVALID_COORDINATE',
      400,
    );
  }

  return {
    latitude: latNum,
    longitude: lonNum,
  };
}

/**
 * Vehicle physical specification and operational profile for vehicle-aware routing.
 * Units:
 * - Preferred dimensions: meters
 * - Alternative dimensions: millimeters (auto-normalized to meters)
 * - Preferred gross weight: metric tonnes (t)
 * - Alternative weight: kilograms (kg) or grams (g) (auto-normalized to metric tonnes)
 * - Preferred axle load: metric tonnes (t)
 * - Alternative axle load: kilograms (kg) (auto-normalized to metric tonnes)
 */
export interface VehicleRoutingProfile {
  vehicleId?: string;
  category?: 'HEAVY_GOODS' | 'MEDIUM_DUTY' | 'LIGHT_COMMERCIAL' | 'VAN' | string;
  profile?: 'driving-car' | 'driving-hgv';

  // Dimensions (meters)
  lengthMeters?: number;
  widthMeters?: number;
  heightMeters?: number;

  // Alternative dimensions (millimeters)
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;

  // Weight (metric tonnes)
  weightTonnes?: number;
  axleLoadTonnes?: number;

  // Alternative weight (kg or grams)
  weightKg?: number;
  weightGrams?: number;
  axleLoadKg?: number;

  isHazardous?: boolean;
}

/**
 * Normalized vehicle restrictions in exact units expected by routing providers:
 * - Dimensions: meters (m)
 * - Weights: metric tonnes (t)
 * - Hazmat: boolean
 */
export interface NormalizedVehicleRestrictions {
  lengthMeters?: number;
  widthMeters?: number;
  heightMeters?: number;
  weightTonnes?: number;
  axleLoadTonnes?: number;
  isHazardous: boolean;
}

/**
 * Normalizes physical vehicle profile values into provider units (meters and metric tonnes).
 */
export function normalizeVehicleProfile(profile?: VehicleRoutingProfile): NormalizedVehicleRestrictions {
  if (!profile) {
    return { isHazardous: false };
  }

  // Length in meters
  let lengthMeters: number | undefined = undefined;
  if (profile.lengthMeters !== undefined && profile.lengthMeters !== null) {
    lengthMeters = Number(profile.lengthMeters);
  } else if (profile.lengthMm !== undefined && profile.lengthMm !== null) {
    lengthMeters = Number(profile.lengthMm) / 1000.0;
  }

  // Width in meters
  let widthMeters: number | undefined = undefined;
  if (profile.widthMeters !== undefined && profile.widthMeters !== null) {
    widthMeters = Number(profile.widthMeters);
  } else if (profile.widthMm !== undefined && profile.widthMm !== null) {
    widthMeters = Number(profile.widthMm) / 1000.0;
  }

  // Height in meters
  let heightMeters: number | undefined = undefined;
  if (profile.heightMeters !== undefined && profile.heightMeters !== null) {
    heightMeters = Number(profile.heightMeters);
  } else if (profile.heightMm !== undefined && profile.heightMm !== null) {
    heightMeters = Number(profile.heightMm) / 1000.0;
  }

  // Weight in metric tonnes
  let weightTonnes: number | undefined = undefined;
  if (profile.weightTonnes !== undefined && profile.weightTonnes !== null) {
    weightTonnes = Number(profile.weightTonnes);
  } else if (profile.weightKg !== undefined && profile.weightKg !== null) {
    weightTonnes = Number(profile.weightKg) / 1000.0;
  } else if (profile.weightGrams !== undefined && profile.weightGrams !== null) {
    weightTonnes = Number(profile.weightGrams) / 1000000.0;
  }

  // Axle load in metric tonnes
  let axleLoadTonnes: number | undefined = undefined;
  if (profile.axleLoadTonnes !== undefined && profile.axleLoadTonnes !== null) {
    axleLoadTonnes = Number(profile.axleLoadTonnes);
  } else if (profile.axleLoadKg !== undefined && profile.axleLoadKg !== null) {
    axleLoadTonnes = Number(profile.axleLoadKg) / 1000.0;
  }

  return {
    lengthMeters: lengthMeters && Number.isFinite(lengthMeters) && lengthMeters > 0 ? lengthMeters : undefined,
    widthMeters: widthMeters && Number.isFinite(widthMeters) && widthMeters > 0 ? widthMeters : undefined,
    heightMeters: heightMeters && Number.isFinite(heightMeters) && heightMeters > 0 ? heightMeters : undefined,
    weightTonnes: weightTonnes && Number.isFinite(weightTonnes) && weightTonnes > 0 ? weightTonnes : undefined,
    axleLoadTonnes:
      axleLoadTonnes && Number.isFinite(axleLoadTonnes) && axleLoadTonnes > 0 ? axleLoadTonnes : undefined,
    isHazardous: Boolean(profile.isHazardous),
  };
}

/**
 * General routing options and road constraint preferences.
 */
export interface RouteOptions {
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  geometryFormat?: 'GEOJSON' | 'ENCODED_POLYLINE';
  language?: string;
}

/**
 * Route request payload submitted to a RoutingProvider.
 */
export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
  waypoints?: Coordinate[];
  vehicleProfile?: VehicleRoutingProfile;
  options?: RouteOptions;
}

/**
 * Spatial route geometry representation.
 */
export interface RouteGeometry {
  format: 'GEOJSON' | 'ENCODED_POLYLINE' | 'COORDINATES';
  coordinates?: [number, number][]; // [longitude, latitude] GeoJSON coordinate pairs
  encodedPolyline?: string;
}

/**
 * Granular navigation instruction / step within a leg segment.
 */
export interface RouteStep {
  distanceMeters: number;
  durationSeconds: number;
  instruction?: string;
  name?: string;
  type?: number;
}

/**
 * Route segment connecting intermediate points.
 */
export interface RouteSegment {
  distanceMeters: number;
  durationSeconds: number;
  steps?: RouteStep[];
}

/**
 * Trajectory leg connecting consecutive stops (e.g. Origin -> Waypoint 1, or Waypoint 1 -> Destination).
 */
export interface RouteLeg {
  origin: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  durationSeconds: number; // Provider travel duration (NOT live traffic ETA)
  segments?: RouteSegment[];
  geometry?: RouteGeometry;
}

/**
 * Rich audit metadata accompanying a calculated route.
 */
export interface RouteMetadata {
  timestamp: string;
  isTrafficAware: false; // Explicitly declared: live traffic is not calculated in this phase
  appliedProfile: string;
  appliedVehicleConstraints?: Record<string, unknown>;
  unsupportedVehicleConstraints?: string[];
  [key: string]: unknown;
}

/**
 * Normalized route result returned by any RoutingProvider.
 */
export interface RouteResult {
  success: boolean;
  distanceMeters: number;
  durationSeconds: number; // Provider travel duration (NOT live traffic ETA)
  geometry: RouteGeometry;
  legs: RouteLeg[];
  segments?: RouteSegment[];
  provider: string;
  providerVersion?: string;
  metadata: RouteMetadata;
}

/**
 * Routing error codes indicating exact operational failure modes.
 */
export type RoutingErrorCode =
  | 'INVALID_COORDINATE'
  | 'MISSING_COORDINATE'
  | 'INVALID_ROUTE_REQUEST'
  | 'NO_ROUTE_FOUND'
  | 'PROVIDER_AUTHENTICATION_ERROR'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_BAD_RESPONSE'
  | 'PROVIDER_UNSUPPORTED_REQUEST'
  | 'ROUTING_CONFIGURATION_ERROR';

/**
 * Domain-level routing error mapped to HTTP statuses without leaking internal credentials.
 */
export class RoutingError extends AppError {
  public readonly routingCode: RoutingErrorCode;

  constructor(
    message: string,
    routingCode: RoutingErrorCode,
    statusCode = 400,
    details?: Record<string, string[]>,
  ) {
    // Sanitize message to prevent accidental leakage of sensitive tokens or keys
    const sanitizedMessage = message.replace(/(?:key|token|auth)=[^&\s]+/gi, 'key=***');
    super(sanitizedMessage, statusCode, routingCode, details);
    this.routingCode = routingCode;
  }
}

/**
 * Capabilities declared by a concrete routing provider.
 */
export interface RoutingCapabilities {
  supportedProfiles: ('driving-car' | 'driving-hgv')[];
  supportsMultiStop: boolean;
  supportsWaypoints: boolean;
  supportsVehicleDimensions: boolean;
  supportsVehicleWeight: boolean;
  supportsHazardousRestrictions: boolean;
  maxCoordinates: number;
}
