import { Prisma, PrismaClient } from '@prisma/client';
import { TrafficETAService } from '../application/TrafficETAService';
import { TrafficProvider } from '../domain/traffic/TrafficProvider';
import {
  TrafficAssessment,
  TrafficContext,
  TrafficError,
} from '../domain/traffic/types';
import { RouteResult } from '../domain/routing/types';
import { BaselineTrafficProvider } from '../infrastructure/traffic/BaselineTrafficProvider';
import { UnavailableTrafficProvider } from '../infrastructure/traffic/UnavailableTrafficProvider';
import { NotFoundError } from '../../../core/errors/app.error';

describe('Phase 5 — TrafficETAService', () => {
  const orgAlpha = 'org-alpha-logistics-111';
  const orgBeta = 'org-beta-logistics-222';

  const sampleRoute: RouteResult = {
    success: true,
    distanceMeters: 180000,
    durationSeconds: 7200, // 2 hours base duration
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
        distanceMeters: 180000,
        durationSeconds: 7200,
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

  // Mock Prisma database
  const mockDbShipments: any[] = [
    {
      id: 'shp-alpha-traffic',
      organizationId: orgAlpha,
      shipmentNumber: 'SHP-ALPHA-TRAFFIC-1',
      plannedPickupDate: new Date('2026-09-07T09:00:00.000Z'),
      stops: [
        {
          id: 'stop-1',
          shipmentId: 'shp-alpha-traffic',
          stopSequence: 1,
          latitude: new Prisma.Decimal('19.0760000'),
          longitude: new Prisma.Decimal('72.8777000'),
        },
        {
          id: 'stop-2',
          shipmentId: 'shp-alpha-traffic',
          stopSequence: 2,
          latitude: new Prisma.Decimal('18.5204000'),
          longitude: new Prisma.Decimal('73.8567000'),
        },
      ],
    },
    {
      id: 'shp-beta-foreign',
      organizationId: orgBeta,
      shipmentNumber: 'SHP-BETA-FOREIGN-1',
      plannedPickupDate: new Date('2026-09-07T09:00:00.000Z'),
      stops: [],
    },
  ];

  const mockPrisma: any = {
    shipment: {
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          mockDbShipments.find(
            (s) => s.id === where.id && s.organizationId === where.organizationId,
          ) || null
        );
      }),
    },
  };

  // ===========================================================================
  // TEST 1: Baseline ETA calculation using BaselineTrafficProvider
  // ===========================================================================
  it('TEST 1: Baseline ETA calculation using BaselineTrafficProvider', async () => {
    const service = new TrafficETAService(undefined, undefined, new BaselineTrafficProvider());

    const departureTime = '2026-09-07T08:00:00.000Z';
    const result = await service.calculateETA({
      route: sampleRoute,
      departureTime,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('BASELINE');
    expect(result.isLiveTraffic).toBe(false);
    expect(result.baseDurationSeconds).toBe(7200);
    expect(result.trafficDurationSeconds).toBe(7200);
    expect(result.trafficDelaySeconds).toBe(0);

    // 08:00:00 + 7200 seconds (2 hours) = 10:00:00
    expect(result.departureTime).toBe('2026-09-07T08:00:00.000Z');
    expect(result.estimatedTimeOfArrival).toBe('2026-09-07T10:00:00.000Z');
    expect(result.metadata.isTrafficAware).toBe(false);
  });

  // ===========================================================================
  // TEST 2: Live traffic normalization using controlled mock provider
  // ===========================================================================
  it('TEST 2: Live traffic normalization using controlled mock provider', async () => {
    const mockLiveProvider: TrafficProvider = {
      name: 'MockLiveTrafficProvider',
      version: 'v1.0.0',
      isLiveCapable: true,
      assessTraffic: jest.fn(async (ctx: TrafficContext): Promise<TrafficAssessment> => ({
        status: 'LIVE',
        isLive: true,
        isPredicted: false,
        baseDurationSeconds: ctx.route.durationSeconds,
        trafficDurationSeconds: ctx.route.durationSeconds + 1800, // +30 mins delay
        trafficDelaySeconds: 1800,
        source: 'LiveTelemetrySensors',
        congestionLevel: 'HEAVY',
        confidence: 0.95,
      })),
    };

    const service = new TrafficETAService(undefined, undefined, mockLiveProvider);
    const departureTime = '2026-09-07T08:00:00.000Z';

    const result = await service.calculateETA({
      route: sampleRoute,
      departureTime,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('LIVE');
    expect(result.isLiveTraffic).toBe(true);
    expect(result.baseDurationSeconds).toBe(7200);
    expect(result.trafficDurationSeconds).toBe(9000); // 7200 + 1800
    expect(result.trafficDelaySeconds).toBe(1800);

    // 08:00:00 + 9000 seconds (2h 30m) = 10:30:00
    expect(result.estimatedTimeOfArrival).toBe('2026-09-07T10:30:00.000Z');
    expect(result.metadata.isTrafficAware).toBe(true);
    expect(result.congestionLevel).toBe('HEAVY');
  });

  // ===========================================================================
  // TEST 3: Predicted traffic normalization using historical models
  // ===========================================================================
  it('TEST 3: Predicted traffic normalization using historical models', async () => {
    const mockPredictedProvider: TrafficProvider = {
      name: 'MockPredictedTrafficProvider',
      version: 'v1.0.0',
      isLiveCapable: false,
      assessTraffic: jest.fn(async (ctx: TrafficContext): Promise<TrafficAssessment> => ({
        status: 'PREDICTED',
        isLive: false,
        isPredicted: true,
        baseDurationSeconds: ctx.route.durationSeconds,
        trafficDurationSeconds: ctx.route.durationSeconds + 900, // +15 mins predicted delay
        trafficDelaySeconds: 900,
        source: 'HistoricalMLCongestionModel',
        congestionLevel: 'MODERATE',
        confidence: 0.85,
      })),
    };

    const service = new TrafficETAService(undefined, undefined, mockPredictedProvider);
    const departureTime = '2026-09-07T14:00:00.000Z';

    const result = await service.calculateETA({
      route: sampleRoute,
      departureTime,
    });

    expect(result.status).toBe('PREDICTED');
    expect(result.isLiveTraffic).toBe(false);
    expect(result.trafficDelaySeconds).toBe(900);
    // 14:00:00 + 8100 seconds (2h 15m) = 16:15:00
    expect(result.estimatedTimeOfArrival).toBe('2026-09-07T16:15:00.000Z');
    expect(result.metadata.isTrafficAware).toBe(true);
  });

  // ===========================================================================
  // TEST 4: Unavailable traffic provider handling
  // ===========================================================================
  it('TEST 4: Unavailable traffic provider handling', async () => {
    const service = new TrafficETAService(undefined, undefined, new UnavailableTrafficProvider());

    const result = await service.calculateETA({
      route: sampleRoute,
      departureTime: '2026-09-07T08:00:00.000Z',
    });

    expect(result.status).toBe('UNAVAILABLE');
    expect(result.isLiveTraffic).toBe(false);
    expect(result.trafficDelaySeconds).toBe(0);
    expect(result.trafficDurationSeconds).toBe(7200);
    expect(result.estimatedTimeOfArrival).toBe('2026-09-07T10:00:00.000Z');
  });

  // ===========================================================================
  // TEST 5: Provider upstream error handling
  // ===========================================================================
  it('TEST 5: Provider upstream error handling', async () => {
    const errorProvider: TrafficProvider = {
      name: 'FailingTrafficProvider',
      isLiveCapable: true,
      assessTraffic: jest.fn(async () => {
        throw new Error('Connection reset by traffic upstream API');
      }),
    };

    const service = new TrafficETAService(undefined, undefined, errorProvider);

    await expect(
      service.calculateETA({ route: sampleRoute, departureTime: '2026-09-07T08:00:00.000Z' }),
    ).rejects.toThrow('Connection reset by traffic upstream API');
  });

  // ===========================================================================
  // TEST 6: Departure time formats: Date instance, ISO string, or default to now
  // ===========================================================================
  it('TEST 6: Departure time formats: Date instance, ISO string, or default to now', async () => {
    const service = new TrafficETAService(undefined, undefined, new BaselineTrafficProvider());

    // 1. Date instance
    const dateObj = new Date('2026-09-07T10:00:00.000Z');
    const res1 = await service.calculateETA({ route: sampleRoute, departureTime: dateObj });
    expect(res1.departureTime).toBe('2026-09-07T10:00:00.000Z');
    expect(res1.estimatedTimeOfArrival).toBe('2026-09-07T12:00:00.000Z');

    // 2. ISO 8601 string
    const res2 = await service.calculateETA({
      route: sampleRoute,
      departureTime: '2026-09-07T15:00:00.000Z',
    });
    expect(res2.departureTime).toBe('2026-09-07T15:00:00.000Z');
    expect(res2.estimatedTimeOfArrival).toBe('2026-09-07T17:00:00.000Z');

    // 3. Default to now
    const before = Date.now();
    const res3 = await service.calculateETA({ route: sampleRoute });
    const after = Date.now();
    const depMs = new Date(res3.departureTime).getTime();
    expect(depMs).toBeGreaterThanOrEqual(before);
    expect(depMs).toBeLessThanOrEqual(after);
  });

  // ===========================================================================
  // TEST 7: Invalid departure time throws INVALID_DEPARTURE_TIME
  // ===========================================================================
  it('TEST 7: Invalid departure time throws INVALID_DEPARTURE_TIME', async () => {
    const service = new TrafficETAService(undefined, undefined, new BaselineTrafficProvider());

    await expect(
      service.calculateETA({ route: sampleRoute, departureTime: 'invalid-date-xyz' }),
    ).rejects.toMatchObject({
      trafficCode: 'INVALID_DEPARTURE_TIME',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 8: Zero traffic delay when trafficDuration equals baseDuration
  // ===========================================================================
  it('TEST 8: Zero traffic delay when trafficDuration equals baseDuration', async () => {
    const mockProvider: TrafficProvider = {
      name: 'ZeroDelayProvider',
      isLiveCapable: true,
      assessTraffic: jest.fn(async (ctx: TrafficContext): Promise<TrafficAssessment> => ({
        status: 'LIVE',
        isLive: true,
        isPredicted: false,
        baseDurationSeconds: ctx.route.durationSeconds,
        trafficDurationSeconds: ctx.route.durationSeconds,
        trafficDelaySeconds: 0,
        source: 'LiveTelemetry',
        congestionLevel: 'FREE_FLOW',
      })),
    };

    const service = new TrafficETAService(undefined, undefined, mockProvider);
    const result = await service.calculateETA({
      route: sampleRoute,
      departureTime: '2026-09-07T08:00:00.000Z',
    });

    expect(result.trafficDelaySeconds).toBe(0);
    expect(result.congestionLevel).toBe('FREE_FLOW');
  });

  // ===========================================================================
  // TEST 9: Favorable conditions when trafficDuration < baseDuration clamps delay to 0
  // ===========================================================================
  it('TEST 9: Favorable conditions when trafficDuration < baseDuration clamps delay to 0', async () => {
    const mockFasterProvider: TrafficProvider = {
      name: 'NightFreeFlowProvider',
      isLiveCapable: true,
      assessTraffic: jest.fn(async (ctx: TrafficContext): Promise<TrafficAssessment> => ({
        status: 'LIVE',
        isLive: true,
        isPredicted: false,
        baseDurationSeconds: ctx.route.durationSeconds,
        trafficDurationSeconds: ctx.route.durationSeconds - 600, // -10 mins faster at night!
        trafficDelaySeconds: 0,
        source: 'NightSensors',
        congestionLevel: 'FREE_FLOW',
      })),
    };

    const service = new TrafficETAService(undefined, undefined, mockFasterProvider);
    const result = await service.calculateETA({
      route: sampleRoute,
      departureTime: '2026-09-07T02:00:00.000Z',
    });

    // Delay must be clamped to 0 (no delay), and ETA reflects actual faster travel time
    expect(result.trafficDelaySeconds).toBe(0);
    expect(result.trafficDurationSeconds).toBe(6600); // 7200 - 600
    // 02:00:00 + 6600s (1h 50m) = 03:50:00
    expect(result.estimatedTimeOfArrival).toBe('2026-09-07T03:50:00.000Z');
  });

  // ===========================================================================
  // TEST 10: Invalid duration throws INVALID_TRAFFIC_DURATION
  // ===========================================================================
  it('TEST 10: Invalid duration throws INVALID_TRAFFIC_DURATION', async () => {
    const service = new TrafficETAService(undefined, undefined, new BaselineTrafficProvider());

    const badRoute = { ...sampleRoute, durationSeconds: -100 };
    await expect(service.calculateETA({ route: badRoute })).rejects.toMatchObject({
      trafficCode: 'INVALID_TRAFFIC_DURATION',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 11: Deterministic results on identical inputs
  // ===========================================================================
  it('TEST 11: Deterministic results on identical inputs', async () => {
    const service = new TrafficETAService(undefined, undefined, new BaselineTrafficProvider());

    const departureTime = '2026-09-07T08:30:00.000Z';
    const run1 = await service.calculateETA({ route: sampleRoute, departureTime });
    const run2 = await service.calculateETA({ route: sampleRoute, departureTime });

    expect(run1.departureTime).toBe(run2.departureTime);
    expect(run1.estimatedTimeOfArrival).toBe(run2.estimatedTimeOfArrival);
    expect(run1.trafficDelaySeconds).toBe(run2.trafficDelaySeconds);
    expect(run1.trafficDurationSeconds).toBe(run2.trafficDurationSeconds);
  });

  // ===========================================================================
  // TEST 12: Tenant isolation on shipment ETA lookup
  // ===========================================================================
  it('TEST 12: Tenant isolation on shipment ETA lookup throws NotFoundError (404)', async () => {
    const serviceAlpha = new TrafficETAService(
      mockPrisma as PrismaClient,
      orgAlpha,
      new BaselineTrafficProvider(),
    );

    // Alpha attempts to calculate ETA for Beta's shipment
    await expect(
      serviceAlpha.calculateShipmentETA({ shipmentId: 'shp-beta-foreign' }),
    ).rejects.toThrow(NotFoundError);
  });

  // ===========================================================================
  // TEST 13: Secret sanitization: errors never expose credentials
  // ===========================================================================
  it('TEST 13: Secret sanitization: errors never expose credentials', () => {
    const err = new TrafficError(
      'Failure contacting upstream with auth=secret-token-value-12345',
      'TRAFFIC_PROVIDER_ERROR',
      500,
    );

    expect(err.message).not.toContain('secret-token-value-12345');
    expect(err.message).toContain('auth=***');
  });
});
