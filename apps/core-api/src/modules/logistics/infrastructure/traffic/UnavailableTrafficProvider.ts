import { TrafficProvider } from '../../domain/traffic/TrafficProvider';
import { TrafficAssessment, TrafficContext, TrafficError } from '../../domain/traffic/types';

/**
 * Traffic provider representing an unavailable, disabled, or unconfigured traffic subsystem.
 *
 * Guarantees:
 * - Explicitly reports status 'UNAVAILABLE'.
 * - Sets isLive = false and isPredicted = false.
 * - Uses base route duration as conservative fallback.
 * - Records traffic delay = 0.
 */
export class UnavailableTrafficProvider implements TrafficProvider {
  public readonly name = 'UnavailableTrafficProvider';
  public readonly version = 'v1.0.0';
  public readonly isLiveCapable = false;

  constructor(private readonly reason = 'Traffic provider integration is not configured') {}

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
      status: 'UNAVAILABLE',
      isLive: false,
      isPredicted: false,
      baseDurationSeconds: durationSeconds,
      trafficDurationSeconds: durationSeconds,
      trafficDelaySeconds: 0,
      source: 'TrafficService/Unavailable',
      congestionLevel: 'UNKNOWN',
      metadata: {
        reason: this.reason,
        fallbackDurationUsed: true,
      },
    };
  }
}
