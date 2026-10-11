import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../core/errors/app.error';
import {
  Coordinate,
  RouteOptions,
  RouteRequest,
  RouteResult,
  RoutingCapabilities,
  RoutingError,
  validateCoordinate,
  VehicleRoutingProfile,
} from '../domain/routing/types';
import { RoutingProvider } from '../domain/routing/RoutingProvider';
import { OpenRouteServiceProvider } from '../infrastructure/routing/OpenRouteServiceProvider';

/**
 * Parameters for calculating a route based on a database Shipment.
 */
export interface CalculateShipmentRouteInput {
  shipmentId: string;
  vehicleProfile?: VehicleRoutingProfile;
  options?: RouteOptions;
}

/**
 * Application service for calculating road routes.
 *
 * Responsibilities:
 * - Decoupled from any specific concrete routing provider through RoutingProvider interface.
 * - Strict tenant isolation on database shipment entity access.
 * - Validation of input coordinates, stop sequences, and parameters.
 * - Strict preservation of multi-stop sequence order (no reordering or TSP heuristic in this phase).
 * - Zero straight-line or fake distance fallback.
 * - Provider duration is exposed as routing duration, not live traffic ETA.
 */
export class RoutingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly organizationId: string,
    private readonly provider: RoutingProvider = new OpenRouteServiceProvider(),
  ) {}

  /**
   * Direct route calculation from caller-provided coordinates.
   */
  public async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    if (!request) {
      throw new RoutingError('RouteRequest payload is required', 'INVALID_ROUTE_REQUEST', 400);
    }

    if (!request.origin) {
      throw new RoutingError('Route request is missing origin coordinate', 'MISSING_COORDINATE', 400);
    }

    if (!request.destination) {
      throw new RoutingError('Route request is missing destination coordinate', 'MISSING_COORDINATE', 400);
    }

    // Validate coordinates
    validateCoordinate(request.origin, 'Origin');
    validateCoordinate(request.destination, 'Destination');

    if (request.waypoints && Array.isArray(request.waypoints)) {
      request.waypoints.forEach((wp, idx) => validateCoordinate(wp, `Waypoint ${idx + 1}`));
    }

    return this.provider.route(request);
  }

  /**
   * Calculates a road route using the ordered stops of an existing Shipment.
   * Enforces tenant isolation: will throw NotFoundError (404) if shipment belongs to another tenant.
   */
  public async calculateRouteForShipment(input: CalculateShipmentRouteInput): Promise<RouteResult> {
    if (!input?.shipmentId) {
      throw new RoutingError('shipmentId is required', 'INVALID_ROUTE_REQUEST', 400);
    }

    // 1. Fetch shipment with ordered stops under strict tenant isolation
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: input.shipmentId,
        organizationId: this.organizationId,
      },
      include: {
        stops: {
          orderBy: { stopSequence: 'asc' },
        },
      },
    });

    if (!shipment) {
      // Return 404 to avoid leaking existence of another tenant's shipment
      throw new NotFoundError('Shipment');
    }

    // 2. Validate shipment stops
    if (!shipment.stops || shipment.stops.length < 2) {
      throw new RoutingError(
        `Shipment ${shipment.shipmentNumber} must contain at least 2 stops (origin and destination) for route calculation. Found: ${shipment.stops?.length ?? 0}`,
        'INVALID_ROUTE_REQUEST',
        400,
      );
    }

    // 3. Extract and validate coordinates for each stop in sequence
    const coordinates: Coordinate[] = shipment.stops.map((stop) => {
      if (stop.latitude === null || stop.latitude === undefined) {
        throw new RoutingError(
          `Shipment stop sequence ${stop.stopSequence} is missing latitude coordinate`,
          'MISSING_COORDINATE',
          400,
        );
      }

      if (stop.longitude === null || stop.longitude === undefined) {
        throw new RoutingError(
          `Shipment stop sequence ${stop.stopSequence} is missing longitude coordinate`,
          'MISSING_COORDINATE',
          400,
        );
      }

      const latNum = Number(stop.latitude);
      const lonNum = Number(stop.longitude);

      return validateCoordinate(
        { latitude: latNum, longitude: lonNum },
        `Shipment stop sequence ${stop.stopSequence}`,
      );
    });

    // 4. Construct RouteRequest preserving exact stop sequence order
    // Stop order is guaranteed to match stopSequence ascending
    const origin = coordinates[0];
    const destination = coordinates[coordinates.length - 1];
    const waypoints = coordinates.slice(1, coordinates.length - 1);

    const routeRequest: RouteRequest = {
      origin,
      destination,
      waypoints: waypoints.length > 0 ? waypoints : undefined,
      vehicleProfile: input.vehicleProfile,
      options: input.options,
    };

    return this.provider.route(routeRequest);
  }

  /**
   * Returns capabilities supported by the active routing provider.
   */
  public getProviderCapabilities(): RoutingCapabilities {
    return this.provider.getCapabilities();
  }

  /**
   * Returns name of the active routing provider.
   */
  public getProviderName(): string {
    return this.provider.name;
  }
}
