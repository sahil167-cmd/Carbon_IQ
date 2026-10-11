import {
  DimensionUnit,
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  WeightUnit,
} from '@prisma/client';
import { VehicleMasterService } from '../application/VehicleMasterService';
import { LogisticsRepository } from '../infrastructure/logistics.repository';
import { NotFoundError, ValidationError } from '../../../core/errors/app.error';

describe('Phase 2A — Vehicle Master & Fleet Domain', () => {
  const orgAlpha = 'org-tenant-alpha-001';
  const orgBeta = 'org-tenant-beta-002';

  // Synthetic Global Template (organizationId === null)
  const mockGlobalTemplate = {
    id: 'vt-global-standard-32ft',
    organizationId: null,
    name: 'Standard 32ft Multi-Axle Container Spec',
    make: null,
    model: null,
    variant: null,
    category: 'HEAVY_DUTY',
    bodyType: VehicleBodyType.CONTAINER_CARRIER,
    fuelType: VehicleFuelType.DIESEL,
    emissionStandard: 'BS-VI',
    internalLength: new Prisma.Decimal('975.00'), // 9.75m -> 975 cm
    internalWidth: new Prisma.Decimal('244.00'),
    internalHeight: new Prisma.Decimal('259.00'),
    dimensionUnit: DimensionUnit.CM,
    doorWidth: new Prisma.Decimal('240.00'),
    doorHeight: new Prisma.Decimal('250.00'),
    externalLength: new Prisma.Decimal('1000.00'),
    externalWidth: new Prisma.Decimal('250.00'),
    externalHeight: new Prisma.Decimal('270.00'),
    maxPayload: new Prisma.Decimal('18500.000'), // 18.5 tonnes
    grossVehicleWeight: new Prisma.Decimal('28000.000'),
    tareWeight: new Prisma.Decimal('9500.000'),
    weightUnit: WeightUnit.KG,
    volumetricCapacity: new Prisma.Decimal('61.6000'),
    volumeUnit: 'M3' as any,
    axleCount: 3,
    axleConfiguration: '6x2',
    maxAxleWeightFront: null,
    maxAxleWeightRear: null,
    isRefrigerated: false,
    temperatureMin: null,
    temperatureMax: null,
    sourceName: 'ISO Standard Container Homologation',
    sourceUrl: 'https://example.com/spec/32ft',
    verificationStatus: 'VERIFIED',
    verifiedAt: new Date(),
    notes: 'Reference specification for heavy logistics',
    metadata: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Synthetic Custom VehicleType belonging to Org Alpha
  const mockAlphaCustomType = {
    ...mockGlobalTemplate,
    id: 'vt-alpha-custom-box',
    organizationId: orgAlpha,
    name: 'Alpha Custom 24ft Box Truck',
    make: 'Custom Fleet Manufacturer',
    model: 'CF-2400',
    variant: 'Standard Closed Box',
    internalLength: new Prisma.Decimal('720.00'),
    internalWidth: new Prisma.Decimal('240.00'),
    internalHeight: new Prisma.Decimal('240.00'),
    maxPayload: new Prisma.Decimal('10000.000'),
    grossVehicleWeight: new Prisma.Decimal('16000.000'),
    tareWeight: new Prisma.Decimal('6000.000'),
    verificationStatus: 'VERIFIED',
  };

  // Synthetic Custom VehicleType belonging to Org Beta
  const mockBetaCustomType = {
    ...mockGlobalTemplate,
    id: 'vt-beta-custom-reefer',
    organizationId: orgBeta,
    name: 'Beta Custom Refrigerated Truck',
    make: 'Beta Refrigerator Works',
    model: 'BRW-Reefer-X',
    variant: 'Chilled Cargo',
    isRefrigerated: true,
    verificationStatus: 'VERIFIED',
  };

  // Mock Database State
  const dbVehicleTypes = [mockGlobalTemplate, mockAlphaCustomType, mockBetaCustomType];
  const dbVehicles: any[] = [];

  let mockPrisma: any;
  let repoAlpha: LogisticsRepository;
  let serviceAlpha: VehicleMasterService;
  let repoBeta: LogisticsRepository;
  let serviceBeta: VehicleMasterService;

  beforeEach(() => {
    mockPrisma = {
      vehicleType: {
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            dbVehicleTypes.find((vt) => {
              if (vt.id !== where.id) return false;
              if (where.OR) {
                return where.OR.some((cond: any) => cond.organizationId === vt.organizationId);
              }
              return true;
            }) || null
          );
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return dbVehicleTypes.filter((vt) => {
            if (where.isActive && !vt.isActive) return false;
            if (where.organizationId === null) return vt.organizationId === null;
            if (where.organizationId) return vt.organizationId === where.organizationId;
            if (where.OR) {
              return where.OR.some((cond: any) => cond.organizationId === vt.organizationId);
            }
            return true;
          });
        }),
        create: jest.fn(async ({ data }: any) => {
          const created = { id: `vt-created-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          dbVehicleTypes.push(created);
          return created;
        }),
      },
      vehicle: {
        findFirst: jest.fn(async ({ where }: any) => {
          const found = dbVehicles.find((v) => {
            if (where.id && v.id !== where.id) return false;
            if (where.organizationId && v.organizationId !== where.organizationId) return false;
            if (where.registrationNumber && v.registrationNumber !== where.registrationNumber) return false;
            return true;
          });
          if (!found) return null;
          const vt = dbVehicleTypes.find((t) => t.id === found.vehicleTypeId);
          return { ...found, vehicleType: vt };
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return dbVehicles
            .filter((v) => {
              if (where.organizationId && v.organizationId !== where.organizationId) return false;
              if (where.isActive && !v.isActive) return false;
              return true;
            })
            .map((v) => {
              const vt = dbVehicleTypes.find((t) => t.id === v.vehicleTypeId);
              return { ...v, vehicleType: vt };
            });
        }),
        create: jest.fn(async ({ data }: any) => {
          // Unique registrationNumber within organizationId check
          const exists = dbVehicles.some(
            (v) => v.organizationId === data.organizationId && v.registrationNumber === data.registrationNumber,
          );
          if (exists) {
            const err: any = new Error('Unique constraint failed on vehicles');
            err.code = 'P2002';
            throw err;
          }
          const created = { id: `veh-created-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          dbVehicles.push(created);
          return created;
        }),
      },
    };

    repoAlpha = new LogisticsRepository(mockPrisma, orgAlpha);
    serviceAlpha = new VehicleMasterService(repoAlpha);

    repoBeta = new LogisticsRepository(mockPrisma, orgBeta);
    serviceBeta = new VehicleMasterService(repoBeta);
  });

  // TEST 1: Global VehicleType is accessible to tenant
  it('TEST 1: Global approved VehicleType (organizationId: null) is accessible to Organization Alpha', async () => {
    const vt = await serviceAlpha.getVehicleType('vt-global-standard-32ft');
    expect(vt).toBeDefined();
    expect(vt.id).toBe('vt-global-standard-32ft');
    expect(vt.organizationId).toBeNull();
  });

  // TEST 2: Tenant custom VehicleType is accessible to its owner
  it('TEST 2: Tenant custom VehicleType is accessible to its owner (Organization Alpha)', async () => {
    const vt = await serviceAlpha.getVehicleType('vt-alpha-custom-box');
    expect(vt).toBeDefined();
    expect(vt.organizationId).toBe(orgAlpha);
    expect(vt.make).toBe('Custom Fleet Manufacturer');
  });

  // TEST 3: Tenant cannot access another tenant custom VehicleType
  it('TEST 3: Organization Alpha cannot access Organization Beta custom VehicleType (throws 404)', async () => {
    await expect(serviceAlpha.getVehicleType('vt-beta-custom-reefer')).rejects.toThrow(NotFoundError);
  });

  // TEST 4: Vehicle correctly references VehicleType
  it('TEST 4: Physical fleet Vehicle correctly references accessible VehicleType', async () => {
    const vehicle = await serviceAlpha.registerVehicle({
      vehicleTypeId: 'vt-alpha-custom-box',
      registrationNumber: 'MH-12-TEST-01',
      fleetNumber: 'FLEET-A1',
    });

    expect(vehicle).toBeDefined();
    expect(vehicle.registrationNumber).toBe('MH-12-TEST-01');
    expect(vehicle.vehicleTypeId).toBe('vt-alpha-custom-box');

    const fetched = await serviceAlpha.getVehicle(vehicle.id);
    expect(fetched.vehicleType).toBeDefined();
    expect(fetched.vehicleType.name).toBe('Alpha Custom 24ft Box Truck');
  });

  // TEST 5: Duplicate registration number within a tenant is rejected
  it('TEST 5: Duplicate registration number within the same tenant is rejected', async () => {
    await serviceAlpha.registerVehicle({
      vehicleTypeId: 'vt-alpha-custom-box',
      registrationNumber: 'MH-12-DUP-01',
    });

    await expect(
      serviceAlpha.registerVehicle({
        vehicleTypeId: 'vt-alpha-custom-box',
        registrationNumber: 'MH-12-DUP-01',
      }),
    ).rejects.toThrow();
  });

  // TEST 6: Same registration number in different tenants is allowed by schema design
  it('TEST 6: Same registration number in different tenants is allowed by tenant isolation', async () => {
    const vehA = await serviceAlpha.registerVehicle({
      vehicleTypeId: 'vt-global-standard-32ft',
      registrationNumber: 'SHARED-REG-01',
    });

    const vehB = await serviceBeta.registerVehicle({
      vehicleTypeId: 'vt-global-standard-32ft',
      registrationNumber: 'SHARED-REG-01',
    });

    expect(vehA.registrationNumber).toBe('SHARED-REG-01');
    expect(vehB.registrationNumber).toBe('SHARED-REG-01');
    expect(vehA.organizationId).toBe(orgAlpha);
    expect(vehB.organizationId).toBe(orgBeta);
  });

  // TEST 7: Invalid vehicle dimensions are rejected
  it('TEST 7: Invalid non-positive dimensions are rejected with ValidationError', () => {
    expect(() =>
      serviceAlpha.validateSpecification({
        name: 'Invalid Dimension Truck',
        bodyType: VehicleBodyType.BOX_TRUCK,
        fuelType: VehicleFuelType.DIESEL,
        internalLength: 0, // INVALID
        internalWidth: 200,
        internalHeight: 200,
        maxPayload: 5000,
      }),
    ).toThrow(ValidationError);
  });

  // TEST 8: Invalid payload is rejected
  it('TEST 8: Non-positive payload is rejected with ValidationError', () => {
    expect(() =>
      serviceAlpha.validateSpecification({
        name: 'Invalid Payload Truck',
        bodyType: VehicleBodyType.BOX_TRUCK,
        fuelType: VehicleFuelType.DIESEL,
        internalLength: 600,
        internalWidth: 200,
        internalHeight: 200,
        maxPayload: -500, // INVALID
      }),
    ).toThrow(ValidationError);
  });

  // TEST 9: Inconsistent GVW and tare weight are rejected
  it('TEST 9: Inconsistent GVW less than tareWeight is rejected with ValidationError', () => {
    expect(() =>
      serviceAlpha.validateSpecification({
        name: 'Impossible Weight Truck',
        bodyType: VehicleBodyType.BOX_TRUCK,
        fuelType: VehicleFuelType.DIESEL,
        internalLength: 600,
        internalWidth: 200,
        internalHeight: 200,
        maxPayload: 5000,
        grossVehicleWeight: 4000, // GVW 4t
        tareWeight: 6000,         // Tare 6t (GVW < tare is physically impossible!)
      }),
    ).toThrow(ValidationError);
  });

  // TEST 10: Internal cargo dimensions exceeding external dimensions are rejected
  it('TEST 10: Internal dimensions exceeding external vehicle envelope are rejected', () => {
    expect(() =>
      serviceAlpha.validateSpecification({
        name: 'TARDIS Impossible Box',
        bodyType: VehicleBodyType.BOX_TRUCK,
        fuelType: VehicleFuelType.DIESEL,
        internalLength: 800, // Internal 800cm
        internalWidth: 240,
        internalHeight: 240,
        externalLength: 700, // External 700cm (Internal > External is physically impossible!)
        externalWidth: 250,
        externalHeight: 250,
        maxPayload: 5000,
      }),
    ).toThrow(ValidationError);
  });

  // TEST 11: VehicleType maps correctly to Phase 1B TruckCargoSpace
  it('TEST 11: VehicleType maps cleanly to Phase 1B TruckCargoSpace in integer mm and grams', () => {
    const truckSpace = serviceAlpha.toTruckCargoSpace(mockGlobalTemplate as any);

    // 975 cm -> 9750 mm
    expect(truckSpace.lengthMm).toBe(9750);
    // 244 cm -> 2440 mm
    expect(truckSpace.widthMm).toBe(2440);
    // 259 cm -> 2590 mm
    expect(truckSpace.heightMm).toBe(2590);
    // 18,500 kg -> 18,500,000 g
    expect(truckSpace.maxPayloadGrams).toBe(18_500_000);
    expect(truckSpace.name).toBe('Standard 32ft Multi-Axle Container Spec');
  });

  // TEST 12: No hardcoded vehicle specifications exist in production code
  it('TEST 12: Production service contains zero hardcoded truck models or brands', () => {
    const serviceSource = VehicleMasterService.toString();
    expect(serviceSource).not.toContain('Tata');
    expect(serviceSource).not.toContain('Ashok Leyland');
    expect(serviceSource).not.toContain('Mahindra');
    expect(serviceSource).not.toContain('BharatBenz');
    expect(serviceSource).not.toContain('Eicher');
  });

  // TEST 13: Global and tenant-specific specifications remain isolated
  it('TEST 13: Listing accessible specifications separates global templates and tenant custom specs', async () => {
    const listAlpha = await serviceAlpha.listAccessibleVehicleTypes();
    const idsAlpha = listAlpha.map((t) => t.id);

    // Org Alpha can see Global template and Alpha custom spec, but NOT Beta custom spec
    expect(idsAlpha).toContain('vt-global-standard-32ft');
    expect(idsAlpha).toContain('vt-alpha-custom-box');
    expect(idsAlpha).not.toContain('vt-beta-custom-reefer');

    const listBeta = await serviceBeta.listAccessibleVehicleTypes();
    const idsBeta = listBeta.map((t) => t.id);

    // Org Beta can see Global template and Beta custom spec, but NOT Alpha custom spec
    expect(idsBeta).toContain('vt-global-standard-32ft');
    expect(idsBeta).toContain('vt-beta-custom-reefer');
    expect(idsBeta).not.toContain('vt-alpha-custom-box');
  });

  // TEST 14: Provenance and verification status fields are preserved
  it('TEST 14: Provenance source metadata and verification status are correctly handled', async () => {
    const created = await serviceAlpha.registerVehicleType({
      name: 'Verified Heavy Duty Hauler',
      bodyType: VehicleBodyType.FLATBED,
      fuelType: VehicleFuelType.DIESEL,
      internalLength: 800,
      internalWidth: 240,
      internalHeight: 240,
      maxPayload: 15000,
      sourceName: 'OEM Technical Product Brochure',
      sourceUrl: 'https://oem.example.com/spec-sheet-2026.pdf',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2026-09-01'),
      notes: 'Reviewed and certified by engineering team',
    });

    expect(created.sourceName).toBe('OEM Technical Product Brochure');
    expect(created.sourceUrl).toBe('https://oem.example.com/spec-sheet-2026.pdf');
    expect(created.verificationStatus).toBe('VERIFIED');
    expect(created.notes).toBe('Reviewed and certified by engineering team');
  });
});
