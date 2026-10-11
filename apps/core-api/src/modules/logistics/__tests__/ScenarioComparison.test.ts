import request from 'supertest';
import { createApp } from '../../../app';
import { getPrismaClient } from '../../../core/repository/tenant-scoped.repository';
import { UnauthorizedError } from '../../../core/errors/app.error';
import { ScenarioComparisonEngine } from '../domain/comparison/ScenarioComparisonEngine';
import { EvaluatedScenarioSummary } from '../domain/comparison/types';
import { ScenarioComparisonService } from '../application/ScenarioComparisonService';

jest.mock('../../../queues/queue.init', () => ({
  aiQueue: { add: jest.fn() },
  calcQueue: { add: jest.fn() },
  redisClient: {
    call: jest.fn().mockResolvedValue([1, 1000]),
    status: 'ready',
    on: jest.fn(),
  },
}));

jest.mock('../../../core/middleware/rate-limiter.middleware', () => ({
  generalRateLimiter: (_req: any, _res: any, next: any) => next(),
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  aiHeavyRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../core/middleware/authenticate.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Missing or malformed Authorization header'));
    }
    const token = authHeader.substring(7);
    if (token === 'invalid-token') {
      return next(new UnauthorizedError('Invalid token'));
    }

    const orgId = req.headers['x-test-org-id'] || 'org-tenant-alpha';
    const role = req.headers['x-test-role'] || 'ORG_ADMIN';

    req.user = {
      id: 'user-test-1',
      email: 'logistics-tester@carboniq.io',
      role,
      organizationId: orgId,
    };
    next();
  },
}));

describe('Phase 8 — Scenario Comparison & What-If Optimization', () => {
  const app = createApp();
  const prisma = getPrismaClient();

  const authHeader = { Authorization: 'Bearer valid-token' };
  const crossTenantHeader = {
    Authorization: 'Bearer valid-token',
    'x-test-org-id': 'org-tenant-beta',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Pure Domain ScenarioComparisonEngine Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('ScenarioComparisonEngine (Domain Logic)', () => {
    const baselineMock: EvaluatedScenarioSummary = {
      id: 'run-baseline',
      shipmentId: 'shipment-1',
      scenarioName: 'Baseline Allocation (Heuristic)',
      notes: null,
      isBaseline: true,
      status: 'COMPLETED',
      createdAt: '2026-09-01T10:00:00Z',
      vehicleCount: 4,
      totalLoadedWeightKg: 12000,
      totalLoadedVolumeM3: 45,
      overallPayloadUtilizationPct: 75.0,
      overallVolumeUtilizationPct: 68.0,
      unusedPayloadKg: 4000,
      unusedVolumeM3: 21.2,
      unassignedCargoCount: 0,
      routeDistanceKm: 1420.5,
      routeDurationMinutes: 1240,
      routeFeasibility: 'FEASIBLE',
      totalCo2eKg: 850.4,
      emissionsIntensityGPerTonneKm: 49.9,
      tonneKm: 17046,
      carbonMethodology: 'GLEC_FRAMEWORK_V2_FREIGHT',
      executionTimeMs: 120,
      candidateSolutionsEvaluated: 15,
      optimalityGuarantee: 'HEURISTIC_BOUNDED',
      searchTerminationReason: 'TIME_BUDGET_EXCEEDED',
      parameters: {},
    };

    const targetMock: EvaluatedScenarioSummary = {
      id: 'run-optimized',
      shipmentId: 'shipment-1',
      scenarioName: 'Consolidated High-Cube Scenario',
      notes: null,
      isBaseline: false,
      status: 'COMPLETED',
      createdAt: '2026-09-01T10:05:00Z',
      vehicleCount: 3, // 1 fewer vehicle (favorable)
      totalLoadedWeightKg: 12000,
      totalLoadedVolumeM3: 45,
      overallPayloadUtilizationPct: 88.5, // higher (favorable)
      overallVolumeUtilizationPct: 82.0, // higher (favorable)
      unusedPayloadKg: 1560,
      unusedVolumeM3: 9.8,
      unassignedCargoCount: 0,
      routeDistanceKm: 1435.0, // 14.5 km longer (unfavorable)
      routeDurationMinutes: 1255,
      routeFeasibility: 'FEASIBLE',
      totalCo2eKg: 710.2, // 140.2 kg less emissions (favorable)
      emissionsIntensityGPerTonneKm: 41.2,
      tonneKm: 17220,
      carbonMethodology: 'GLEC_FRAMEWORK_V2_FREIGHT',
      executionTimeMs: 450,
      candidateSolutionsEvaluated: 82,
      optimalityGuarantee: 'EXHAUSTIVE_OPTIMAL',
      searchTerminationReason: 'OPTIMAL_FOUND',
      parameters: { maxVehiclesToConsider: 3 },
    };

    it('should throw if baseline scenario is null or undefined', () => {
      expect(() => ScenarioComparisonEngine.compare(null as any, [targetMock])).toThrow(
        'Baseline scenario is required for comparison',
      );
    });

    it('should perform structured multi-category delta analysis correctly', () => {
      const result = ScenarioComparisonEngine.compare(baselineMock, [targetMock]);

      expect(result.baselineScenario.id).toBe('run-baseline');
      expect(result.comparedScenarios).toHaveLength(1);
      expect(result.categories.length).toBeGreaterThanOrEqual(4);

      // Verify Fleet & Capacity Category
      const fleetCategory = result.categories.find((c) => c.category === 'FLEET_CAPACITY');
      expect(fleetCategory).toBeDefined();

      const vehicleCountMetric = fleetCategory?.metrics.find((m) => m.key === 'vehicleCount');
      expect(vehicleCountMetric).toBeDefined();
      expect(vehicleCountMetric?.baselineValue).toBe(4);
      expect(vehicleCountMetric?.targetValue).toBe(3);
      expect(vehicleCountMetric?.absoluteDelta).toBe(-1);
      expect(vehicleCountMetric?.percentageDelta).toBe(-25);
      expect(vehicleCountMetric?.direction).toBe('FAVORABLE'); // Fewer vehicles is favorable

      // Verify Environmental Category
      const envCategory = result.categories.find((c) => c.category === 'ENVIRONMENTAL');
      const co2Metric = envCategory?.metrics.find((m) => m.key === 'totalCo2eKg');
      expect(co2Metric).toBeDefined();
      expect(co2Metric?.baselineValue).toBe(850.4);
      expect(co2Metric?.targetValue).toBe(710.2);
      expect(co2Metric?.absoluteDelta).toBe(-140.2);
      expect(co2Metric?.direction).toBe('FAVORABLE'); // Lower emissions is favorable

      // Verify Delta Analysis mapped by scenario ID
      expect(result.deltaAnalysis['run-optimized']).toBeDefined();
      expect(result.deltaAnalysis['run-baseline']).toBeDefined();
    });

    it('should handle zero baseline values without division by zero', () => {
      const zeroBaseline: EvaluatedScenarioSummary = {
        ...baselineMock,
        unassignedCargoCount: 0,
      };
      const targetWithSpill: EvaluatedScenarioSummary = {
        ...targetMock,
        unassignedCargoCount: 2,
      };

      const result = ScenarioComparisonEngine.compare(zeroBaseline, [targetWithSpill]);
      const fleetCat = result.categories.find((c) => c.category === 'FLEET_CAPACITY');
      const unassignedMetric = fleetCat?.metrics.find((m) => m.key === 'unassignedCargoCount');

      expect(unassignedMetric?.baselineValue).toBe(0);
      expect(unassignedMetric?.targetValue).toBe(2);
      expect(unassignedMetric?.absoluteDelta).toBe(2);
      expect(unassignedMetric?.percentageDelta).toBeNull(); // Division by zero protected: returns null
      expect(unassignedMetric?.direction).toBe('UNFAVORABLE');
    });

    it('should handle null/missing metrics cleanly without inventing synthetic values', () => {
      const nullMetricBaseline: EvaluatedScenarioSummary = {
        ...baselineMock,
        routeDistanceKm: null,
        totalCo2eKg: null,
      };
      const nullMetricTarget: EvaluatedScenarioSummary = {
        ...targetMock,
        routeDistanceKm: null,
        totalCo2eKg: null,
      };

      const result = ScenarioComparisonEngine.compare(nullMetricBaseline, [nullMetricTarget]);
      const envCat = result.categories.find((c) => c.category === 'ENVIRONMENTAL');
      const co2Metric = envCat?.metrics.find((m) => m.key === 'totalCo2eKg');

      expect(co2Metric?.baselineValue).toBeNull();
      expect(co2Metric?.targetValue).toBeNull();
      expect(co2Metric?.absoluteDelta).toBeNull();
      expect(co2Metric?.percentageDelta).toBeNull();
      expect(co2Metric?.direction).toBe('NEUTRAL');
    });

    it('should generate intelligent trade-off insights for fleet, emissions, and utilization', () => {
      const result = ScenarioComparisonEngine.compare(baselineMock, [targetMock]);

      expect(result.tradeOffs.length).toBeGreaterThan(0);
      // Dominant fleet reduction or trade-off detected
      const fleetTradeOff = result.tradeOffs.find((t) => t.category === 'FLEET_CAPACITY');
      expect(fleetTradeOff).toBeDefined();
      expect(fleetTradeOff?.advantage).toContain('Eliminates 1 vehicle');

      // Carbon vs Routing trade-off
      const envTradeOff = result.tradeOffs.find((t) => t.category === 'ENVIRONMENTAL');
      expect(envTradeOff).toBeDefined();
      expect(envTradeOff?.advantage).toContain('Reduces total emissions by 140.2 kg CO₂e');
      expect(envTradeOff?.compromise).toContain('14.5 km additional transit distance');
    });

    it('should accurately compute winLossSummary and bestScenarioByMetric across scenarios', () => {
      const result = ScenarioComparisonEngine.compare(baselineMock, [targetMock]);

      expect(result.winLossSummary.vehicles.winnerScenarioId).toBe('run-optimized');
      expect(result.winLossSummary.vehicles.winnerValue).toBe(3);
      expect(result.winLossSummary.vehicles.marginDelta).toBe(-1);

      expect(result.winLossSummary.emissions.winnerScenarioId).toBe('run-optimized');
      expect(result.winLossSummary.emissions.winnerValue).toBe(710.2);

      expect(result.winLossSummary.distance.winnerScenarioId).toBe('run-baseline'); // baseline had shorter distance (1420.5 vs 1435)

      expect(result.bestScenarioByMetric.fewestVehicles).toBe('run-optimized');
      expect(result.bestScenarioByMetric.lowestEmissions).toBe('run-optimized');
      expect(result.bestScenarioByMetric.highestUtilization).toBe('run-optimized');
      expect(result.bestScenarioByMetric.shortestDistance).toBe('run-baseline');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Application Service & Tenant Isolation
  // ──────────────────────────────────────────────────────────────────────────
  describe('ScenarioComparisonService (Application Layer)', () => {
    it('should enforce strict tenant isolation and throw 404 for cross-tenant shipment', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue(null);

      const service = new ScenarioComparisonService(prisma, 'org-tenant-alpha');

      await expect(service.listScenariosForShipment('shipment-other-tenant')).rejects.toThrow(
        'Shipment not found',
      );
    });

    it('should throw 404 if baseline scenario does not exist in the shipment', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
        cargoItems: [],
        stops: [],
      } as any);

      jest.spyOn(prisma.optimizationRun, 'findMany').mockResolvedValue([]);

      const service = new ScenarioComparisonService(prisma, 'org-tenant-alpha');

      await expect(
        service.compareScenarios('shipment-1', {
          baselineScenarioId: 'non-existent-baseline',
          targetScenarioIds: ['some-target'],
        }),
      ).rejects.toThrow('Baseline scenario \'non-existent-baseline\' not found');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. API Endpoints (Integration / Presentation)
  // ──────────────────────────────────────────────────────────────────────────
  describe('API Endpoints /shipments/:shipmentId/scenarios', () => {
    const mockShipmentDb = {
      id: 'shipment-abc-123',
      organizationId: 'org-tenant-alpha',
      shipmentNumber: 'SHP-2026-TEST',
      totalWeight: 12000,
      cargoItems: [
        {
          id: 'cargo-1',
          description: 'Industrial Parts',
          quantity: 10,
          length: 1200,
          width: 800,
          height: 1000,
          unitWeight: 50,
        },
      ],
      stops: [
        { stopSequence: 1, latitude: 19.076, longitude: 72.8777 },
        { stopSequence: 2, latitude: 28.7041, longitude: 77.1025 },
      ],
    };

    const mockRunDb = {
      id: 'run-alpha-1',
      organizationId: 'org-tenant-alpha',
      shipmentId: 'shipment-abc-123',
      scenarioName: 'Initial Baseline Scenario',
      runNumber: 1,
      status: 'COMPLETED',
      algorithmVersion: 'v1-3d-binpack',
      baselineTruckCount: 2,
      optimizedTruckCount: 2,
      totalLoadedWeightKg: 10000,
      totalLoadedVolumeM3: 35.5,
      overallVolumeUtilizationPct: 70.0,
      overallWeightUtilizationPct: 80.0,
      unassignedItemsCount: 0,
      violationsCount: 0,
      executionTimeMs: 150,
      createdAt: new Date(),
      updatedAt: new Date(),
      loadPlans: [
        {
          id: 'lp-1',
          optimizationRunId: 'run-alpha-1',
          vehicleSequence: 1,
          loadedWeightKg: 5000,
          loadedVolumeM3: 17.75,
          weightUtilizationPct: 80.0,
          volumeUtilizationPct: 70.0,
          placementsJson: {},
          vehicleType: {
            id: 'vt-1',
            name: 'Tata 407',
            maxPayloadKg: 6000,
            usableVolumeM3: 25.0,
          },
          vehicle: null,
          routePlan: {
            id: 'rp-1',
            distanceKm: 1400.0,
            durationMinutes: 1200,
            calculatedEmissions: null,
          },
        },
      ],
    };

    it('GET /api/v1/logistics/shipments/:shipmentId/scenarios - should list scenarios for shipment', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue(mockShipmentDb as any);
      jest.spyOn(prisma.optimizationRun, 'findMany').mockResolvedValue([mockRunDb] as any);

      const res = await request(app)
        .get(`/api/v1/logistics/shipments/${mockShipmentDb.id}/scenarios`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('run-alpha-1');
      expect(res.body.data[0].vehicleCount).toBe(2);
      expect(res.body.data[0].isBaseline).toBe(true);
    });

    it('GET /api/v1/logistics/shipments/:shipmentId/scenarios - returns 404 for cross-tenant shipment', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/logistics/shipments/${mockShipmentDb.id}/scenarios`)
        .set(crossTenantHeader);

      expect(res.status).toBe(404);
    });

    it('POST /api/v1/logistics/shipments/:shipmentId/scenarios - should validate payload and return 400 if scenarioName is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/logistics/shipments/${mockShipmentDb.id}/scenarios`)
        .set(authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/logistics/shipments/:shipmentId/scenarios/compare - should return full comparison result', async () => {
      const secondRunDb = {
        ...mockRunDb,
        id: 'run-alpha-2',
        scenarioName: 'Max Volume Utilization What-If',
        runNumber: 2,
        optimizedTruckCount: 1,
        totalLoadedWeightKg: 10000,
        totalLoadedVolumeM3: 35.5,
        overallVolumeUtilizationPct: 92.0,
        overallWeightUtilizationPct: 95.0,
      };

      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue(mockShipmentDb as any);
      jest.spyOn(prisma.optimizationRun, 'findMany').mockResolvedValue([secondRunDb, mockRunDb] as any);

      const res = await request(app)
        .post(`/api/v1/logistics/shipments/${mockShipmentDb.id}/scenarios/compare`)
        .set(authHeader)
        .send({
          baselineScenarioId: 'run-alpha-1',
          targetScenarioIds: ['run-alpha-2'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.baselineScenario.id).toBe('run-alpha-1');
      expect(res.body.data.comparedScenarios).toHaveLength(1);
      expect(res.body.data.comparedScenarios[0].id).toBe('run-alpha-2');
      expect(res.body.data.categories).toBeDefined();
      expect(res.body.data.winLossSummary).toBeDefined();
      expect(res.body.data.bestScenarioByMetric).toBeDefined();
      expect(res.body.data.bestScenarioByMetric.fewestVehicles).toBe('run-alpha-2');
    });

    it('POST /api/v1/logistics/shipments/:shipmentId/scenarios/compare - returns 400 if targetScenarioIds is empty', async () => {
      const res = await request(app)
        .post(`/api/v1/logistics/shipments/${mockShipmentDb.id}/scenarios/compare`)
        .set(authHeader)
        .send({
          baselineScenarioId: 'run-alpha-1',
          targetScenarioIds: [],
        });

      expect(res.status).toBe(400);
    });
  });
});
