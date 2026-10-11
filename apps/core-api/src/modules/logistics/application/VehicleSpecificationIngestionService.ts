import {
  DimensionUnit,
  Prisma,
  PrismaClient,
  VehicleBodyType,
  VehicleFuelType,
  VehicleType,
  WeightUnit,
} from '@prisma/client';
import { LogisticsRepository } from '../infrastructure/logistics.repository';
import { VehicleMasterService } from './VehicleMasterService';
import {
  IngestionResult,
  PackingCompatibilityResult,
  SpecificationSourceType,
  VehicleSpecificationIngestionInput,
  VerificationStatus,
} from './vehicle-ingestion.types';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../core/errors/app.error';

/**
 * VehicleSpecificationIngestionService
 *
 * Implements a controlled, auditable ingestion mechanism for vehicle specifications
 * from authoritative sources (OEM spec sheets, ARAI homologation, CMVR certificates).
 *
 * Architecture Principles:
 * 1. Single Validation Authority: Reuses VehicleMasterService.validateSpecification.
 * 2. Strict Provenance: Source name, source URL, source type, and verification audit trail.
 * 3. Controlled Lifecycle: All ingestions default to UNVERIFIED; only authorized workflows can mark VERIFIED or DEPRECATED.
 * 4. Conservative Duplicate Detection: Avoids merging distinct variants while preventing uncontrolled duplicate records from multiple sources.
 * 5. Packing Compatibility Analysis: Identifies whether specifications have complete cargo bays for Phase 1B packing.
 * 6. Tenant Isolation & RBAC Boundary: Master catalog (global) ingestion is restricted to SUPER_ADMIN.
 */
export class VehicleSpecificationIngestionService {
  private readonly repository: LogisticsRepository;
  private readonly masterService: VehicleMasterService;
  private readonly tenantId?: string;

  constructor(
    prismaOrRepo: PrismaClient | LogisticsRepository,
    masterServiceOrOrgId?: VehicleMasterService | string,
    organizationId?: string,
  ) {
    if (prismaOrRepo instanceof LogisticsRepository) {
      this.repository = prismaOrRepo;
    } else {
      const orgId = typeof masterServiceOrOrgId === 'string' ? masterServiceOrOrgId : organizationId;
      this.repository = new LogisticsRepository(prismaOrRepo, orgId);
    }

    if (masterServiceOrOrgId instanceof VehicleMasterService) {
      this.masterService = masterServiceOrOrgId;
    } else {
      this.masterService = new VehicleMasterService(this.repository);
    }

    this.tenantId = typeof masterServiceOrOrgId === 'string' ? masterServiceOrOrgId : organizationId;
  }

  /**
   * Ingests a technical vehicle specification into CarbonIQ.
   *
   * @param input Validated vehicle specification input
   * @param context Caller authorization context
   */
  public async ingestSpecification(
    input: VehicleSpecificationIngestionInput,
    context?: { callerRole?: string; callerId?: string },
  ): Promise<IngestionResult> {
    // 1. Authorization Boundary Check
    const isGlobal = input.isGlobal ?? false;
    if (isGlobal && context?.callerRole && context.callerRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError(
        'Forbidden: Only SUPER_ADMIN can ingest global vehicle specifications into the master catalog',
      );
    }

    // 2. Engineering Validation (reusing VehicleMasterService as single authority)
    this.masterService.validateSpecification(input as any, { allowIncompleteDimensions: true });

    // 3. Status Lifecycle Enforcement: New ingestions default strictly to UNVERIFIED
    // Even if input attempted to specify VERIFIED, it must remain UNVERIFIED until audited.
    const initialStatus = VerificationStatus.UNVERIFIED;

    // 4. Conservative Duplicate Detection
    const existingMatches = await this.repository.findMatchingVehicleTypes({
      make: input.make,
      model: input.model,
      variant: input.variant,
      bodyType: input.bodyType,
      fuelType: input.fuelType,
      isGlobal,
    });

    // Check if an existing specification matches the identity (make, model, variant, bodyType, fuelType)
    const exactDuplicate = existingMatches.find((item) => {
      const makeMatch = this.normalizeStr(item.make) === this.normalizeStr(input.make);
      const modelMatch = this.normalizeStr(item.model) === this.normalizeStr(input.model);
      const variantMatch = this.normalizeStr(item.variant) === this.normalizeStr(input.variant);
      const bodyMatch = item.bodyType === input.bodyType;
      const fuelMatch = item.fuelType === input.fuelType;
      const axleMatch = !input.axleConfiguration || item.axleConfiguration === input.axleConfiguration;

      return makeMatch && modelMatch && variantMatch && bodyMatch && fuelMatch && axleMatch;
    });

    if (exactDuplicate) {
      // Avoid creating an uncontrolled duplicate record!
      // Augment the existing record with corroborating provenance.
      const existingMetadata = (exactDuplicate.metadata as Record<string, any>) || {};
      const existingCorroborations = Array.isArray(existingMetadata.corroboratingSources)
        ? existingMetadata.corroboratingSources
        : [];

      let hasNewProvenance = false;
      const updatedCorroborations = [...existingCorroborations];

      if (input.sourceName && input.sourceName !== exactDuplicate.sourceName) {
        hasNewProvenance = true;
        updatedCorroborations.push({
          sourceName: input.sourceName,
          sourceUrl: input.sourceUrl ?? null,
          sourceType: input.sourceType ?? SpecificationSourceType.OTHER,
          referenceDate: new Date().toISOString(),
          notes: input.notes ?? 'Corroborating source ingested',
        });
      }

      if (input.corroboratingSources && input.corroboratingSources.length > 0) {
        hasNewProvenance = true;
        updatedCorroborations.push(...input.corroboratingSources);
      }

      let updatedRecord = exactDuplicate;
      let action: 'UPDATED' | 'EXISTING_UNMODIFIED' = 'EXISTING_UNMODIFIED';

      if (hasNewProvenance) {
        updatedRecord = await this.repository.updateVehicleType(
          exactDuplicate.id,
          {
            metadata: {
              ...existingMetadata,
              corroboratingSources: updatedCorroborations,
            },
            notes: input.notes
              ? `${exactDuplicate.notes ? exactDuplicate.notes + ' | ' : ''}Additional source notes: ${input.notes}`
              : exactDuplicate.notes,
          },
          isGlobal,
        );
        action = 'UPDATED';
      }

      const compatibility = VehicleMasterService.checkPackingCompatibility(updatedRecord);

      return {
        vehicleType: updatedRecord,
        action,
        isPackingCompatible: compatibility.isCompatible,
        packingCompatibilityReasons: compatibility.reasons,
        verificationStatus: updatedRecord.verificationStatus,
      };
    }

    // 5. Build New VehicleType Record
    const metadata: Record<string, any> = {
      sourceType: input.sourceType ?? SpecificationSourceType.OEM_SPEC_SHEET,
      ingestedAt: new Date().toISOString(),
      corroboratingSources: input.corroboratingSources ?? [],
    };

    const created = await this.repository.createVehicleType({
      organizationId: isGlobal ? null : (this.tenantId || null),
      name: input.name,
      make: input.make ?? null,
      model: input.model ?? null,
      variant: input.variant ?? null,
      category: input.category ?? null,
      bodyType: input.bodyType,
      fuelType: input.fuelType,
      emissionStandard: input.emissionStandard ?? null,

      internalLength: input.internalLength != null ? new Prisma.Decimal(input.internalLength) : null,
      internalWidth: input.internalWidth != null ? new Prisma.Decimal(input.internalWidth) : null,
      internalHeight: input.internalHeight != null ? new Prisma.Decimal(input.internalHeight) : null,
      dimensionUnit: input.dimensionUnit || DimensionUnit.CM,

      doorWidth: input.doorWidth ? new Prisma.Decimal(input.doorWidth) : null,
      doorHeight: input.doorHeight ? new Prisma.Decimal(input.doorHeight) : null,

      externalLength: input.externalLength ? new Prisma.Decimal(input.externalLength) : null,
      externalWidth: input.externalWidth ? new Prisma.Decimal(input.externalWidth) : null,
      externalHeight: input.externalHeight ? new Prisma.Decimal(input.externalHeight) : null,

      maxPayload: new Prisma.Decimal(input.maxPayload),
      grossVehicleWeight: input.grossVehicleWeight ? new Prisma.Decimal(input.grossVehicleWeight) : null,
      tareWeight: input.tareWeight ? new Prisma.Decimal(input.tareWeight) : null,
      weightUnit: input.weightUnit || WeightUnit.KG,

      volumetricCapacity: input.volumetricCapacity ? new Prisma.Decimal(input.volumetricCapacity) : null,
      volumeUnit: (input.volumeUnit as any) || 'M3',

      axleCount: input.axleCount ?? null,
      axleConfiguration: input.axleConfiguration ?? null,
      maxAxleWeightFront: input.maxAxleWeightFront ? new Prisma.Decimal(input.maxAxleWeightFront) : null,
      maxAxleWeightRear: input.maxAxleWeightRear ? new Prisma.Decimal(input.maxAxleWeightRear) : null,
      isRefrigerated: input.isRefrigerated ?? false,
      temperatureMin: input.temperatureMin ? new Prisma.Decimal(input.temperatureMin) : null,
      temperatureMax: input.temperatureMax ? new Prisma.Decimal(input.temperatureMax) : null,

      sourceName: input.sourceName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      sourceType: input.sourceType ?? SpecificationSourceType.OEM_SPEC_SHEET,
      verificationStatus: initialStatus,
      verifiedAt: null,
      verifiedBy: null,
      notes: input.notes ?? null,
      metadata,
    });

    const compatibility = VehicleMasterService.checkPackingCompatibility(created);

    return {
      vehicleType: created,
      action: 'CREATED',
      isPackingCompatible: compatibility.isCompatible,
      packingCompatibilityReasons: compatibility.reasons,
      verificationStatus: created.verificationStatus,
    };
  }

  /**
   * Promotes an ingested specification to VERIFIED after technical audit.
   */
  public async verifySpecification(
    id: string,
    verification: { verifiedBy: string; notes?: string },
    context?: { callerRole?: string },
  ): Promise<VehicleType> {
    const existing = await this.repository.findVehicleTypeById(id);
    const isGlobal = existing.organizationId === null;

    if (isGlobal && context?.callerRole && context.callerRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only SUPER_ADMIN can verify global vehicle specifications');
    }

    return this.repository.updateVehicleType(
      id,
      {
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: verification.verifiedBy,
        notes: verification.notes
          ? `${existing.notes ? existing.notes + ' | ' : ''}Verification notes: ${verification.notes}`
          : existing.notes,
      },
      isGlobal,
    );
  }

  /**
   * Marks an obsolete or superseded specification as DEPRECATED.
   * Deprecated specifications remain in audit logs but are ineligible for packing.
   */
  public async deprecateSpecification(
    id: string,
    deprecation: { reason: string; deprecatedBy?: string },
    context?: { callerRole?: string },
  ): Promise<VehicleType> {
    const existing = await this.repository.findVehicleTypeById(id);
    const isGlobal = existing.organizationId === null;

    if (isGlobal && context?.callerRole && context.callerRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only SUPER_ADMIN can deprecate global vehicle specifications');
    }

    return this.repository.updateVehicleType(
      id,
      {
        verificationStatus: VerificationStatus.DEPRECATED,
        notes: `${existing.notes ? existing.notes + ' | ' : ''}DEPRECATED: ${deprecation.reason} (by ${deprecation.deprecatedBy ?? 'system'})`,
      },
      isGlobal,
    );
  }

  /**
   * Evaluates if a vehicle specification is eligible for Phase 1B 3D packing.
   */
  public checkPackingCompatibility(
    vt: VehicleType | VehicleSpecificationIngestionInput,
  ): PackingCompatibilityResult {
    return VehicleMasterService.checkPackingCompatibility(vt);
  }

  private normalizeStr(val?: string | null): string {
    return (val || '').trim().toLowerCase();
  }
}
