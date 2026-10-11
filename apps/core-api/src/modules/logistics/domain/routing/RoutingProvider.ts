import { RouteRequest, RouteResult, RoutingCapabilities } from './types';

/**
 * Provider-agnostic routing interface.
 * Decouples the CarbonIQ logistics application from specific mapping providers
 * (e.g., OpenRouteService, OSRM, HERE, Google Maps).
 */
export interface RoutingProvider {
  readonly name: string;
  readonly version?: string;

  /**
   * Calculates a road-network route between specified origin, destination, and waypoints.
   *
   * @param request The normalized route request.
   * @returns A promise resolving to the normalized RouteResult.
   * @throws RoutingError on configuration, network, timeout, or provider failure.
   */
  route(request: RouteRequest): Promise<RouteResult>;

  /**
   * Returns capabilities supported by this routing provider.
   */
  getCapabilities(): RoutingCapabilities;
}
