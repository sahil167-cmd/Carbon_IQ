import {
  DimensionUnit,
  Prisma,
  PrismaClient,
  Vehicle,
  VehicleBodyType,
  VehicleFuelType,
  VehicleType,
  WeightUnit,
} from '@prisma/client';
import { LogisticsRepository, VehicleWithSpecification } from '../infrastructure/logistics.repository';
import { UnitNormalizer } from './unit-normalizer';
import { TruckCargoSpace } from '../domain/packing/types';
import { ValidationError } from '../../../core/errors/app.error';

export interface VehicleSpecificationInput {
  name: string;
  make?: string | null;
  model?: string | null;
  variant?: string | null;
  category?: string | null;
  bodyType: VehicleBodyType;
  fuelType: VehicleFuelType;
  emissionStandard?: string | null;

  internalLength?: Prisma.Decimal | number | string | null;
  internalWidth?: Prisma.Decimal | number | string | null;
  internalHeight?: Prisma.Decimal | number | string | null;
  dimensionUnit?: DimensionUnit;

  doorWidth?: Prisma.Decimal | number | string | null;
  doorHeight?: Prisma.Decimal | number | string | null;

  externalLength?: Prisma.Decimal | number | string | null;
  externalWidth?: Prisma.Decimal | number | string | null;
  externalHeight?: Prisma.Decimal | number | string | null;

  maxPayload: Prisma.Decimal | number | string;
  grossVehicleWeight?: Prisma.Decimal | number | string | null;
  tareWeight?: Prisma.Decimal | number | string | null;
  weightUnit?: WeightUnit;

  volumetricCapacity?: Prisma.Decimal | number | string | null;
  volumeUnit?: 'M3' | 'CFT' | 'LITER' | 'CM3';

  axleCount?: number | null;
  axleConfiguration?: string | null;
  maxAxleWeightFront?: Prisma.Decimal | number | string | null;
  maxAxleWeightRear?: Prisma.Decimal | number | string | null;
  isRefrigerated?: boolean;
  temperatureMin?: Prisma.Decimal | number | string | null;
  temperatureMax?: Prisma.Decimal | number | string | null;

  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceType?: string | null;
  verificationStatus?: string;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export interface PhysicalVehicleInput {
  vehicleTypeId: string;
  registrationNumber: string;
  fleetNumber?: string;
  homeSiteId?: string;
  status?: string;
  yearOfManufacture?: number;
  currentOdometerKm?: Prisma.Decimal | number | string;
  notes?: string;
}

/**
 * VehicleMasterService
 *
 * Dedicated domain and application service for vehicle specification templates (VehicleType)
 * and physical fleet assets (Vehicle).
 *
 * Responsibilities:
 * 1. Engineering validation of vehicle specifications (dimensional integrity, GVW consistency).
 * 2. Tenant isolation enforcement (Global templates vs Tenant custom specs).
 * 3. Conversion of VehicleType into Phase 1B TruckCargoSpace for downstream packing.
 * 4. Zero hardcoded manufacturer models.
 */
export class VehicleMasterService {
  private readonly repository: LogisticsRepository;

  constructor(prismaOrRepo: PrismaClient | LogisticsRepository, organizationId?: string) {
    if (prismaOrRepo instanceof LogisticsRepository) {
      this.repository = prismaOrRepo;
    } else {
      this.repository = new LogisticsRepository(prismaOrRepo, organizationId);
    }
  }

  /**
   * Retrieves a VehicleType specification template.
   * Accessible if it belongs to tenant OR is a global system template.
   */
  public async getVehicleType(id: string): Promise<VehicleType> {
    return this.repository.findVehicleTypeById(id);
  }

  /**
   * Lists all accessible vehicle specifications (Global approved templates + Tenant custom specs).
   */
  public async listAccessibleVehicleTypes(): Promise<VehicleType[]> {
    return this.repository.listAccessibleVehicleTypes();
  }

  /**
   * Lists global approved vehicle specifications.
   */
  public async listGlobalVehicleTypes(): Promise<VehicleType[]> {
    return this.repository.listGlobalVehicleTypes();
  }

  /**
   * Lists custom vehicle specifications belonging to the tenant.
   */
  public async listTenantVehicleTypes(): Promise<VehicleType[]> {
    return this.repository.listTenantVehicleTypes();
  }

  /**
   * Retrieves a physical fleet vehicle strictly belonging to the tenant.
   */
  public async getVehicle(id: string): Promise<VehicleWithSpecification> {
    return this.repository.findVehicleById(id);
  }

  /**
   * Lists all physical fleet vehicles belonging to the tenant.
   */
  public async listTenantVehicles(): Promise<VehicleWithSpecification[]> {
    return this.repository.listTenantVehicles();
  }

  /**
   * Validates and registers a new tenant-custom vehicle specification template.
   */
  /**
   * Validates and registers a new tenant-custom vehicle specification template.
   */
  public async registerVehicleType(input: VehicleSpecificationInput): Promise<VehicleType> {
    this.validateSpecification(input);

    return this.repository.createVehicleType({
      name: input.name,
      make: input.make,
      model: input.model,
      variant: input.variant,
      category: input.category,
      bodyType: input.bodyType,
      fuelType: input.fuelType,
      emissionStandard: input.emissionStandard,

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

      axleCount: input.axleCount,
      axleConfiguration: input.axleConfiguration,
      maxAxleWeightFront: input.maxAxleWeightFront ? new Prisma.Decimal(input.maxAxleWeightFront) : null,
      maxAxleWeightRear: input.maxAxleWeightRear ? new Prisma.Decimal(input.maxAxleWeightRear) : null,
      isRefrigerated: input.isRefrigerated ?? false,
      temperatureMin: input.temperatureMin ? new Prisma.Decimal(input.temperatureMin) : null,
      temperatureMax: input.temperatureMax ? new Prisma.Decimal(input.temperatureMax) : null,

      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      sourceType: input.sourceType,
      verificationStatus: input.verificationStatus || 'UNVERIFIED',
      verifiedAt: input.verifiedAt,
      verifiedBy: input.verifiedBy,
      notes: input.notes,
      metadata: input.metadata ?? undefined,
    });
  }

  /**
   * Registers a physical vehicle in the tenant's fleet.
   */
  public async registerVehicle(input: PhysicalVehicleInput): Promise<Vehicle> {
    if (!input.registrationNumber || input.registrationNumber.trim().length === 0) {
      throw new ValidationError('registrationNumber is required');
    }

    // Verify VehicleType is accessible to this tenant
    await this.repository.findVehicleTypeById(input.vehicleTypeId);

    return this.repository.createVehicle({
      vehicleTypeId: input.vehicleTypeId,
      registrationNumber: input.registrationNumber.trim().toUpperCase(),
      fleetNumber: input.fleetNumber,
      homeSiteId: input.homeSiteId,
      status: input.status || 'ACTIVE',
      yearOfManufacture: input.yearOfManufacture,
      currentOdometerKm: input.currentOdometerKm ? new Prisma.Decimal(input.currentOdometerKm) : null,
      notes: input.notes,
    });
  }

  /**
   * Evaluates whether a VehicleType or input specification satisfies all cargo dimensions
   * and operational constraints required for Phase 1B 3D packing.
   */
  public static checkPackingCompatibility(
    vt:
      | Pick<VehicleType, 'internalLength' | 'internalWidth' | 'internalHeight' | 'maxPayload' | 'verificationStatus'>
      | VehicleSpecificationInput,
  ): { isCompatible: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (vt.verificationStatus === 'DEPRECATED') {
      reasons.push('Vehicle specification is deprecated and ineligible for load planning');
    }

    if (vt.internalLength == null || new Prisma.Decimal(vt.internalLength).lessThanOrEqualTo(0)) {
      reasons.push('Missing or non-positive internal cargo length');
    }
    if (vt.internalWidth == null || new Prisma.Decimal(vt.internalWidth).lessThanOrEqualTo(0)) {
      reasons.push('Missing or non-positive internal cargo width');
    }
    if (vt.internalHeight == null || new Prisma.Decimal(vt.internalHeight).lessThanOrEqualTo(0)) {
      reasons.push('Missing or non-positive internal cargo height');
    }
    if (vt.maxPayload == null || new Prisma.Decimal(vt.maxPayload).lessThanOrEqualTo(0)) {
      reasons.push('Missing or non-positive max payload');
    }

    return {
      isCompatible: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Maps a persistent VehicleType into a normalized Phase 1B TruckCargoSpace.
   */
  public toTruckCargoSpace(vehicleType: VehicleType): TruckCargoSpace {
    const compatibility = VehicleMasterService.checkPackingCompatibility(vehicleType);
    if (!compatibility.isCompatible) {
      throw new ValidationError(
        `Vehicle specification '${vehicleType.name}' is not packing-compatible: ${compatibility.reasons.join('; ')}`,
      );
    }

    return {
      lengthMm: UnitNormalizer.toIntegerMm(vehicleType.internalLength!, vehicleType.dimensionUnit, 'vehicleType.internalLength'),
      widthMm: UnitNormalizer.toIntegerMm(vehicleType.internalWidth!, vehicleType.dimensionUnit, 'vehicleType.internalWidth'),
      heightMm: UnitNormalizer.toIntegerMm(vehicleType.internalHeight!, vehicleType.dimensionUnit, 'vehicleType.internalHeight'),
      maxPayloadGrams: UnitNormalizer.toIntegerGrams(vehicleType.maxPayload, vehicleType.weightUnit, 'vehicleType.maxPayload'),
      name: vehicleType.name,
    };
  }

  /**
   * Validates engineering limits of vehicle specifications.
   * Acts as the single central validation authority for vehicle specifications.
   */
  public validateSpecification(
    input: VehicleSpecificationInput,
    options?: { allowIncompleteDimensions?: boolean },
  ): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Vehicle specification name is required');
    }

    // 1. Enum & Unit Validation
    if (input.dimensionUnit && !Object.values(DimensionUnit).includes(input.dimensionUnit)) {
      throw new ValidationError(`Invalid dimensionUnit: '${input.dimensionUnit}'. Allowed: ${Object.values(DimensionUnit).join(', ')}`);
    }
    if (input.weightUnit && !Object.values(WeightUnit).includes(input.weightUnit)) {
      throw new ValidationError(`Invalid weightUnit: '${input.weightUnit}'. Allowed: ${Object.values(WeightUnit).join(', ')}`);
    }
    if (input.bodyType && !Object.values(VehicleBodyType).includes(input.bodyType)) {
      throw new ValidationError(`Invalid bodyType: '${input.bodyType}'. Allowed: ${Object.values(VehicleBodyType).join(', ')}`);
    }
    if (input.fuelType && !Object.values(VehicleFuelType).includes(input.fuelType)) {
      throw new ValidationError(`Invalid fuelType: '${input.fuelType}'. Allowed: ${Object.values(VehicleFuelType).join(', ')}`);
    }

    // 2. Internal Dimensions Validation
    let intLength: Prisma.Decimal | null = null;
    let intWidth: Prisma.Decimal | null = null;
    let intHeight: Prisma.Decimal | null = null;

    if (input.internalLength !== undefined && input.internalLength !== null) {
      intLength = new Prisma.Decimal(input.internalLength);
      if (intLength.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle internal length must be strictly positive');
      }
    } else if (!options?.allowIncompleteDimensions) {
      throw new ValidationError('Vehicle internal dimensions (length, width, height) are required');
    }

    if (input.internalWidth !== undefined && input.internalWidth !== null) {
      intWidth = new Prisma.Decimal(input.internalWidth);
      if (intWidth.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle internal width must be strictly positive');
      }
    } else if (!options?.allowIncompleteDimensions) {
      throw new ValidationError('Vehicle internal dimensions (length, width, height) are required');
    }

    if (input.internalHeight !== undefined && input.internalHeight !== null) {
      intHeight = new Prisma.Decimal(input.internalHeight);
      if (intHeight.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle internal height must be strictly positive');
      }
    } else if (!options?.allowIncompleteDimensions) {
      throw new ValidationError('Vehicle internal dimensions (length, width, height) are required');
    }

    // 3. Payload Validation (> 0)
    if (input.maxPayload === undefined || input.maxPayload === null) {
      throw new ValidationError('Vehicle maxPayload is required');
    }
    const payload = new Prisma.Decimal(input.maxPayload);
    if (payload.lessThanOrEqualTo(0)) {
      throw new ValidationError('Vehicle maxPayload must be strictly positive');
    }

    // 4. Weight Consistency Validation: GVW >= tare + payload
    if (input.grossVehicleWeight !== undefined && input.grossVehicleWeight !== null) {
      const gvw = new Prisma.Decimal(input.grossVehicleWeight);
      if (gvw.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle grossVehicleWeight must be strictly positive when supplied');
      }

      if (input.tareWeight !== undefined && input.tareWeight !== null) {
        const tare = new Prisma.Decimal(input.tareWeight);
        if (tare.lessThan(0)) {
          throw new ValidationError('Vehicle tareWeight cannot be negative');
        }

        if (gvw.lessThan(tare)) {
          throw new ValidationError(`Gross vehicle weight (${gvw}) cannot be less than tare weight (${tare})`);
        }

        const calculatedGvw = tare.plus(payload);
        // Allow a 10% engineering margin if specified GVW differs from tare + payload
        if (gvw.lessThan(calculatedGvw.mul(new Prisma.Decimal('0.90')))) {
          throw new ValidationError(
            `Inconsistent weight ratings: grossVehicleWeight (${gvw}) is significantly less than tareWeight (${tare}) + maxPayload (${payload})`,
          );
        }
      }
    }

    // 5. External Dimensions Consistency Validation: External >= Internal
    if (input.externalLength !== undefined && input.externalLength !== null) {
      const extLength = new Prisma.Decimal(input.externalLength);
      if (extLength.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle external length must be strictly positive when supplied');
      }
      if (intLength && extLength.lessThan(intLength)) {
        throw new ValidationError(`External length (${extLength}) cannot be less than internal cargo length (${intLength})`);
      }
    }

    if (input.externalWidth !== undefined && input.externalWidth !== null) {
      const extWidth = new Prisma.Decimal(input.externalWidth);
      if (extWidth.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle external width must be strictly positive when supplied');
      }
      if (intWidth && extWidth.lessThan(intWidth)) {
        throw new ValidationError(`External width (${extWidth}) cannot be less than internal cargo width (${intWidth})`);
      }
    }

    if (input.externalHeight !== undefined && input.externalHeight !== null) {
      const extHeight = new Prisma.Decimal(input.externalHeight);
      if (extHeight.lessThanOrEqualTo(0)) {
        throw new ValidationError('Vehicle external height must be strictly positive when supplied');
      }
      if (intHeight && extHeight.lessThan(intHeight)) {
        throw new ValidationError(`External height (${extHeight}) cannot be less than internal cargo height (${intHeight})`);
      }
    }

    // 6. Axle Count Validation
    if (input.axleCount !== undefined && input.axleCount !== null) {
      if (!Number.isInteger(input.axleCount) || input.axleCount <= 0) {
        throw new ValidationError(`Axle count must be a positive integer, received: ${input.axleCount}`);
      }
    }
  }
}
