import { TrafficAssessment, TrafficContext } from './types';

/**
 * Provider-agnostic interface for traffic assessment and travel time enrichment.
 *
 * Distinct from RoutingProvider:
 * - RoutingProvider answers: Which road/geometry? What is base distance and free-flow duration?
 * - TrafficProvider answers: Given departure time and route, what is current/predicted congestion,
 *   traffic duration, and resulting delay?
 */
export interface TrafficProvider {
  readonly name: string;
  readonly version?: string;
  readonly isLiveCapable: boolean;

  /**
   * Evaluates traffic conditions along the specified route for a given departure time.
   *
   * @param context Route geometry, base duration, departure time, and vehicle context.
   * @returns A promise resolving to the normalized TrafficAssessment.
   */
  assessTraffic(context: TrafficContext): Promise<TrafficAssessment>;
}
