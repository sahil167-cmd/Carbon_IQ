import { Prisma, PrismaClient } from '@prisma/client';
import { RoutingService } from '../application/RoutingService';
import { RoutingProvider } from '../domain/routing/RoutingProvider';
import {
  Coordinate,
  RouteRequest,
  RouteResult,
  RoutingCapabilities,
  RoutingError,
} from '../domain/routing/types';
import { NotFoundError } from '../../../core/errors/app.error';

describe('Phase 4 — RoutingService', () => {
  const orgAlpha = 'org-alpha-logistics-111';
  const orgBeta = 'org-beta-logistics-222';

  // Synthetic coordinates
  const stop1Coord: Coordinate = { latitude: 19.076, longitude: 72.8777 }; // Mumbai
  const stop2Coord: Coordinate = { latitude: 18.5204, longitude: 73.8567 }; // Pune
  const stop3Coord: Coordinate = { latitude: 19.9975, longitude: 73.7898 }; // Nashik

  // Mock RoutingProvider implementation
  const mockRouteResult: RouteResult = {
    success: true,
    distanceMeters: 148250,
    durationSeconds: 11420,
    geometry: {
      format: 'GEOJSON',
      coordinates: [
        [72.8777, 19.076],
        [73.8567, 18.5204],
      ],
    },
    legs: [
      {
        origin: stop1Coord,
        destination: stop2Coord,
        distanceMeters: 148250,
        durationSeconds: 11420,
      },
    ],
    provider: 'MockRoutingProvider',
    providerVersion: 'v1.0.0',
    metadata: {
      timestamp: '2026-09-06T12:00:00.000Z',
      isTrafficAware: false,
      appliedProfile: 'driving-hgv',
    },
  };

  const mockProvider: RoutingProvider = {
    name: 'MockRoutingProvider',
    version: 'v1.0.0',
    route: jest.fn(async (req: RouteRequest): Promise<RouteResult> => {
      // Echo back legs matching requested stops
      const waypoints = req.waypoints ?? [];
      const allPoints = [req.origin, ...waypoints, req.destination];
      const legs = [];
      for (let i = 0; i < allPoints.length - 1; i++) {
        legs.push({
          origin: allPoints[i],
          destination: allPoints[i + 1],
          distanceMeters: 74000,
          durationSeconds: 5700,
        });
      }

      return {
        ...mockRouteResult,
        legs,
        distanceMeters: legs.reduce((s, l) => s + l.distanceMeters, 0),
        durationSeconds: legs.reduce((s, l) => s + l.durationSeconds, 0),
      };
    }),
    getCapabilities: jest.fn((): RoutingCapabilities => ({
      supportedProfiles: ['driving-car', 'driving-hgv'],
      supportsMultiStop: true,
      supportsWaypoints: true,
      supportsVehicleDimensions: true,
      supportsVehicleWeight: true,
      supportsHazardousRestrictions: false,
      maxCoordinates: 50,
    })),
  };

  // Mock Prisma database
  const mockDbShipments: any[] = [
    {
      id: 'shp-alpha-valid-2-stops',
      organizationId: orgAlpha,
      shipmentNumber: 'SHP-ALPHA-001',
      stops: [
        {
          id: 'stop-1',
          shipmentId: 'shp-alpha-valid-2-stops',
          stopSequence: 1,
          facilityName: 'Alpha Hub Mumbai',
          latitude: new Prisma.Decimal('19.0760000'),
          longitude: new Prisma.Decimal('72.8777000'),
        },
        {
          id: 'stop-2',
          shipmentId: 'shp-alpha-valid-2-stops',
          stopSequence: 2,
          facilityName: 'Alpha DC Pune',
          latitude: new Prisma.Decimal('18.5204000'),
          longitude: new Prisma.Decimal('73.8567000'),
        },
      ],
    },
    {
      id: 'shp-alpha-multi-stop',
      organizationId: orgAlpha,
      shipmentNumber: 'SHP-ALPHA-002',
      stops: [
        {
          id: 'stop-ms-1',
          shipmentId: 'shp-alpha-multi-stop',
          stopSequence: 1,
          facilityName: 'Origin Stop A',
          latitude: new Prisma.Decimal('19.0760000'),
          longitude: new Prisma.Decimal('72.8777000'),
        },
        {
          id: 'stop-ms-2',
          shipmentId: 'shp-alpha-multi-stop',
          stopSequence: 2,
          facilityName: 'Intermediate Stop B',
          latitude: new Prisma.Decimal('18.5204000'),
          longitude: new Prisma.Decimal('73.8567000'),
        },
        {
          id: 'stop-ms-3',
          shipmentId: 'shp-alpha-multi-stop',
          stopSequence: 3,
          facilityName: 'Final Stop C',
          latitude: new Prisma.Decimal('19.9975000'),
          longitude: new Prisma.Decimal('73.7898000'),
        },
      ],
    },
    {
      id: 'shp-alpha-missing-coords',
      organizationId: orgAlpha,
      shipmentNumber: 'SHP-ALPHA-003',
      stops: [
        {
          id: 'stop-mc-1',
          shipmentId: 'shp-alpha-missing-coords',
          stopSequence: 1,
          latitude: new Prisma.Decimal('19.0760000'),
          longitude: new Prisma.Decimal('72.8777000'),
        },
        {
          id: 'stop-mc-2',
          shipmentId: 'shp-alpha-missing-coords',
          stopSequence: 2,
          latitude: null, // Missing!
          longitude: new Prisma.Decimal('73.8567000'),
        },
      ],
    },
    {
      id: 'shp-alpha-single-stop',
      organizationId: orgAlpha,
      shipmentNumber: 'SHP-ALPHA-004',
      stops: [
        {
          id: 'stop-single-1',
          shipmentId: 'shp-alpha-single-stop',
          stopSequence: 1,
          latitude: new Prisma.Decimal('19.0760000'),
          longitude: new Prisma.Decimal('72.8777000'),
        },
      ],
    },
    {
      id: 'shp-beta-foreign',
      organizationId: orgBeta, // Belongs to Beta!
      shipmentNumber: 'SHP-BETA-888',
      stops: [
        {
          id: 'stop-b-1',
          shipmentId: 'shp-beta-foreign',
          stopSequence: 1,
          latitude: new Prisma.Decimal('19.0760000'),
          longitude: new Prisma.Decimal('72.8777000'),
        },
        {
          id: 'stop-b-2',
          shipmentId: 'shp-beta-foreign',
          stopSequence: 2,
          latitude: new Prisma.Decimal('18.5204000'),
          longitude: new Prisma.Decimal('73.8567000'),
        },
      ],
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // TEST 1: Direct route calculation from coordinates
  // ===========================================================================
  it('TEST 1: Direct route calculation via calculateRoute delegates to provider', async () => {
    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    const result = await service.calculateRoute({
      origin: stop1Coord,
      destination: stop2Coord,
    });

    expect(result.success).toBe(true);
    expect(mockProvider.route).toHaveBeenCalledTimes(1);
    expect(result.legs).toHaveLength(1);
    expect(result.metadata.isTrafficAware).toBe(false);
  });

  // ===========================================================================
  // TEST 2: Provider abstraction — RoutingService works through interface
  // ===========================================================================
  it('TEST 2: Provider abstraction — works through RoutingProvider interface without ORS dependency', async () => {
    const customProvider: RoutingProvider = {
      name: 'CustomVendorProvider',
      route: jest.fn(async () => mockRouteResult),
      getCapabilities: jest.fn(() => ({
        supportedProfiles: ['driving-car'],
        supportsMultiStop: false,
        supportsWaypoints: false,
        supportsVehicleDimensions: false,
        supportsVehicleWeight: false,
        supportsHazardousRestrictions: false,
        maxCoordinates: 2,
      })),
    };

    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, customProvider);
    const result = await service.calculateRoute({ origin: stop1Coord, destination: stop2Coord });

    expect(result.success).toBe(true);
    expect(customProvider.route).toHaveBeenCalledTimes(1);
    expect(service.getProviderName()).toBe('CustomVendorProvider');
  });

  // ===========================================================================
  // TEST 3: Tenant isolation — cannot route another organization's shipment
  // ===========================================================================
  it("TEST 3: Tenant isolation — cannot route another organization's shipment", async () => {
    const serviceAlpha = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    // Alpha attempts to calculate route for Beta's shipment
    await expect(
      serviceAlpha.calculateRouteForShipment({ shipmentId: 'shp-beta-foreign' }),
    ).rejects.toThrow(NotFoundError);

    expect(mockProvider.route).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST 4: Shipment route calculation with valid 2 stops
  // ===========================================================================
  it('TEST 4: Shipment route calculation with valid 2 stops succeeds', async () => {
    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    const result = await service.calculateRouteForShipment({
      shipmentId: 'shp-alpha-valid-2-stops',
    });

    expect(result.success).toBe(true);
    expect(mockProvider.route).toHaveBeenCalledTimes(1);

    const callArg = (mockProvider.route as jest.Mock).mock.calls[0][0];
    expect(callArg.origin).toEqual({ latitude: 19.076, longitude: 72.8777 });
    expect(callArg.destination).toEqual({ latitude: 18.5204, longitude: 73.8567 });
    expect(callArg.waypoints).toBeUndefined();
  });

  // ===========================================================================
  // TEST 5: Multi-stop order is preserved exactly — no stop reordering occurs
  // ===========================================================================
  it('TEST 5: Multi-stop order is preserved exactly — no stop reordering occurs', async () => {
    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    const result = await service.calculateRouteForShipment({
      shipmentId: 'shp-alpha-multi-stop',
    });

    expect(result.success).toBe(true);
    expect(mockProvider.route).toHaveBeenCalledTimes(1);

    const callArg = (mockProvider.route as jest.Mock).mock.calls[0][0];
    // Origin must be Stop 1, Waypoint must be Stop 2, Destination must be Stop 3
    expect(callArg.origin).toEqual({ latitude: 19.076, longitude: 72.8777 });
    expect(callArg.waypoints).toHaveLength(1);
    expect(callArg.waypoints![0]).toEqual({ latitude: 18.5204, longitude: 73.8567 });
    expect(callArg.destination).toEqual({ latitude: 19.9975, longitude: 73.7898 });

    // Result should have exactly 2 legs: A -> B and B -> C
    expect(result.legs).toHaveLength(2);
    expect(result.legs[0].origin).toEqual(stop1Coord);
    expect(result.legs[0].destination).toEqual(stop2Coord);
    expect(result.legs[1].origin).toEqual(stop2Coord);
    expect(result.legs[1].destination).toEqual(stop3Coord);
  });

  // ===========================================================================
  // TEST 6: Shipment stop missing coordinates throws MISSING_COORDINATE
  // ===========================================================================
  it('TEST 6: Shipment stop missing coordinates throws MISSING_COORDINATE', async () => {
    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    await expect(
      service.calculateRouteForShipment({ shipmentId: 'shp-alpha-missing-coords' }),
    ).rejects.toMatchObject({
      routingCode: 'MISSING_COORDINATE',
      statusCode: 400,
    });

    expect(mockProvider.route).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST 7: Shipment with fewer than 2 stops throws INVALID_ROUTE_REQUEST
  // ===========================================================================
  it('TEST 7: Shipment with fewer than 2 stops throws INVALID_ROUTE_REQUEST', async () => {
    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    await expect(
      service.calculateRouteForShipment({ shipmentId: 'shp-alpha-single-stop' }),
    ).rejects.toMatchObject({
      routingCode: 'INVALID_ROUTE_REQUEST',
      statusCode: 400,
    });

    expect(mockProvider.route).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST 8: Vehicle profile is transmitted to provider
  // ===========================================================================
  it('TEST 8: Vehicle profile is transmitted to provider without fabrication', async () => {
    const service = new RoutingService(mockPrisma as PrismaClient, orgAlpha, mockProvider);

    await service.calculateRouteForShipment({
      shipmentId: 'shp-alpha-valid-2-stops',
      vehicleProfile: {
        category: 'HEAVY_GOODS',
        lengthMeters: 12.0,
        weightTonnes: 18.5,
      },
    });

    const callArg = (mockProvider.route as jest.Mock).mock.calls[0][0];
    expect(callArg.vehicleProfile).toBeDefined();
    expect(callArg.vehicleProfile.lengthMeters).toBe(12.0);
    expect(callArg.vehicleProfile.weightTonnes).toBe(18.5);
  });
});
