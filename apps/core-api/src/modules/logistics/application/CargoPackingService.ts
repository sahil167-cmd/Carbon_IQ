import { PrismaClient, VehicleType } from '@prisma/client';
import { CargoPackingEngine } from '../domain/packing/CargoPackingEngine';
import {
  CargoItemInput,
  OrientationType,
  PackingResult,
  TruckCargoSpace,
} from '../domain/packing/types';
import { LogisticsRepository } from '../infrastructure/logistics.repository';
import { UnitNormalizer } from './unit-normalizer';
import {
  DirectCargoItem,
  DirectVehicleSpec,
  PackManifestInput,
  PackShipmentInput,
} from './types';
import { ValidationError } from '../../../core/errors/app.error';

/**
 * CargoPackingService
 *
 * Domain/Application integration layer bridging CarbonIQ persistent database models
 * with the pure domain CargoPackingEngine.
 *
 * Responsibilities:
 * 1. Tenant boundary enforcement via LogisticsRepository.
 * 2. Explicit, audit-grade unit normalization (Persistence Decimals -> Normalized Integer Units).
 * 3. Input sanitization and pre-packing validation.
 * 4. Delegation to the deterministic CargoPackingEngine.
 * 5. Formatting resulting domain LoadPlan structures.
 */
export class CargoPackingService {
  private readonly repository: LogisticsRepository;
  private readonly packingEngine: CargoPackingEngine;

  constructor(
    prismaOrRepo: PrismaClient | LogisticsRepository,
    organizationId?: string,
    packingEngine?: CargoPackingEngine,
  ) {
    if (prismaOrRepo instanceof LogisticsRepository) {
      this.repository = prismaOrRepo;
    } else {
      this.repository = new LogisticsRepository(prismaOrRepo, organizationId);
    }
    this.packingEngine = packingEngine || new CargoPackingEngine();
  }

  /**
   * Packs an existing database Shipment using a specified vehicle or vehicle type.
   * Enforces strict organization tenant boundaries on all queried entities.
   */
  public async packShipment(input: PackShipmentInput): Promise<PackingResult> {
    if (!input.shipmentId) {
      throw new ValidationError('shipmentId is required for packShipment');
    }

    // 1. Retrieve Shipment & Cargo Items within Tenant Scope
    const shipment = await this.repository.findShipmentWithCargo(input.shipmentId);

    // 2. Retrieve Vehicle Specification within Tenant Scope
    let vehicleType: VehicleType;

    if (input.vehicleId) {
      const vehicle = await this.repository.findVehicleById(input.vehicleId);
      vehicleType = vehicle.vehicleType;
    } else if (input.vehicleTypeId) {
      vehicleType = await this.repository.findVehicleTypeById(input.vehicleTypeId);
    } else {
      throw new ValidationError('Either vehicleId or vehicleTypeId must be provided');
    }

    // 3. Normalize Vehicle Cargo Space to Integer mm and grams
    const truck = this.mapVehicleTypeToTruck(vehicleType);

    // 4. Normalize Cargo Items to Integer mm and grams
    const cargoInputs: CargoItemInput[] = shipment.cargoItems.map((item) => ({
      cargoId: item.id,
      description: item.description,
      lengthMm: UnitNormalizer.toIntegerMm(item.length, item.dimensionUnit, `cargo[${item.id}].length`),
      widthMm: UnitNormalizer.toIntegerMm(item.width, item.dimensionUnit, `cargo[${item.id}].width`),
      heightMm: UnitNormalizer.toIntegerMm(item.height, item.dimensionUnit, `cargo[${item.id}].height`),
      weightGrams: UnitNormalizer.toIntegerGrams(item.unitWeight, item.weightUnit, `cargo[${item.id}].unitWeight`),
      quantity: item.quantity,

      isStackable: item.isStackable,
      maxStackWeightGrams: UnitNormalizer.toOptionalIntegerGrams(
        item.maxStackWeight,
        item.weightUnit,
        `cargo[${item.id}].maxStackWeight`,
      ),
      maxStackTiers: item.maxStackTiers ?? undefined,
      isFragile: item.isFragile,

      allowRotationHorizontal: item.allowRotationHorizontal,
      allowRotationVertical: item.allowRotationVertical,
      allowedOrientations: this.mapAllowedOrientations(item.allowedOrientations),

      loadingPriority: item.loadingPriority,
      unloadingSequence: item.unloadingSequence,
    }));

    // 5. Execute Pure Domain Packing Engine
    return this.packingEngine.pack({ truck, cargo: cargoInputs });
  }

  /**
   * Packs an in-memory cargo manifest against a specified vehicle.
   * Useful for interactive simulation before creating permanent database records.
   */
  public async packManifest(input: PackManifestInput): Promise<PackingResult> {
    if (!input.cargo || !Array.isArray(input.cargo) || input.cargo.length === 0) {
      throw new ValidationError('cargo array must contain at least one item');
    }

    // 1. Resolve Vehicle Specification
    let truck: TruckCargoSpace;

    if (input.vehicleSpec) {
      truck = this.mapDirectVehicleSpecToTruck(input.vehicleSpec);
    } else if (input.vehicleId) {
      const vehicle = await this.repository.findVehicleById(input.vehicleId);
      truck = this.mapVehicleTypeToTruck(vehicle.vehicleType);
    } else if (input.vehicleTypeId) {
      const vehicleType = await this.repository.findVehicleTypeById(input.vehicleTypeId);
      truck = this.mapVehicleTypeToTruck(vehicleType);
    } else {
      throw new ValidationError('Either vehicleSpec, vehicleId, or vehicleTypeId must be provided');
    }

    // 2. Normalize Manifest Cargo Items
    const cargoInputs: CargoItemInput[] = input.cargo.map((item, index) => ({
      cargoId: item.cargoId || `item-${index + 1}`,
      description: item.description,
      lengthMm: UnitNormalizer.toIntegerMm(item.length, item.dimensionUnit, `cargo[${index}].length`),
      widthMm: UnitNormalizer.toIntegerMm(item.width, item.dimensionUnit, `cargo[${index}].width`),
      heightMm: UnitNormalizer.toIntegerMm(item.height, item.dimensionUnit, `cargo[${index}].height`),
      weightGrams: UnitNormalizer.toIntegerGrams(item.weight, item.weightUnit, `cargo[${index}].weight`),
      quantity: item.quantity,

      isStackable: item.isStackable ?? true,
      maxStackWeightGrams: UnitNormalizer.toOptionalIntegerGrams(
        item.maxStackWeight,
        item.weightUnit,
        `cargo[${index}].maxStackWeight`,
      ),
      maxStackTiers: item.maxStackTiers,
      isFragile: item.isFragile ?? false,

      allowRotationHorizontal: item.allowRotationHorizontal ?? true,
      allowRotationVertical: item.allowRotationVertical ?? false,
      allowedOrientations: this.mapAllowedOrientations(item.allowedOrientations),

      loadingPriority: item.loadingPriority ?? 1,
      unloadingSequence: item.unloadingSequence ?? 1,
    }));

    // 3. Execute Pure Domain Packing Engine
    return this.packingEngine.pack({ truck, cargo: cargoInputs });
  }

  /**
   * Maps a persistent Prisma VehicleType entity to normalized TruckCargoSpace.
   */
  private mapVehicleTypeToTruck(vt: VehicleType): TruckCargoSpace {
    if (vt.verificationStatus === 'DEPRECATED') {
      throw new ValidationError(`VehicleType '${vt.name}' is DEPRECATED and cannot be used for packing`);
    }

    if (vt.internalLength == null || vt.internalWidth == null || vt.internalHeight == null) {
      throw new ValidationError(`VehicleType '${vt.name}' lacks internal cargo dimensions required for packing`);
    }

    return {
      lengthMm: UnitNormalizer.toIntegerMm(vt.internalLength, vt.dimensionUnit, 'vehicleType.internalLength'),
      widthMm: UnitNormalizer.toIntegerMm(vt.internalWidth, vt.dimensionUnit, 'vehicleType.internalWidth'),
      heightMm: UnitNormalizer.toIntegerMm(vt.internalHeight, vt.dimensionUnit, 'vehicleType.internalHeight'),
      maxPayloadGrams: UnitNormalizer.toIntegerGrams(vt.maxPayload, vt.weightUnit, 'vehicleType.maxPayload'),
      name: vt.name,
    };
  }

  /**
   * Maps a direct in-memory vehicle specification to normalized TruckCargoSpace.
   */
  private mapDirectVehicleSpecToTruck(spec: DirectVehicleSpec): TruckCargoSpace {
    return {
      lengthMm: UnitNormalizer.toIntegerMm(spec.length, spec.dimensionUnit, 'vehicleSpec.length'),
      widthMm: UnitNormalizer.toIntegerMm(spec.width, spec.dimensionUnit, 'vehicleSpec.width'),
      heightMm: UnitNormalizer.toIntegerMm(spec.height, spec.dimensionUnit, 'vehicleSpec.height'),
      maxPayloadGrams: UnitNormalizer.toIntegerGrams(spec.maxPayload, spec.weightUnit, 'vehicleSpec.maxPayload'),
      name: spec.name || 'Direct Vehicle Spec',
    };
  }

  /**
   * Maps database allowedOrientations strings to strongly typed OrientationType enums.
   */
  private mapAllowedOrientations(orientations?: string[] | null): OrientationType[] | undefined {
    if (!orientations || orientations.length === 0) {
      return undefined;
    }

    const mapped: OrientationType[] = [];
    for (const o of orientations) {
      const upper = o.trim().toUpperCase();
      if (upper === 'DEFAULT' || upper === 'UPRIGHT_DEFAULT') {
        mapped.push('UPRIGHT_DEFAULT');
      } else if (upper === 'YAW_90' || upper === 'UPRIGHT_YAW_90') {
        mapped.push('UPRIGHT_YAW_90');
      } else if (upper === 'SIDE_LENGTH_PITCH_90') {
        mapped.push('SIDE_LENGTH_PITCH_90');
      } else if (upper === 'SIDE_LENGTH_ROLL_90') {
        mapped.push('SIDE_LENGTH_ROLL_90');
      } else if (upper === 'SIDE_WIDTH_PITCH_90') {
        mapped.push('SIDE_WIDTH_PITCH_90');
      } else if (upper === 'SIDE_WIDTH_ROLL_90') {
        mapped.push('SIDE_WIDTH_ROLL_90');
      }
    }

    return mapped.length > 0 ? mapped : undefined;
  }
}
