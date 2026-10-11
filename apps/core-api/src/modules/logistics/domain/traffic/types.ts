import { AppError } from '../../../../core/errors/app.error';
import { RouteResult, VehicleRoutingProfile } from '../routing/types';

/**
 * Traffic awareness operational status.
 *
 * - BASELINE: Base provider routing duration without live or predicted traffic data.
 * - LIVE: Real-time road network telemetry and live congestion sensors.
 * - PREDICTED: Historical machine learning or time-of-day statistical models.
 * - UNAVAILABLE: Traffic provider could not be reached or traffic service is unconfigured.
 * - ERROR: Provider encountered an upstream failure during traffic evaluation.
 */
export type TrafficStatus = 'BASELINE' | 'LIVE' | 'PREDICTED' | 'UNAVAILABLE' | 'ERROR';

/**
 * Categorized level of road congestion.
 */
export type CongestionLevel =
  | 'UNKNOWN'
  | 'FREE_FLOW'
  | 'LIGHT'
  | 'MODERATE'
  | 'HEAVY'
  | 'SEVERE';

/**
 * Input context provided to a TrafficProvider for traffic and delay assessment.
 */
export interface TrafficContext {
  route: RouteResult;
  departureTime?: Date | string;
  vehicleProfile?: VehicleRoutingProfile;
  options?: {
    timeZone?: string;
    optimistic?: boolean;
    pessimistic?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Normalized output produced by any TrafficProvider.
 */
export interface TrafficAssessment {
  status: TrafficStatus;
  isLive: boolean;
  isPredicted: boolean;
  baseDurationSeconds: number;
  trafficDurationSeconds: number;
  trafficDelaySeconds: number;
  confidence?: number; // 0.0 - 1.0 confidence score if supplied by provider
  source: string;
  congestionLevel?: CongestionLevel;
  metadata?: Record<string, unknown>;
}

/**
 * Comprehensive traffic-enriched ETA result for logistics execution.
 */
export interface TrafficETAResult {
  success: boolean;
  route: RouteResult;
  departureTime: string; // ISO 8601 string
  estimatedTimeOfArrival: string; // ISO 8601 string (departureTime + trafficDurationSeconds)
  baseRouteDistanceMeters: number;
  baseDurationSeconds: number;
  trafficDurationSeconds: number;
  trafficDelaySeconds: number;
  status: TrafficStatus;
  isLiveTraffic: boolean;
  source: string;
  congestionLevel: CongestionLevel;
  assessment: TrafficAssessment;
  metadata: {
    calculatedAt: string;
    isTrafficAware: boolean;
    departureTimeIso: string;
    etaIso: string;
    [key: string]: unknown;
  };
}

/**
 * Traffic domain error codes.
 */
export type TrafficErrorCode =
  | 'INVALID_DEPARTURE_TIME'
  | 'INVALID_ROUTE_PAYLOAD'
  | 'TRAFFIC_PROVIDER_ERROR'
  | 'TRAFFIC_PROVIDER_UNAVAILABLE'
  | 'INVALID_TRAFFIC_DURATION';

/**
 * Domain-level traffic error mapped to HTTP status codes.
 */
export class TrafficError extends AppError {
  public readonly trafficCode: TrafficErrorCode;

  constructor(
    message: string,
    trafficCode: TrafficErrorCode,
    statusCode = 400,
    details?: Record<string, string[]>,
  ) {
    // Sanitize any potential keys, tokens, or auth headers in message
    const sanitized = message.replace(/(key|token|auth)=[^&\s]+/gi, '$1=***');
    super(sanitized, statusCode, trafficCode, details);
    this.trafficCode = trafficCode;
  }
}
