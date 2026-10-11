import fs from 'fs';
import path from 'path';
import {
  DimensionUnit,
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  WeightUnit,
} from '@prisma/client';
import { VehicleSpecificationIngestionService } from '../application/VehicleSpecificationIngestionService';
import { VehicleMasterService } from '../application/VehicleMasterService';
import { LogisticsRepository } from '../infrastructure/logistics.repository';
import {
  SpecificationSourceType,
  VehicleSpecificationIngestionInput,
  VerificationStatus,
} from '../application/vehicle-ingestion.types';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../core/errors/app.error';

describe('Phase 2B — Real Indian Vehicle Specification Ingestion Foundation', () => {
  const orgAlpha = 'org-tenant-alpha-001';
  const orgBeta = 'org-tenant-beta-002';

  // Base Synthetic Specification Fixture (Strictly synthetic — no real truck data)
  const syntheticValidSpec: VehicleSpecificationIngestionInput = {
    name: 'Synthetic Medium Duty 16T Box Truck',
    make: 'Synthetic Commercial OEM',
    model: 'Apex-1615',
    variant: 'Standard 20ft Closed Container',
    category: 'MEDIUM_DUTY',
    bodyType: VehicleBodyType.BOX_TRUCK,
    fuelType: VehicleFuelType.DIESEL,
    emissionStandard: 'BS-VI',

    internalLength: 600, // 6.00m in CM
    internalWidth: 240,
    internalHeight: 240,
    dimensionUnit: DimensionUnit.CM,

    doorWidth: 230,
    doorHeight: 230,

    externalLength: 650,
    externalWidth: 250,
    externalHeight: 260,

    maxPayload: 10500, // 10.5t in KG
    grossVehicleWeight: 16200,
    tareWeight: 5700,
    weightUnit: WeightUnit.KG,

    axleCount: 2,
    axleConfiguration: '4x2',

    sourceName: 'Synthetic OEM Spec Sheet Rev 2026',
    sourceUrl: 'https://authoritative-specs.internal/synthetic/apex-1615.pdf',
    sourceType: SpecificationSourceType.OEM_SPEC_SHEET,
    notes: 'Homologated technical specification test fixture',
  };

  let dbVehicleTypes: any[] = [];
  let mockPrisma: any;
  let repoAlpha: LogisticsRepository;
  let repoBeta: LogisticsRepository;
  let masterServiceAlpha: VehicleMasterService;
  let ingestionServiceAlpha: VehicleSpecificationIngestionService;
  let ingestionServiceBeta: VehicleSpecificationIngestionService;
  let ingestionServiceGlobal: VehicleSpecificationIngestionService;

  beforeEach(() => {
    dbVehicleTypes = [];

    mockPrisma = {
      vehicleType: {
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            dbVehicleTypes.find((vt) => {
              if (where.id && vt.id !== where.id) return false;
              if (where.organizationId !== undefined) {
                if (where.organizationId === null && vt.organizationId !== null) return false;
                if (where.organizationId !== null && vt.organizationId !== where.organizationId) return false;
              }
              if (where.OR) {
                const match = where.OR.some((cond: any) => {
                  if (cond.organizationId === null) return vt.organizationId === null;
                  return vt.organizationId === cond.organizationId;
                });
                if (!match) return false;
              }
              return true;
            }) || null
          );
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return dbVehicleTypes.filter((vt) => {
            if (where.isActive !== undefined && vt.isActive !== where.isActive) return false;
            if (where.organizationId !== undefined) {
              if (where.organizationId === null && vt.organizationId !== null) return false;
              if (where.organizationId !== null && vt.organizationId !== where.organizationId) return false;
            }
            if (where.OR) {
              const match = where.OR.some((cond: any) => {
                if (cond.organizationId === null) return vt.organizationId === null;
                return vt.organizationId === cond.organizationId;
              });
              if (!match) return false;
            }
            if (where.make?.equals) {
              if ((vt.make || '').toLowerCase() !== where.make.equals.toLowerCase()) return false;
            }
            if (where.model?.equals) {
              if ((vt.model || '').toLowerCase() !== where.model.equals.toLowerCase()) return false;
            }
            if (where.variant?.equals) {
              if ((vt.variant || '').toLowerCase() !== where.variant.equals.toLowerCase()) return false;
            }
            if (where.bodyType && vt.bodyType !== where.bodyType) return false;
            if (where.fuelType && vt.fuelType !== where.fuelType) return false;

            return true;
          });
        }),
        create: jest.fn(async ({ data }: any) => {
          const record = {
            id: `vt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ...data,
            verificationStatus: data.verificationStatus || 'UNVERIFIED',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          dbVehicleTypes.push(record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const index = dbVehicleTypes.findIndex((v) => v.id === where.id);
          if (index === -1) throw new Error('Record not found');
          const updated = {
            ...dbVehicleTypes[index],
            ...data,
            updatedAt: new Date(),
          };
          dbVehicleTypes[index] = updated;
          return updated;
        }),
      },
    };

    repoAlpha = new LogisticsRepository(mockPrisma, orgAlpha);
    repoBeta = new LogisticsRepository(mockPrisma, orgBeta);
    masterServiceAlpha = new VehicleMasterService(repoAlpha);

    ingestionServiceAlpha = new VehicleSpecificationIngestionService(repoAlpha, masterServiceAlpha, orgAlpha);
    ingestionServiceBeta = new VehicleSpecificationIngestionService(repoBeta, undefined, orgBeta);
    ingestionServiceGlobal = new VehicleSpecificationIngestionService(new LogisticsRepository(mockPrisma, undefined));
  });

  // ===========================================================================
  // TEST 1: Valid synthetic vehicle specification can be ingested
  // ===========================================================================
  it('TEST 1: Valid synthetic vehicle specification can be ingested', async () => {
    const result = await ingestionServiceAlpha.ingestSpecification(syntheticValidSpec);

    expect(result.action).toBe('CREATED');
    expect(result.vehicleType.id).toBeDefined();
    expect(result.vehicleType.name).toBe(syntheticValidSpec.name);
    expect(result.vehicleType.make).toBe(syntheticValidSpec.make);
    expect(result.vehicleType.model).toBe(syntheticValidSpec.model);
    expect(result.isPackingCompatible).toBe(true);
    expect(result.packingCompatibilityReasons).toHaveLength(0);
  });

  // ===========================================================================
  // TEST 2: Invalid dimensions are rejected
  // ===========================================================================
  it('TEST 2: Invalid dimensions are rejected', async () => {
    // Non-positive internal length
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        internalLength: 0,
      }),
    ).rejects.toThrow(ValidationError);

    // Negative internal height
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        internalHeight: -200,
      }),
    ).rejects.toThrow(ValidationError);

    // Internal length larger than external length
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        internalLength: 800,
        externalLength: 700,
      }),
    ).rejects.toThrow(ValidationError);
  });

  // ===========================================================================
  // TEST 3: Invalid payload is rejected
  // ===========================================================================
  it('TEST 3: Invalid payload is rejected', async () => {
    // Zero payload
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        maxPayload: 0,
      }),
    ).rejects.toThrow(ValidationError);

    // Negative payload
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        maxPayload: -1500,
      }),
    ).rejects.toThrow(ValidationError);
  });

  // ===========================================================================
  // TEST 4: Invalid GVW is rejected
  // ===========================================================================
  it('TEST 4: Invalid GVW is rejected', async () => {
    // Zero GVW
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        grossVehicleWeight: 0,
      }),
    ).rejects.toThrow(ValidationError);

    // Negative GVW
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        grossVehicleWeight: -5000,
      }),
    ).rejects.toThrow(ValidationError);

    // Inconsistent GVW less than tare weight
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        grossVehicleWeight: 4000,
        tareWeight: 6000,
      }),
    ).rejects.toThrow(ValidationError);
  });

  // ===========================================================================
  // TEST 5: Invalid weight/dimension units are rejected
  // ===========================================================================
  it('TEST 5: Invalid weight/dimension units are rejected', async () => {
    // Unknown dimension unit
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        dimensionUnit: 'YARDS' as any,
      }),
    ).rejects.toThrow(ValidationError);

    // Unknown weight unit
    await expect(
      ingestionServiceAlpha.ingestSpecification({
        ...syntheticValidSpec,
        weightUnit: 'POUNDS_UNKNOWN' as any,
      }),
    ).rejects.toThrow(ValidationError);
  });

  // ===========================================================================
  // TEST 6: Incomplete cargo dimensions are accepted but marked NOT packing-compatible
  // ===========================================================================
  it('TEST 6: Incomplete cargo dimensions are accepted as a specification but marked NOT packing-compatible', async () => {
    // Cowl chassis specification without internal cargo box dimensions
    const chassisSpec: VehicleSpecificationIngestionInput = {
      name: 'Synthetic 28T 6x2 Cowl Chassis Spec',
      make: 'Synthetic Commercial OEM',
      model: 'Chassis-2820',
      variant: 'Cab-Chassis Only',
      bodyType: VehicleBodyType.FLATBED,
      fuelType: VehicleFuelType.DIESEL,
      maxPayload: 20000,
      grossVehicleWeight: 28000,
      tareWeight: 8000,
      internalLength: null,
      internalWidth: null,
      internalHeight: null,
      sourceName: 'ARAI Homologation Certificate',
      sourceType: SpecificationSourceType.ARAI_HOMOLOGATION,
    };

    const result = await ingestionServiceAlpha.ingestSpecification(chassisSpec);

    expect(result.action).toBe('CREATED');
    expect(result.vehicleType.id).toBeDefined();
    expect(result.isPackingCompatible).toBe(false);
    expect(result.packingCompatibilityReasons.length).toBeGreaterThan(0);
    expect(result.packingCompatibilityReasons.some((r) => r.includes('internal cargo'))).toBe(true);
  });

  // ===========================================================================
  // TEST 7: Complete valid cargo dimensions produce packing compatibility
  // ===========================================================================
  it('TEST 7: Complete valid cargo dimensions produce packing compatibility', async () => {
    const result = await ingestionServiceAlpha.ingestSpecification(syntheticValidSpec);

    expect(result.isPackingCompatible).toBe(true);
    expect(result.packingCompatibilityReasons).toHaveLength(0);

    const check = ingestionServiceAlpha.checkPackingCompatibility(result.vehicleType);
    expect(check.isCompatible).toBe(true);
  });

  // ===========================================================================
  // TEST 8: Imported specifications default to UNVERIFIED
  // ===========================================================================
  it('TEST 8: Imported specifications default to UNVERIFIED', async () => {
    const result = await ingestionServiceAlpha.ingestSpecification(syntheticValidSpec);

    expect(result.verificationStatus).toBe(VerificationStatus.UNVERIFIED);
    expect(result.vehicleType.verificationStatus).toBe('UNVERIFIED');
  });

  // ===========================================================================
  // TEST 9: Verification status does not automatically become VERIFIED after ingestion
  // ===========================================================================
  it('TEST 9: Verification status does not automatically become VERIFIED after ingestion', async () => {
    // Input attempting to claim it is already verified
    const result = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      verificationStatus: VerificationStatus.VERIFIED,
    });

    // Ingestion pipeline must override or enforce initial unverified state
    expect(result.verificationStatus).toBe(VerificationStatus.UNVERIFIED);
    expect(result.vehicleType.verificationStatus).toBe('UNVERIFIED');

    // Only explicit verifySpecification call can promote it
    const verified = await ingestionServiceAlpha.verifySpecification(result.vehicleType.id, {
      verifiedBy: 'user-senior-auditor-01',
      notes: 'Reviewed against OEM engineering release',
    });
    expect(verified.verificationStatus).toBe(VerificationStatus.VERIFIED);
  });

  // ===========================================================================
  // TEST 10: Duplicate detection does not incorrectly merge distinct variants
  // ===========================================================================
  it('TEST 10: Duplicate detection does not incorrectly merge distinct variants', async () => {
    // Variant 1: Closed Box
    const res1 = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      model: 'Apex-Series',
      variant: 'Closed Box 24ft',
      bodyType: VehicleBodyType.BOX_TRUCK,
    });

    // Variant 2: Refrigerated Box (same make & model, different variant & bodyType)
    const res2 = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      model: 'Apex-Series',
      variant: 'Refrigerated 24ft',
      bodyType: VehicleBodyType.REFRIGERATED,
    });

    // Variant 3: Electric Variant (same make & model, different fuelType)
    const res3 = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      model: 'Apex-Series',
      variant: 'Electric Closed Box 24ft',
      fuelType: VehicleFuelType.ELECTRIC,
    });

    expect(res1.action).toBe('CREATED');
    expect(res2.action).toBe('CREATED');
    expect(res3.action).toBe('CREATED');
    expect(res1.vehicleType.id).not.toBe(res2.vehicleType.id);
    expect(res2.vehicleType.id).not.toBe(res3.vehicleType.id);
  });

  // ===========================================================================
  // TEST 11: Same vehicle source does not create uncontrolled duplicate records
  // ===========================================================================
  it('TEST 11: Same vehicle source does not create uncontrolled duplicate records', async () => {
    // Initial ingestion from primary OEM sheet
    const initial = await ingestionServiceAlpha.ingestSpecification(syntheticValidSpec);
    expect(initial.action).toBe('CREATED');
    const initialId = initial.vehicleType.id;

    // Subsequent ingestion of the identical vehicle from an authoritative regulatory record
    const subsequent = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      sourceName: 'CMVR National Vehicle Registry',
      sourceUrl: 'https://cmvr.internal/spec/apex-1615',
      sourceType: SpecificationSourceType.CMVR_CERTIFICATE,
      notes: 'Secondary corroborating specification entry',
    });

    // Must recognize the duplicate and update/augment rather than creating a second record
    expect(subsequent.action).toBe('UPDATED');
    expect(subsequent.vehicleType.id).toBe(initialId);

    // Corroborating provenance must be preserved in metadata
    const metadata = subsequent.vehicleType.metadata as any;
    expect(metadata.corroboratingSources).toBeDefined();
    expect(metadata.corroboratingSources.length).toBeGreaterThanOrEqual(1);
    expect(metadata.corroboratingSources.some((s: any) => s.sourceName === 'CMVR National Vehicle Registry')).toBe(true);
  });

  // ===========================================================================
  // TEST 12: Global VehicleType remains accessible according to Phase 2A rules
  // ===========================================================================
  it('TEST 12: Global VehicleType remains accessible according to Phase 2A rules', async () => {
    // Ingest global specification (requires SUPER_ADMIN role)
    const globalResult = await ingestionServiceGlobal.ingestSpecification(
      {
        ...syntheticValidSpec,
        isGlobal: true,
      },
      { callerRole: 'SUPER_ADMIN' },
    );

    expect(globalResult.vehicleType.organizationId).toBeNull();

    // Tenant Alpha should be able to find and access this global vehicle type
    const foundByAlpha = await repoAlpha.findVehicleTypeById(globalResult.vehicleType.id);
    expect(foundByAlpha).toBeDefined();
    expect(foundByAlpha.id).toBe(globalResult.vehicleType.id);

    // Tenant Beta should also be able to find and access this global vehicle type
    const foundByBeta = await repoBeta.findVehicleTypeById(globalResult.vehicleType.id);
    expect(foundByBeta).toBeDefined();
    expect(foundByBeta.id).toBe(globalResult.vehicleType.id);
  });

  // ===========================================================================
  // TEST 13: Tenant custom VehicleType remains tenant-isolated
  // ===========================================================================
  it('TEST 13: Tenant custom VehicleType remains tenant-isolated', async () => {
    // Tenant Alpha ingests a custom specification
    const alphaCustom = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      isGlobal: false,
    });

    expect(alphaCustom.vehicleType.organizationId).toBe(orgAlpha);

    // Tenant Alpha can retrieve its own custom spec
    const foundByAlpha = await repoAlpha.findVehicleTypeById(alphaCustom.vehicleType.id);
    expect(foundByAlpha.id).toBe(alphaCustom.vehicleType.id);
    expect(foundByAlpha.organizationId).toBe(orgAlpha);
  });

  // ===========================================================================
  // TEST 14: Cross-tenant access still produces NotFoundError
  // ===========================================================================
  it('TEST 14: Cross-tenant access still produces NotFoundError', async () => {
    // Tenant Alpha ingests a custom specification
    const alphaCustom = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      isGlobal: false,
    });

    // Tenant Beta attempts to retrieve Tenant Alpha's custom specification
    await expect(repoBeta.findVehicleTypeById(alphaCustom.vehicleType.id)).rejects.toThrow(NotFoundError);
  });

  // ===========================================================================
  // TEST 15: No hardcoded real truck specifications exist in production code
  // ===========================================================================
  it('TEST 15: No hardcoded real truck specifications exist in production code', () => {
    const forbiddenPatterns = [
      /\bTata\s+Motors\b/i,
      /\bAshok\s+Leyland\b/i,
      /\bBharatBenz\b/i,
      /\bEicher\b/i,
      /\bMahindra\s+Bolero\b/i,
      /\bTata\s+Ace\b/i,
      /\bSigna\s+4825\b/i,
      /\bEcomet\s+1615\b/i,
    ];

    const productionFiles = [
      path.resolve(__dirname, '../application/VehicleMasterService.ts'),
      path.resolve(__dirname, '../application/VehicleSpecificationIngestionService.ts'),
      path.resolve(__dirname, '../application/vehicle-ingestion.types.ts'),
      path.resolve(__dirname, '../infrastructure/logistics.repository.ts'),
    ];

    for (const filePath of productionFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Strip code comments (e.g. documentation comments illustrating future supported makes)
        const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(codeWithoutComments)).toBe(false);
        }
      }
    }
  });

  // ===========================================================================
  // TEST 16: Provenance information is preserved
  // ===========================================================================
  it('TEST 16: Provenance information is preserved', async () => {
    const result = await ingestionServiceAlpha.ingestSpecification({
      ...syntheticValidSpec,
      sourceName: 'Official OEM Technical Spec Portal v2',
      sourceUrl: 'https://oem-specs.test/doc/12345',
      sourceType: SpecificationSourceType.OFFICIAL_MANUFACTURER_PORTAL,
      notes: 'Specification verified with homologation document #H-9876',
      corroboratingSources: [
        {
          sourceName: 'State Transport Homologation Bulletin',
          sourceType: SpecificationSourceType.AUTHORITATIVE_REGULATORY_RECORD,
          notes: 'Corroborating record',
        },
      ],
    });

    expect(result.vehicleType.sourceName).toBe('Official OEM Technical Spec Portal v2');
    expect(result.vehicleType.sourceUrl).toBe('https://oem-specs.test/doc/12345');
    expect(result.vehicleType.sourceType).toBe('OFFICIAL_MANUFACTURER_PORTAL');
    expect(result.vehicleType.notes).toContain('homologation document #H-9876');

    const metadata = result.vehicleType.metadata as any;
    expect(metadata.corroboratingSources).toHaveLength(1);
    expect(metadata.corroboratingSources[0].sourceName).toBe('State Transport Homologation Bulletin');
  });

  // ===========================================================================
  // TEST 17: Deprecated specification is not treated as an approved packing candidate
  // ===========================================================================
  it('TEST 17: Deprecated specification is not treated as an approved packing candidate', async () => {
    const result = await ingestionServiceAlpha.ingestSpecification(syntheticValidSpec);
    expect(result.isPackingCompatible).toBe(true);

    // Deprecate the specification
    const deprecated = await ingestionServiceAlpha.deprecateSpecification(result.vehicleType.id, {
      reason: 'Superseded by updated axle-load norms',
      deprecatedBy: 'auditor-007',
    });

    expect(deprecated.verificationStatus).toBe(VerificationStatus.DEPRECATED);

    // Evaluation must flag it as ineligible for packing
    const check = ingestionServiceAlpha.checkPackingCompatibility(deprecated);
    expect(check.isCompatible).toBe(false);
    expect(check.reasons.some((r) => r.toLowerCase().includes('deprecated'))).toBe(true);

    // Calling toTruckCargoSpace on deprecated spec must throw ValidationError
    expect(() => masterServiceAlpha.toTruckCargoSpace(deprecated)).toThrow(ValidationError);
  });

  // ===========================================================================
  // TEST 18: Existing VehicleMasterService validation remains single authority
  // ===========================================================================
  it('TEST 18: Existing VehicleMasterService validation remains the single engineering validation authority', async () => {
    const spy = jest.spyOn(masterServiceAlpha, 'validateSpecification');

    await ingestionServiceAlpha.ingestSpecification(syntheticValidSpec);

    // Confirm that VehicleSpecificationIngestionService delegated directly to VehicleMasterService
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
