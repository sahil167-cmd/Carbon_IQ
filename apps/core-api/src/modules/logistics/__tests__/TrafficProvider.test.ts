import { BaselineTrafficProvider } from '../infrastructure/traffic/BaselineTrafficProvider';
import { UnavailableTrafficProvider } from '../infrastructure/traffic/UnavailableTrafficProvider';
import { RouteResult } from '../domain/routing/types';
import { TrafficContext, TrafficError } from '../domain/traffic/types';

describe('Phase 5 — TrafficProvider Infrastructure', () => {
  const sampleRoute: RouteResult = {
    success: true,
    distanceMeters: 148250,
    durationSeconds: 11420, // 3h 10m 20s
    geometry: {
      format: 'GEOJSON',
      coordinates: [
        [72.8777, 19.076],
        [73.8567, 18.5204],
      ],
    },
    legs: [
      {
        origin: { latitude: 19.076, longitude: 72.8777 },
        destination: { latitude: 18.5204, longitude: 73.8567 },
        distanceMeters: 148250,
        durationSeconds: 11420,
      },
    ],
    provider: 'OpenRouteService',
    providerVersion: 'v2',
    metadata: {
      timestamp: '2026-09-06T12:00:00.000Z',
      isTrafficAware: false,
      appliedProfile: 'driving-hgv',
    },
  };

  // ===========================================================================
  // TEST 1: BaselineTrafficProvider returns status BASELINE, isLive=false, delay=0
  // ===========================================================================
  it('TEST 1: BaselineTrafficProvider returns status BASELINE, isLive=false, delay=0', async () => {
    const provider = new BaselineTrafficProvider();
    expect(provider.isLiveCapable).toBe(false);

    const context: TrafficContext = {
      route: sampleRoute,
      departureTime: new Date('2026-09-07T08:00:00.000Z'),
    };

    const assessment = await provider.assessTraffic(context);

    expect(assessment.status).toBe('BASELINE');
    expect(assessment.isLive).toBe(false);
    expect(assessment.isPredicted).toBe(false);
    expect(assessment.baseDurationSeconds).toBe(11420);
    expect(assessment.trafficDurationSeconds).toBe(11420);
    expect(assessment.trafficDelaySeconds).toBe(0);
    expect(assessment.congestionLevel).toBe('FREE_FLOW');
    expect(assessment.source).toContain('OpenRouteService');
  });

  // ===========================================================================
  // TEST 2: BaselineTrafficProvider throws on missing route or negative duration
  // ===========================================================================
  it('TEST 2: BaselineTrafficProvider throws on missing route or negative duration', async () => {
    const provider = new BaselineTrafficProvider();

    await expect(provider.assessTraffic({ route: null as any })).rejects.toMatchObject({
      trafficCode: 'INVALID_ROUTE_PAYLOAD',
      statusCode: 400,
    });

    const invalidDurationRoute = { ...sampleRoute, durationSeconds: -500 };
    await expect(provider.assessTraffic({ route: invalidDurationRoute })).rejects.toMatchObject({
      trafficCode: 'INVALID_TRAFFIC_DURATION',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 3: UnavailableTrafficProvider returns status UNAVAILABLE, isLive=false
  // ===========================================================================
  it('TEST 3: UnavailableTrafficProvider returns status UNAVAILABLE, isLive=false', async () => {
    const provider = new UnavailableTrafficProvider('External traffic provider offline');
    expect(provider.isLiveCapable).toBe(false);

    const context: TrafficContext = {
      route: sampleRoute,
      departureTime: new Date('2026-09-07T08:00:00.000Z'),
    };

    const assessment = await provider.assessTraffic(context);

    expect(assessment.status).toBe('UNAVAILABLE');
    expect(assessment.isLive).toBe(false);
    expect(assessment.isPredicted).toBe(false);
    expect(assessment.baseDurationSeconds).toBe(11420);
    expect(assessment.trafficDurationSeconds).toBe(11420);
    expect(assessment.trafficDelaySeconds).toBe(0);
    expect(assessment.congestionLevel).toBe('UNKNOWN');
    expect(assessment.metadata?.reason).toBe('External traffic provider offline');
  });

  // ===========================================================================
  // TEST 4: UnavailableTrafficProvider throws on missing route
  // ===========================================================================
  it('TEST 4: UnavailableTrafficProvider throws on missing route', async () => {
    const provider = new UnavailableTrafficProvider();

    await expect(provider.assessTraffic({ route: null as any })).rejects.toMatchObject({
      trafficCode: 'INVALID_ROUTE_PAYLOAD',
      statusCode: 400,
    });
  });
});
