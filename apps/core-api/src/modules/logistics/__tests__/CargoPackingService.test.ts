import {
  DimensionUnit,
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  WeightUnit,
} from '@prisma/client';
import { CargoPackingService } from '../application/CargoPackingService';
import { LogisticsRepository } from '../infrastructure/logistics.repository';
import { UnitNormalizer } from '../application/unit-normalizer';
import { NotFoundError, ValidationError } from '../../../core/errors/app.error';

describe('Phase 1C — CargoPackingService Domain Integration', () => {
  const orgAlpha = 'org-tenant-alpha-001';
  const orgBeta = 'org-tenant-beta-002';

  // Synthetic Test VehicleType: 600cm length, 240cm width, 240cm height, 10,000kg payload
  const mockVehicleTypeAlpha = {
    id: 'vt-alpha-1',
    organizationId: orgAlpha,
    name: 'Alpha Standard Rigid Truck',
    category: 'HEAVY_DUTY',
    bodyType: VehicleBodyType.BOX_TRUCK,
    fuelType: VehicleFuelType.DIESEL,
    emissionStandard: 'BS-VI',
    internalLength: new Prisma.Decimal('600.00'), // 600 cm -> 6000 mm
    internalWidth: new Prisma.Decimal('240.00'),  // 240 cm -> 2400 mm
    internalHeight: new Prisma.Decimal('240.00'), // 240 cm -> 2400 mm
    dimensionUnit: DimensionUnit.CM,
    doorWidth: new Prisma.Decimal('240.00'),
    doorHeight: new Prisma.Decimal('240.00'),
    maxPayload: new Prisma.Decimal('10000.000'),  // 10,000 kg -> 10,000,000 g
    grossVehicleWeight: new Prisma.Decimal('16000.000'),
    tareWeight: new Prisma.Decimal('6000.000'),
    weightUnit: WeightUnit.KG,
    volumetricCapacity: new Prisma.Decimal('34.5600'),
    volumeUnit: 'M3' as any,
    axleCount: 2,
    axleConfiguration: '4x2',
    maxAxleWeightFront: null,
    maxAxleWeightRear: null,
    isRefrigerated: false,
    temperatureMin: null,
    temperatureMax: null,
    metadata: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVehicleAlpha = {
    id: 'veh-alpha-1',
    organizationId: orgAlpha,
    vehicleTypeId: 'vt-alpha-1',
    registrationNumber: 'MH-12-AB-1234',
    fleetNumber: 'FLEET-01',
    homeSiteId: null,
    status: 'ACTIVE',
    yearOfManufacture: 2024,
    currentOdometerKm: new Prisma.Decimal('15000.00'),
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicleType: mockVehicleTypeAlpha,
  };

  const mockVehicleBeta = {
    id: 'veh-beta-1',
    organizationId: orgBeta,
    vehicleTypeId: 'vt-beta-1',
    registrationNumber: 'DL-01-XY-9999',
    fleetNumber: 'FLEET-B1',
    homeSiteId: null,
    status: 'ACTIVE',
    yearOfManufacture: 2023,
    currentOdometerKm: new Prisma.Decimal('5000.00'),
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicleType: {
      ...mockVehicleTypeAlpha,
      id: 'vt-beta-1',
      organizationId: orgBeta,
    },
  };

  const mockShipmentAlpha = {
    id: 'shp-alpha-1',
    organizationId: orgAlpha,
    shipmentNumber: 'SHP-ALPHA-001',
    status: 'DRAFT' as any,
    referenceNumber: 'PO-991',
    description: 'Industrial Equipment Shipment',
    totalWeight: new Prisma.Decimal('2000.000'),
    weightUnit: WeightUnit.KG,
    totalVolume: new Prisma.Decimal('5.7600'),
    volumeUnit: 'M3' as any,
    totalItemsCount: 2,
    plannedPickupDate: new Date(),
    plannedDeliveryDate: new Date(),
    actualPickupDate: null,
    actualDeliveryDate: null,
    metadata: null,
    createdById: 'user-alpha',
    createdAt: new Date(),
    updatedAt: new Date(),
    cargoItems: [
      {
        id: 'cargo-item-1',
        organizationId: orgAlpha,
        shipmentId: 'shp-alpha-1',
        sku: 'SKU-INV-01',
        description: 'Solar Inverters Pallet',
        packageType: 'PALLET',
        quantity: 2,
        length: new Prisma.Decimal('120.00'),  // 120 cm -> 1200 mm
        width: new Prisma.Decimal('80.00'),   // 80 cm -> 800 mm
        height: new Prisma.Decimal('100.00'), // 100 cm -> 1000 mm
        dimensionUnit: DimensionUnit.CM,
        unitWeight: new Prisma.Decimal('500.000'), // 500 kg -> 500,000 g
        totalWeight: new Prisma.Decimal('1000.000'),
        weightUnit: WeightUnit.KG,
        unitVolume: new Prisma.Decimal('0.9600'),
        totalVolume: new Prisma.Decimal('1.9200'),
        volumeUnit: 'M3' as any,
        isStackable: true,
        maxStackWeight: new Prisma.Decimal('1000.00'), // 1000 kg -> 1,000,000 g
        maxStackTiers: 2,
        isFragile: false,
        allowRotationHorizontal: true,
        allowRotationVertical: false,
        allowedOrientations: ['DEFAULT', 'YAW_90'],
        loadingPriority: 1,
        unloadingSequence: 1,
        pickupStopId: null,
        dropoffStopId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    stops: [],
  };

  const mockShipmentBeta = {
    ...mockShipmentAlpha,
    id: 'shp-beta-1',
    organizationId: orgBeta,
    shipmentNumber: 'SHP-BETA-001',
  };

  // Setup Mock Repository
  let mockPrisma: any;
  let repoAlpha: LogisticsRepository;
  let serviceAlpha: CargoPackingService;

  beforeEach(() => {
    mockPrisma = {
      vehicleType: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.id === 'vt-alpha-1') {
            const matchesOrg = where.OR.some(
              (cond: any) => cond.organizationId === orgAlpha || cond.organizationId === null,
            );
            return matchesOrg ? mockVehicleTypeAlpha : null;
          }
          if (where.id === 'vt-beta-1') {
            const matchesOrg = where.OR.some(
              (cond: any) => cond.organizationId === orgAlpha || cond.organizationId === null,
            );
            return matchesOrg ? mockVehicleTypeAlpha : null; // returns null for orgAlpha
          }
          return null;
        }),
      },
      vehicle: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.id === 'veh-alpha-1' && where.organizationId === orgAlpha) {
            return mockVehicleAlpha;
          }
          if (where.id === 'veh-beta-1' && where.organizationId === orgBeta) {
            return mockVehicleBeta;
          }
          return null;
        }),
      },
      shipment: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.id === 'shp-alpha-1' && where.organizationId === orgAlpha) {
            return mockShipmentAlpha;
          }
          if (where.id === 'shp-beta-1' && where.organizationId === orgBeta) {
            return mockShipmentBeta;
          }
          return null;
        }),
      },
    };

    repoAlpha = new LogisticsRepository(mockPrisma, orgAlpha);
    serviceAlpha = new CargoPackingService(repoAlpha);
  });

  // TEST 1: Organization A successfully packs its own shipment using its own vehicle specification
  it('TEST 1: Organization A successfully packs its own shipment using its own vehicle specification', async () => {
    const result = await serviceAlpha.packShipment({
      shipmentId: 'shp-alpha-1',
      vehicleId: 'veh-alpha-1',
    });

    expect(result.success).toBe(true);
    expect(result.totalRequestedCount).toBe(2);
    expect(result.placedCount).toBe(2);
    expect(result.unplacedCount).toBe(0);

    // Verify converted dimensions in mm
    expect(result.placements[0].lengthMm).toBe(1200);
    expect(result.placements[0].widthMm).toBe(800);
    expect(result.placements[0].heightMm).toBe(1000);

    // Verify converted weight in grams
    expect(result.placedWeightGrams).toBe(1_000_000); // 2 * 500,000g = 1,000,000g (1 tonne)
    expect(result.maxPayloadGrams).toBe(10_000_000);  // 10 tonnes
  });

  // TEST 2: Organization A cannot access Organization B's vehicle
  it('TEST 2: Organization A cannot access Organization B vehicle (throws 404 NotFoundError)', async () => {
    await expect(
      serviceAlpha.packShipment({
        shipmentId: 'shp-alpha-1',
        vehicleId: 'veh-beta-1', // Belongs to orgBeta
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // TEST 3: Organization A cannot access Organization B's shipment/cargo
  it('TEST 3: Organization A cannot access Organization B shipment/cargo (throws 404 NotFoundError)', async () => {
    await expect(
      serviceAlpha.packShipment({
        shipmentId: 'shp-beta-1', // Belongs to orgBeta
        vehicleId: 'veh-alpha-1',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // TEST 4: Database Decimal dimensions are converted correctly into normalized units
  it('TEST 4: Database Decimal dimensions are converted correctly across units (M, CM, MM, INCH)', () => {
    // 2.4 M -> 2400 mm
    expect(UnitNormalizer.toIntegerMm(new Prisma.Decimal('2.40'), DimensionUnit.M)).toBe(2400);

    // 120 CM -> 1200 mm
    expect(UnitNormalizer.toIntegerMm(new Prisma.Decimal('120.00'), DimensionUnit.CM)).toBe(1200);

    // 500 MM -> 500 mm
    expect(UnitNormalizer.toIntegerMm(new Prisma.Decimal('500.00'), DimensionUnit.MM)).toBe(500);

    // 10 INCH -> 254 mm
    expect(UnitNormalizer.toIntegerMm(new Prisma.Decimal('10.00'), DimensionUnit.INCH)).toBe(254);
  });

  // TEST 5: Payload conversion is correct across units (KG, TONNE, G, LBS)
  it('TEST 5: Payload conversion is correct across units (KG, TONNE, G, LBS)', () => {
    // 10 KG -> 10,000 g
    expect(UnitNormalizer.toIntegerGrams(new Prisma.Decimal('10.000'), WeightUnit.KG)).toBe(10000);

    // 5 TONNE -> 5,000,000 g
    expect(UnitNormalizer.toIntegerGrams(new Prisma.Decimal('5.000'), WeightUnit.TONNE)).toBe(5000000);

    // 250 G -> 250 g
    expect(UnitNormalizer.toIntegerGrams(new Prisma.Decimal('250'), WeightUnit.G)).toBe(250);

    // 100 LBS -> 45359 g (100 * 453.59237 rounded)
    expect(UnitNormalizer.toIntegerGrams(new Prisma.Decimal('100.000'), WeightUnit.LBS)).toBe(45359);
  });

  // TEST 6: Cargo quantity reaches the packing engine correctly
  it('TEST 6: Cargo quantity is accurately expanded into distinct instances', async () => {
    const result = await serviceAlpha.packManifest({
      vehicleSpec: {
        length: 5000,
        width: 2000,
        height: 2000,
        dimensionUnit: DimensionUnit.MM,
        maxPayload: 5000,
        weightUnit: WeightUnit.KG,
      },
      cargo: [
        {
          cargoId: 'batch-box',
          length: 500,
          width: 500,
          height: 500,
          dimensionUnit: DimensionUnit.MM,
          weight: 50,
          weightUnit: WeightUnit.KG,
          quantity: 6,
        },
      ],
    });

    expect(result.totalRequestedCount).toBe(6);
    expect(result.placedCount).toBe(6);
    expect(result.placements.map((p) => p.instanceId)).toEqual([
      'batch-box#1',
      'batch-box#2',
      'batch-box#3',
      'batch-box#4',
      'batch-box#5',
      'batch-box#6',
    ]);
  });

  // TEST 7: Rotation constraints are preserved
  it('TEST 7: Rotation constraints are preserved from domain inputs to packing engine', async () => {
    // Narrow vehicle: width 1000mm. Box: width 1200mm, length 800mm.
    // If rotation allowed: yaw 90 degrees fits (length 800 along width 1000).
    // If rotation forbidden: cannot fit.
    const resultAllowed = await serviceAlpha.packManifest({
      vehicleSpec: { length: 3000, width: 1000, height: 2000, dimensionUnit: DimensionUnit.MM, maxPayload: 1000, weightUnit: WeightUnit.KG },
      cargo: [{ cargoId: 'box-rot', length: 800, width: 1200, height: 500, dimensionUnit: DimensionUnit.MM, weight: 10, weightUnit: WeightUnit.KG, quantity: 1, allowRotationHorizontal: true }],
    });
    expect(resultAllowed.placedCount).toBe(1);

    const resultForbidden = await serviceAlpha.packManifest({
      vehicleSpec: { length: 3000, width: 1000, height: 2000, dimensionUnit: DimensionUnit.MM, maxPayload: 1000, weightUnit: WeightUnit.KG },
      cargo: [{ cargoId: 'box-norot', length: 800, width: 1200, height: 500, dimensionUnit: DimensionUnit.MM, weight: 10, weightUnit: WeightUnit.KG, quantity: 1, allowRotationHorizontal: false, allowRotationVertical: false }],
    });
    expect(resultForbidden.placedCount).toBe(0);
    expect(resultForbidden.unplacedCount).toBe(1);
  });

  // TEST 8: Stackability/fragility constraints are preserved
  it('TEST 8: Non-stackable constraint is preserved and prevents placement above', async () => {
    const result = await serviceAlpha.packManifest({
      vehicleSpec: { length: 1000, width: 1000, height: 3000, dimensionUnit: DimensionUnit.MM, maxPayload: 5000, weightUnit: WeightUnit.KG },
      cargo: [
        { cargoId: 'base-no-stack', length: 1000, width: 1000, height: 1000, dimensionUnit: DimensionUnit.MM, weight: 100, weightUnit: WeightUnit.KG, quantity: 1, isStackable: false },
        { cargoId: 'top-item', length: 1000, width: 1000, height: 1000, dimensionUnit: DimensionUnit.MM, weight: 100, weightUnit: WeightUnit.KG, quantity: 1 },
      ],
    });

    expect(result.placedCount).toBe(1);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedItems[0].cargoId).toBe('top-item');
  });

  // TEST 9: Invalid dimensions are rejected before packing
  it('TEST 9: Invalid/negative dimensions throw ValidationError before reaching packing engine', () => {
    expect(() =>
      UnitNormalizer.toIntegerMm(new Prisma.Decimal('-10.00'), DimensionUnit.CM, 'testLength'),
    ).toThrow(ValidationError);
  });

  // TEST 10: Invalid payload is rejected
  it('TEST 10: Non-positive payload throws ValidationError before reaching packing engine', () => {
    expect(() =>
      UnitNormalizer.toIntegerGrams(new Prisma.Decimal('0.00'), WeightUnit.KG, 'maxPayload'),
    ).toThrow(ValidationError);
  });

  // TEST 11: A partially packable shipment returns explicit unplaced cargo
  it('TEST 11: A partially packable shipment returns exact placed and unplaced manifests', async () => {
    const result = await serviceAlpha.packManifest({
      vehicleSpec: { length: 2000, width: 1000, height: 1000, dimensionUnit: DimensionUnit.MM, maxPayload: 5000, weightUnit: WeightUnit.KG },
      cargo: [
        { cargoId: 'box-A', length: 1000, width: 1000, height: 1000, dimensionUnit: DimensionUnit.MM, weight: 100, weightUnit: WeightUnit.KG, quantity: 1 },
        { cargoId: 'box-B', length: 1000, width: 1000, height: 1000, dimensionUnit: DimensionUnit.MM, weight: 100, weightUnit: WeightUnit.KG, quantity: 1 },
        { cargoId: 'box-C', length: 1000, width: 1000, height: 1000, dimensionUnit: DimensionUnit.MM, weight: 100, weightUnit: WeightUnit.KG, quantity: 1 }, // Cannot fit
      ],
    });

    expect(result.totalRequestedCount).toBe(3);
    expect(result.placedCount).toBe(2);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedItems[0].cargoId).toBe('box-C');
    expect(result.success).toBe(false);
  });

  // TEST 12: The service produces deterministic results for identical input
  it('TEST 12: Repeated service execution produces 100% deterministic, identical outputs', async () => {
    const manifest = {
      vehicleSpec: { length: 4000, width: 2000, height: 2000, dimensionUnit: DimensionUnit.MM, maxPayload: 10000, weightUnit: WeightUnit.KG },
      cargo: [
        { cargoId: 'box-1', length: 1200, width: 800, height: 1000, dimensionUnit: DimensionUnit.MM, weight: 200, weightUnit: WeightUnit.KG, quantity: 2 },
        { cargoId: 'box-2', length: 600, width: 400, height: 400, dimensionUnit: DimensionUnit.MM, weight: 50, weightUnit: WeightUnit.KG, quantity: 4 },
      ],
    };

    const run1 = await serviceAlpha.packManifest(manifest);
    const run2 = await serviceAlpha.packManifest(manifest);

    expect(run1.placedCount).toBe(run2.placedCount);
    expect(run1.placedWeightGrams).toBe(run2.placedWeightGrams);
    expect(run1.placedVolumeMm3).toBe(run2.placedVolumeMm3);
    expect(run1.placements).toEqual(run2.placements);
  });
});
