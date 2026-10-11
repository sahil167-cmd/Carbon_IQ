import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../core/errors/app.error';
import { RouteResult, VehicleRoutingProfile } from '../domain/routing/types';
import { RoutingService } from './RoutingService';
import { TrafficProvider } from '../domain/traffic/TrafficProvider';
import {
  CongestionLevel,
  TrafficContext,
  TrafficError,
  TrafficETAResult,
} from '../domain/traffic/types';
import { BaselineTrafficProvider } from '../infrastructure/traffic/BaselineTrafficProvider';

/**
 * Parameters for direct ETA calculation from a calculated route.
 */
export interface CalculateETAParams {
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
 * Parameters for calculating ETA directly from a database Shipment.
 */
export interface CalculateShipmentETAParams {
  shipmentId: string;
  departureTime?: Date | string;
  vehicleProfile?: VehicleRoutingProfile;
  routingService?: RoutingService;
}

/**
 * Application service for calculating traffic-aware travel times and ETAs.
 *
 * Distinct from Routing:
 * - Routing calculates which road, spatial geometry, distance, and base duration.
 * - TrafficETA enriches the route with congestion delays and departure-time-adjusted ETA.
 *
 * Guarantees:
 * - Provider-independent: works with any TrafficProvider implementation.
 * - Explicitly represents BASELINE, LIVE, PREDICTED, and UNAVAILABLE states.
 * - Never claims base routing duration is live traffic.
 * - Enforces tenant isolation on database shipment queries.
 */
export class TrafficETAService {
  constructor(
    private readonly prisma?: PrismaClient,
    private readonly organizationId?: string,
    private readonly provider: TrafficProvider = new BaselineTrafficProvider(),
  ) {}

  /**
   * Enriches an existing RouteResult with traffic assessment and computes the final ETA.
   */
  public async calculateETA(params: CalculateETAParams): Promise<TrafficETAResult> {
    if (!params) {
      throw new TrafficError('Missing parameters for calculateETA', 'INVALID_ROUTE_PAYLOAD', 400);
    }

    // 1. Validate route payload
    if (!params.route) {
      throw new TrafficError('RouteResult is required for traffic and ETA calculation', 'INVALID_ROUTE_PAYLOAD', 400);
    }

    if (!params.route.success) {
      throw new TrafficError(
        'Cannot calculate ETA for an unsuccessful route result',
        'INVALID_ROUTE_PAYLOAD',
        400,
      );
    }

    const baseDistance = Number(params.route.distanceMeters);
    const baseDuration = Number(params.route.durationSeconds);

    if (!Number.isFinite(baseDistance) || baseDistance < 0) {
      throw new TrafficError(
        `Invalid route distance: ${params.route.distanceMeters}`,
        'INVALID_ROUTE_PAYLOAD',
        400,
      );
    }

    if (!Number.isFinite(baseDuration) || baseDuration < 0) {
      throw new TrafficError(
        `Invalid route base duration: ${params.route.durationSeconds}`,
        'INVALID_TRAFFIC_DURATION',
        400,
      );
    }

    // 2. Validate and normalize departure time
    let departureDate: Date;
    if (params.departureTime) {
      departureDate =
        params.departureTime instanceof Date
          ? params.departureTime
          : new Date(params.departureTime);

      if (isNaN(departureDate.getTime())) {
        throw new TrafficError(
          `Invalid departure time format: ${params.departureTime}`,
          'INVALID_DEPARTURE_TIME',
          400,
        );
      }
    } else {
      departureDate = new Date();
    }

    // 3. Invoke TrafficProvider
    const context: TrafficContext = {
      route: params.route,
      departureTime: departureDate,
      vehicleProfile: params.vehicleProfile,
      options: params.options,
    };

    const assessment = await this.provider.assessTraffic(context);

    // 4. Validate provider assessment metrics
    const trafficDuration = Number(assessment.trafficDurationSeconds);
    if (!Number.isFinite(trafficDuration) || trafficDuration < 0) {
      throw new TrafficError(
        `Traffic provider returned invalid traffic duration: ${assessment.trafficDurationSeconds}`,
        'INVALID_TRAFFIC_DURATION',
        500,
      );
    }

    // 5. Calculate Traffic Delay
    // trafficDelay = trafficDuration - baseDuration (clamped to 0 for favorable/free-flow conditions)
    const rawDelay = trafficDuration - assessment.baseDurationSeconds;
    const trafficDelaySeconds = Math.max(0, Math.round(rawDelay));

    // 6. Calculate Deterministic ETA
    // ETA = departureTime + trafficDurationSeconds
    const etaMs = departureDate.getTime() + Math.round(trafficDuration) * 1000;
    const estimatedTimeOfArrival = new Date(etaMs).toISOString();

    const congestionLevel: CongestionLevel =
      assessment.congestionLevel ??
      (trafficDelaySeconds === 0 ? 'FREE_FLOW' : trafficDelaySeconds > 1800 ? 'HEAVY' : 'MODERATE');

    return {
      success: true,
      route: params.route,
      departureTime: departureDate.toISOString(),
      estimatedTimeOfArrival,
      baseRouteDistanceMeters: Math.round(baseDistance),
      baseDurationSeconds: Math.round(assessment.baseDurationSeconds),
      trafficDurationSeconds: Math.round(trafficDuration),
      trafficDelaySeconds,
      status: assessment.status,
      isLiveTraffic: Boolean(assessment.isLive),
      source: assessment.source,
      congestionLevel,
      assessment,
      metadata: {
        calculatedAt: new Date().toISOString(),
        isTrafficAware: Boolean(assessment.isLive || assessment.isPredicted),
        departureTimeIso: departureDate.toISOString(),
        etaIso: estimatedTimeOfArrival,
        rawDelaySeconds: Math.round(rawDelay),
        trafficProviderName: this.provider.name,
      },
    };
  }

  /**
   * Calculates a road route for a shipment and enriches it with traffic-aware ETA.
   * Enforces tenant isolation on the shipment lookup.
   */
  public async calculateShipmentETA(params: CalculateShipmentETAParams): Promise<TrafficETAResult> {
    if (!this.prisma || !this.organizationId) {
      throw new TrafficError(
        'Prisma client and organizationId are required for shipment ETA calculation',
        'TRAFFIC_PROVIDER_ERROR',
        500,
      );
    }

    if (!params?.shipmentId) {
      throw new TrafficError('shipmentId is required', 'INVALID_ROUTE_PAYLOAD', 400);
    }

    // 1. Fetch shipment under strict tenant isolation
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: params.shipmentId,
        organizationId: this.organizationId,
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    // 2. Obtain route using RoutingService
    const routingService =
      params.routingService ?? new RoutingService(this.prisma, this.organizationId);

    const routeResult = await routingService.calculateRouteForShipment({
      shipmentId: params.shipmentId,
      vehicleProfile: params.vehicleProfile,
    });

    // 3. Determine departure time (explicit param, planned pickup date, or now)
    const departureTime =
      params.departureTime ?? shipment.plannedPickupDate ?? new Date();

    // 4. Calculate ETA
    return this.calculateETA({
      route: routeResult,
      departureTime,
      vehicleProfile: params.vehicleProfile,
    });
  }

  /**
   * Returns the name of the active traffic provider.
   */
  public getProviderName(): string {
    return this.provider.name;
  }
}
