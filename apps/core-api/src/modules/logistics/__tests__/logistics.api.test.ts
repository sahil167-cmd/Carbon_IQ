import request from 'supertest';
import { createApp } from '../../../app';
import { getPrismaClient } from '../../../core/repository/tenant-scoped.repository';
import { UnauthorizedError } from '../../../core/errors/app.error';

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

// Mock authentication middleware to test auth & tenant isolation in isolated unit/integration tests
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

describe('Phase 7A — Logistics Backend API Exposure', () => {
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

  // =========================================================================
  // 1. Authentication & Security
  // =========================================================================
  describe('Authentication & Security', () => {
    it('TEST 1: Rejects requests missing Authorization header with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/logistics/shipments');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });

    it('TEST 2: Rejects requests with unauthorized role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/logistics/shipments')
        .set({
          Authorization: 'Bearer valid-token',
          'x-test-role': 'UNAUTHORIZED_ROLE_GUEST',
        })
        .send({
          description: 'Test Shipment',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 2. Shipment APIs
  // =========================================================================
  describe('Shipment Endpoints', () => {
    it('TEST 3: POST /api/v1/logistics/shipments creates shipment with stops', async () => {
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          shipment: {
            create: jest.fn().mockResolvedValue({
              id: 'shipment-new-1',
              organizationId: 'org-tenant-alpha',
              shipmentNumber: 'SHP-2026-001',
              description: 'Mumbai to Pune Electronics',
              totalWeight: 0,
              totalVolume: 0,
              totalItemsCount: 0,
              stops: [
                { id: 'stop-1', stopSequence: 1, facilityName: 'Mumbai Hub' },
                { id: 'stop-2', stopSequence: 2, facilityName: 'Pune Hub' },
              ],
              cargoItems: [],
            }),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/logistics/shipments')
        .set(authHeader)
        .send({
          shipmentNumber: 'SHP-2026-001',
          description: 'Mumbai to Pune Electronics',
          stops: [
            {
              stopSequence: 1,
              facilityName: 'Mumbai Hub',
              addressLine1: 'Road 1',
              country: 'IN',
            },
            {
              stopSequence: 2,
              facilityName: 'Pune Hub',
              addressLine1: 'Road 2',
              country: 'IN',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('shipment-new-1');
      expect(res.body.data.stops).toHaveLength(2);
    });

    it('TEST 4: GET /api/v1/logistics/shipments lists tenant shipments with pagination', async () => {
      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([
        { id: 'shipment-1', shipmentNumber: 'SHP-001', organizationId: 'org-tenant-alpha' } as any,
      ]);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/logistics/shipments?page=1&limit=10')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('TEST 5: GET /api/v1/logistics/shipments/:id returns shipment details', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
        shipmentNumber: 'SHP-001',
        stops: [],
        cargoItems: [],
        optimizationRuns: [],
      } as any);

      const res = await request(app)
        .get('/api/v1/logistics/shipments/shipment-1')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('shipment-1');
    });

    it('TEST 6: GET /api/v1/logistics/shipments/:id returns 404 for cross-tenant access', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/logistics/shipments/shipment-1')
        .set(crossTenantHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('TEST 7: PATCH /api/v1/logistics/shipments/:id updates shipment status', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
      } as any);

      jest.spyOn(prisma.shipment, 'update').mockResolvedValue({
        id: 'shipment-1',
        status: 'PLANNED',
      } as any);

      const res = await request(app)
        .patch('/api/v1/logistics/shipments/shipment-1')
        .set(authHeader)
        .send({ status: 'PLANNED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PLANNED');
    });
  });

  // =========================================================================
  // 3. Cargo APIs
  // =========================================================================
  describe('Cargo Endpoints', () => {
    it('TEST 8: POST /api/v1/logistics/shipments/:shipmentId/cargo adds cargo item and recalculates totals', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
      } as any);

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          cargoItem: {
            create: jest.fn().mockResolvedValue({
              id: 'cargo-1',
              shipmentId: 'shipment-1',
              description: 'Industrial Inverters',
              length: 120,
              width: 80,
              height: 100,
              unitWeight: 50,
              totalWeight: 250,
              quantity: 5,
            }),
            findMany: jest.fn().mockResolvedValue([
              { totalWeight: 250, totalVolume: 4.8, quantity: 5 },
            ]),
          },
          shipment: {
            update: jest.fn().mockResolvedValue({ id: 'shipment-1' }),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/logistics/shipments/shipment-1/cargo')
        .set(authHeader)
        .send({
          description: 'Industrial Inverters',
          quantity: 5,
          length: 120,
          width: 80,
          height: 100,
          unitWeight: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('cargo-1');
    });

    it('TEST 9: POST /api/v1/logistics/shipments/:shipmentId/cargo rejects non-positive dimensions', async () => {
      const res = await request(app)
        .post('/api/v1/logistics/shipments/shipment-1/cargo')
        .set(authHeader)
        .send({
          description: 'Defective Box',
          quantity: 1,
          length: -10, // Invalid negative dimension
          width: 50,
          height: 50,
          unitWeight: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('TEST 10: DELETE /api/v1/logistics/shipments/:shipmentId/cargo/:cargoId deletes item and updates totals', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
      } as any);

      jest.spyOn(prisma.cargoItem, 'findFirst').mockResolvedValue({
        id: 'cargo-1',
        shipmentId: 'shipment-1',
        organizationId: 'org-tenant-alpha',
      } as any);

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          cargoItem: {
            delete: jest.fn().mockResolvedValue({ id: 'cargo-1' }),
            findMany: jest.fn().mockResolvedValue([]),
          },
          shipment: {
            update: jest.fn().mockResolvedValue({ id: 'shipment-1' }),
          },
        });
      });

      const res = await request(app)
        .delete('/api/v1/logistics/shipments/shipment-1/cargo/cargo-1')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Cargo item removed');
    });
  });

  // =========================================================================
  // 4. Vehicle & Fleet APIs
  // =========================================================================
  describe('Vehicle & Fleet Endpoints', () => {
    it('TEST 11: GET /api/v1/logistics/vehicles returns tenant fleet vehicles', async () => {
      jest.spyOn(prisma.vehicle, 'findMany').mockResolvedValue([
        {
          id: 'veh-1',
          registrationNumber: 'MH-12-AB-1234',
          organizationId: 'org-tenant-alpha',
          vehicleType: { name: 'Tata 16-Tonner' },
        } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/logistics/vehicles')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].registrationNumber).toBe('MH-12-AB-1234');
    });

    it('TEST 12: GET /api/v1/logistics/vehicle-specifications returns accessible templates', async () => {
      jest.spyOn(prisma.vehicleType, 'findMany').mockResolvedValue([
        { id: 'vt-global-1', name: 'Global 40T Trailer', organizationId: null } as any,
        { id: 'vt-tenant-1', name: 'Custom Tenant Rigid', organizationId: 'org-tenant-alpha' } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/logistics/vehicle-specifications')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // =========================================================================
  // 5. Fleet Optimization APIs
  // =========================================================================
  describe('Fleet Optimization Endpoints', () => {
    it('TEST 13: POST /api/v1/logistics/shipments/:shipmentId/optimize runs optimization and returns result', async () => {
      // Mock shipment with cargo
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
        cargoItems: [
          {
            id: 'item-1',
            description: 'Box 1',
            quantity: 1,
            length: 100,
            width: 100,
            height: 100,
            dimensionUnit: 'CM',
            unitWeight: 50,
            weightUnit: 'KG',
            isStackable: true,
            allowRotationHorizontal: true,
            allowRotationVertical: false,
            allowedOrientations: ['DEFAULT'],
          },
        ],
      } as any);

      // Mock candidate vehicle
      jest.spyOn(prisma.vehicle, 'findMany').mockResolvedValue([
        {
          id: 'veh-1',
          registrationNumber: 'MH-04-1234',
          organizationId: 'org-tenant-alpha',
          status: 'AVAILABLE',
          vehicleType: {
            id: 'vt-1',
            name: 'Standard Truck',
            internalLength: 3000,
            internalWidth: 2000,
            internalHeight: 2000,
            dimensionUnit: 'MM',
            maxPayload: 5000,
            weightUnit: 'KG',
            verificationStatus: 'VERIFIED',
          },
        } as any,
      ]);

      // Mock optimization run creation
      jest.spyOn(prisma.optimizationRun, 'create').mockResolvedValue({
        id: 'opt-run-1',
        shipmentId: 'shipment-1',
        organizationId: 'org-tenant-alpha',
        loadPlans: [],
      } as any);

      const res = await request(app)
        .post('/api/v1/logistics/shipments/shipment-1/optimize')
        .set(authHeader)
        .send({
          scenarioName: 'Test Optimization Scenario',
          persistOptimizationRun: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.bestSolution).toBeDefined();
    });

    it('TEST 14: GET /api/v1/logistics/optimizations/:id retrieves persisted result with vehicle specs and 3D placements', async () => {
      jest.spyOn(prisma.optimizationRun, 'findFirst').mockResolvedValue({
        id: 'opt-run-1',
        organizationId: 'org-tenant-alpha',
        scenarioName: 'Optimized Run',
        loadPlans: [
          {
            id: 'lp-1',
            vehicleSequence: 1,
            vehicleTypeId: 'vt-1',
            loadedWeightKg: 1200,
            loadedVolumeM3: 4.5,
            weightUtilizationPct: 80.0,
            volumeUtilizationPct: 75.0,
            vehicleType: {
              id: 'vt-1',
              name: 'Standard Truck 3T',
              internalLength: 3000,
              internalWidth: 2000,
              internalHeight: 2000,
              dimensionUnit: 'MM',
              maxPayload: 3000,
              weightUnit: 'KG',
            },
            vehicle: {
              id: 'veh-1',
              registrationNumber: 'MH-12-AB-1234',
              fleetNumber: 'FL-101',
            },
            placementsJson: {
              vehicleDimensions: {
                lengthMm: 3000,
                widthMm: 2000,
                heightMm: 2000,
                maxPayloadGrams: 3000000,
                name: 'Standard Truck 3T',
              },
              placements: [
                {
                  cargoId: 'c-1',
                  instanceId: 'c-1#1',
                  xMm: 0,
                  yMm: 0,
                  zMm: 0,
                  lengthMm: 600,
                  widthMm: 400,
                  heightMm: 400,
                  weightGrams: 50000,
                  orientation: 'UPRIGHT_DEFAULT',
                  loadingSequence: 1,
                },
              ],
            },
          },
        ],
      } as any);

      const res = await request(app)
        .get('/api/v1/logistics/optimizations/opt-run-1')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('opt-run-1');
      expect(res.body.data.loadPlans).toHaveLength(1);
      expect(res.body.data.loadPlans[0].vehicleType.internalLength).toBe(3000);
      expect(res.body.data.loadPlans[0].placementsJson.placements).toHaveLength(1);
      expect(res.body.data.loadPlans[0].placementsJson.vehicleDimensions.lengthMm).toBe(3000);
    });

    it('TEST 15: GET /api/v1/logistics/optimizations/:id returns 404 for cross-tenant run', async () => {
      jest.spyOn(prisma.optimizationRun, 'findFirst').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/logistics/optimizations/opt-run-cross')
        .set(crossTenantHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 6. Routing & Traffic / ETA APIs
  // =========================================================================
  describe('Routing & Traffic / ETA Endpoints', () => {
    it('TEST 16: POST /api/v1/logistics/routes/calculate computes direct route', async () => {
      // Mock global fetch for ORS provider
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                summary: { distance: 150000, duration: 9000 },
                segments: [{ distance: 150000, duration: 9000, steps: [] }],
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [73.0628, 19.2967],
                  [73.7389, 18.5913],
                ],
              },
            },
          ],
        }),
      } as any);

      const res = await request(app)
        .post('/api/v1/logistics/routes/calculate')
        .set(authHeader)
        .send({
          origin: { latitude: 19.2967, longitude: 73.0628 },
          destination: { latitude: 18.5913, longitude: 73.7389 },
          profile: 'driving-hgv',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.distanceMeters).toBe(150000);
      expect(res.body.data.durationSeconds).toBe(9000);
      expect(res.body.data.geometry).toBeDefined();
    });

    it('TEST 17: GET /api/v1/logistics/shipments/:shipmentId/traffic-eta returns baseline traffic ETA', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
        stops: [
          { stopSequence: 1, latitude: 19.2967, longitude: 73.0628 },
          { stopSequence: 2, latitude: 18.5913, longitude: 73.7389 },
        ],
      } as any);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                summary: { distance: 120000, duration: 7200 },
                segments: [{ distance: 120000, duration: 7200, steps: [] }],
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [73.0628, 19.2967],
                  [73.7389, 18.5913],
                ],
              },
            },
          ],
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/logistics/shipments/shipment-1/traffic-eta?departureTime=2026-09-10T08:00:00.000Z')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('BASELINE');
      expect(res.body.data.isLiveTraffic).toBe(false);
      expect(res.body.data.trafficDelaySeconds).toBe(0);
      expect(res.body.data.estimatedTimeOfArrival).toBeDefined();
    });
  });

  // =========================================================================
  // 7. Carbon Impact APIs
  // =========================================================================
  describe('Carbon Impact Endpoints', () => {
    it('TEST 18: POST /api/v1/logistics/carbon/scenario calculates CO2e via existing Carbon Engine', async () => {
      // Mock emission factor resolution in PostgresEmissionFactorProvider
      jest.spyOn(prisma.emissionFactor, 'findMany').mockResolvedValue([
        {
          id: 'ef-1',
          category: 'UPSTREAM_TRANSPORT',
          subCategory: 'ROAD_ARTICULATED_40T',
          region: 'GLOBAL',
          factorValue: 0.0460,
          unit: 'TONNE_KM',
          co2eUnit: 'kgCO2e',
          sourceSet: 'GLEC_V3',
          version: 1,
        } as any,
      ]);

      const res = await request(app)
        .post('/api/v1/logistics/carbon/scenario')
        .set(authHeader)
        .send({
          scenarioName: 'Scenario Alpha Consolidation',
          vehicles: [
            {
              vehicleCategory: 'ARTICULATED_40T',
              distanceKm: 500,
              cargoWeightKg: 20000, // 20 tonnes -> 10,000 tkm * 0.0460 = 460 kgCO2e
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCo2e).toBe(460);
      expect(res.body.data.co2eUnit).toBe('kgCO2e');
      expect(res.body.data.vehicles[0].emissionFactor.sourceSet).toBe('GLEC_V3');
    });

    it('TEST 19: GET /api/v1/logistics/shipments/:shipmentId/carbon calculates shipment carbon footprint', async () => {
      jest.spyOn(prisma.shipment, 'findFirst').mockResolvedValue({
        id: 'shipment-1',
        organizationId: 'org-tenant-alpha',
        totalWeight: 20000,
        optimizationRuns: [
          {
            id: 'run-1',
            scenarioName: 'Latest Scenario',
            loadPlans: [
              {
                id: 'lp-1',
                loadedWeightKg: 20000,
                vehicleType: { category: 'ROAD_ARTICULATED_40T' },
                routePlan: { distanceKm: 500 },
              },
            ],
          },
        ],
      } as any);

      jest.spyOn(prisma.emissionFactor, 'findMany').mockResolvedValue([
        {
          id: 'ef-1',
          category: 'UPSTREAM_TRANSPORT',
          subCategory: 'ROAD_ARTICULATED_40T',
          region: 'GLOBAL',
          factorValue: 0.0460,
          unit: 'TONNE_KM',
          co2eUnit: 'kgCO2e',
          sourceSet: 'GLEC_V3',
          version: 1,
        } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/logistics/shipments/shipment-1/carbon')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shipmentId).toBe('shipment-1');
      expect(res.body.data.totalCo2e).toBe(460);
    });
  });

  // =========================================================================
  // 9. Phase 9 — Defensive Input Validation & Resource Limits Regression
  // =========================================================================
  describe('Phase 9 — Production Hardening & Input Resource Limits', () => {
    it('TEST 20: Rejects pathological cargo item quantity (>1000) with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/logistics/shipments/shipment-1/cargo')
        .set(authHeader)
        .send({
          description: 'Excessive Quantity Boxes',
          quantity: 5000, // Exceeds max 1000
          length: 50,
          width: 50,
          height: 50,
          unitWeight: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('TEST 21: Rejects pathological optimization execution bounds with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/logistics/shipments/shipment-1/optimize')
        .set(authHeader)
        .send({
          options: {
            maxExecutionTimeMs: 120000, // Exceeds max 30000ms
            maxVehiclesToConsider: 50,  // Exceeds max 20
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('TEST 22: Rejects excessive scenario comparison targets (>20) with 400 Bad Request', async () => {
      const oversizedTargets = Array.from({ length: 25 }, (_, i) => `scenario-run-${i}`);
      const res = await request(app)
        .post('/api/v1/logistics/shipments/shipment-1/scenarios/compare')
        .set(authHeader)
        .send({
          baselineScenarioId: 'scenario-run-base',
          targetScenarioIds: oversizedTargets, // Exceeds max 20
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('TEST 23: Rejects direct route calculation exceeding 25 waypoints with 400 Bad Request', async () => {
      const excessiveWaypoints = Array.from({ length: 30 }, () => ({
        latitude: 19.076,
        longitude: 72.8777,
      }));

      const res = await request(app)
        .post('/api/v1/logistics/routes/calculate')
        .set(authHeader)
        .send({
          origin: { latitude: 19.076, longitude: 72.8777 },
          destination: { latitude: 18.5204, longitude: 73.8567 },
          waypoints: excessiveWaypoints,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });
});
