import { TrafficProvider } from '../../domain/traffic/TrafficProvider';
import { TrafficAssessment, TrafficContext, TrafficError } from '../../domain/traffic/types';

/**
 * Baseline traffic provider.
 *
 * Used as a safe, transparent fallback boundary when CarbonIQ does not have an active
 * live-traffic provider integration configured.
 *
 * Guarantees:
 * - Uses approved base route duration.
 * - Explicitly sets status to 'BASELINE'.
 * - Sets isLive = false and isPredicted = false.
 * - Sets trafficDelay = 0.
 * - Under NO circumstances labels output as live traffic or real-time ETA.
 */
export class BaselineTrafficProvider implements TrafficProvider {
  public readonly name = 'BaselineTrafficProvider';
  public readonly version = 'v1.0.0';
  public readonly isLiveCapable = false;

  public async assessTraffic(context: TrafficContext): Promise<TrafficAssessment> {
    if (!context?.route) {
      throw new TrafficError('Missing route in traffic assessment context', 'INVALID_ROUTE_PAYLOAD', 400);
    }

    const baseDuration = Number(context.route.durationSeconds);
    if (!Number.isFinite(baseDuration) || baseDuration < 0) {
      throw new TrafficError(
        `Invalid route base duration: ${context.route.durationSeconds}`,
        'INVALID_TRAFFIC_DURATION',
        400,
      );
    }

    const durationSeconds = Math.round(baseDuration);

    return {
      status: 'BASELINE',
      isLive: false,
      isPredicted: false,
      baseDurationSeconds: durationSeconds,
      trafficDurationSeconds: durationSeconds,
      trafficDelaySeconds: 0,
      source: `${context.route.provider ?? 'Routing'}/Baseline`,
      congestionLevel: 'FREE_FLOW',
      metadata: {
        providerDurationOnly: true,
        trafficCapability: 'NONE',
        appliedProfile: context.route.metadata?.appliedProfile,
      },
    };
  }
}
