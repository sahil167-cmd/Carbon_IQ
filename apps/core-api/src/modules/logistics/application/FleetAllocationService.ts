import {
  CargoItem,
  DimensionUnit,
  OptimizationStatus,
  Prisma,
  PrismaClient,
  Vehicle,
  VehicleType,
  WeightUnit,
} from '@prisma/client';
import {
  LogisticsRepository,
  ShipmentWithCargoAndStops,
  VehicleWithSpecification,
} from '../infrastructure/logistics.repository';
import { VehicleMasterService } from './VehicleMasterService';
import { UnitNormalizer } from './unit-normalizer';
import { CargoItemInput } from '../domain/packing/types';
import { FleetAllocationEngine } from '../domain/allocation/FleetAllocationEngine';
import {
  FleetAllocationInput,
  FleetAllocationResult,
  FleetVehicleCandidate,
} from '../domain/allocation/types';
import { ValidationError } from '../../../core/errors/app.error';

export interface AllocateFleetRequest {
  shipmentId: string;
  vehicleIds?: string[];
  vehicleTypeIds?: string[];
  allowMultiVehicleFallback?: boolean;
  persistOptimizationRun?: boolean;
  scenarioName?: string;
}

export interface AllocateFleetResponse extends FleetAllocationResult {
  optimizationRunId?: string;
}

/**
 * FleetAllocationService
 *
 * Tenant-scoped application service that bridges persistent CarbonIQ logistics entities
 * (Shipments, CargoItems, Vehicles, VehicleTypes) with the pure domain FleetAllocationEngine.
 *
 * Strict Tenant Boundary Guarantees:
 * - All shipment and physical vehicle lookups are scoped to the authenticated tenant.
 * - Cross-tenant physical vehicle access throws NotFoundError (HTTP 404), preventing tenant enumeration.
 * - Global approved VehicleTypes (organizationId: null) can be referenced across tenants as templates.
 */
export class FleetAllocationService {
  private readonly repository: LogisticsRepository;
  private readonly engine: FleetAllocationEngine;

  constructor(
    prismaOrRepo: PrismaClient | LogisticsRepository,
    organizationId?: string,
    engine?: FleetAllocationEngine,
  ) {
    if (prismaOrRepo instanceof LogisticsRepository) {
      this.repository = prismaOrRepo;
    } else {
      this.repository = new LogisticsRepository(prismaOrRepo, organizationId);
    }
    this.engine = engine ?? new FleetAllocationEngine();
  }

  /**
   * Plans fleet vehicle allocation for a given shipment.
   */
  public async allocateFleetForShipment(request: AllocateFleetRequest): Promise<AllocateFleetResponse> {
    if (!request.shipmentId) {
      throw new ValidationError('shipmentId is required');
    }

    // 1. Retrieve Shipment and Cargo Items (strictly tenant-scoped)
    const shipment = await this.repository.findShipmentWithCargo(request.shipmentId);

    if (!shipment.cargoItems || shipment.cargoItems.length === 0) {
      throw new ValidationError(`Shipment '${request.shipmentId}' has no cargo items to allocate`);
    }

    // 2. Normalize Domain Cargo Items into integer mm / integer grams
    const cargoInputs: CargoItemInput[] = shipment.cargoItems.map((item) =>
      this.mapCargoItemToInput(item),
    );

    // 3. Gather Eligible Vehicle Candidates
    const candidateVehicles = await this.resolveVehicleCandidates(request);

    // 4. Execute Pure Domain Allocation Engine
    const allocationInput: FleetAllocationInput = {
      shipmentId: request.shipmentId,
      cargoItems: cargoInputs,
      vehicles: candidateVehicles,
      options: {
        allowMultiVehicleFallback: request.allowMultiVehicleFallback ?? true,
      },
    };

    const allocationResult = this.engine.allocate(allocationInput);

    // 5. Optionally Persist OptimizationRun and LoadPlans
    let optimizationRunId: string | undefined;

    if (request.persistOptimizationRun) {
      const loadPlansData = allocationResult.vehicleAssignments.map((assignment) => ({
        vehicleSequence: assignment.vehicleSequence,
        vehicleTypeId: assignment.vehicle.vehicleTypeId,
        vehicleId: assignment.vehicle.vehicleId ?? null,
        loadedWeightKg: assignment.assignedCargoWeightGrams / 1000,
        loadedVolumeM3: assignment.assignedCargoVolumeMm3 / 1e9,
        weightUtilizationPct: assignment.payloadUtilizationPct,
        volumeUtilizationPct: assignment.volumeUtilizationPct,
        placementsJson: assignment.packingResult.placements as any,
      }));

      const run = await this.repository.createOptimizationRunWithLoadPlans({
        shipmentId: request.shipmentId,
        scenarioName: request.scenarioName || 'Automated Fleet Allocation',
        status: allocationResult.success ? OptimizationStatus.COMPLETED : OptimizationStatus.FAILED,
        algorithmVersion: allocationResult.algorithmVersion,
        baselineTruckCount: candidateVehicles.length,
        optimizedTruckCount: allocationResult.metrics.vehicleCount,
        totalLoadedWeightKg: allocationResult.metrics.totalCargoWeightGrams / 1000,
        totalLoadedVolumeM3: allocationResult.metrics.totalCargoVolumeMm3 / 1e9,
        overallVolumeUtilizationPct: allocationResult.metrics.volumeUtilizationPct,
        overallWeightUtilizationPct: allocationResult.metrics.payloadUtilizationPct,
        unassignedItemsCount: allocationResult.unallocatedCargo.length,
        violationsCount: allocationResult.violations.length,
        violationsJson: allocationResult.violations as any,
        executionTimeMs: allocationResult.executionDurationMs,
        loadPlans: loadPlansData,
      });

      optimizationRunId = run.id;
    }

    return {
      ...allocationResult,
      optimizationRunId,
    };
  }

  /**
   * Resolves vehicle candidates based on explicit vehicle IDs, vehicle type IDs,
   * or the tenant's default accessible fleet.
   */
  private async resolveVehicleCandidates(request: AllocateFleetRequest): Promise<FleetVehicleCandidate[]> {
    const candidates: FleetVehicleCandidate[] = [];

    // Case A: Specific Physical Vehicle IDs provided
    if (request.vehicleIds && request.vehicleIds.length > 0) {
      for (const vId of request.vehicleIds) {
        // Strictly tenant-scoped: throws NotFoundError if vehicle belongs to another tenant
        const physicalVehicle = await this.repository.findVehicleById(vId);
        candidates.push(this.mapPhysicalVehicleToCandidate(physicalVehicle));
      }
      return candidates;
    }

    // Case B: Specific VehicleType IDs provided
    if (request.vehicleTypeIds && request.vehicleTypeIds.length > 0) {
      for (const vtId of request.vehicleTypeIds) {
        const vehicleType = await this.repository.findVehicleTypeById(vtId);
        candidates.push(this.mapVehicleTypeToCandidate(vehicleType));
      }
      return candidates;
    }

    // Case C: Default to Tenant's Physical Fleet
    const tenantVehicles = await this.repository.listTenantVehicles();
    if (tenantVehicles.length > 0) {
      for (const v of tenantVehicles) {
        candidates.push(this.mapPhysicalVehicleToCandidate(v));
      }
      return candidates;
    }

    // Case D: Fallback to Tenant's Accessible VehicleTypes (Global + Custom)
    const accessibleTypes = await this.repository.listAccessibleVehicleTypes();
    for (const vt of accessibleTypes) {
      candidates.push(this.mapVehicleTypeToCandidate(vt));
    }

    return candidates;
  }

  /**
   * Maps a physical Vehicle asset (with its specification) to a FleetVehicleCandidate.
   */
  public mapPhysicalVehicleToCandidate(vehicle: VehicleWithSpecification): FleetVehicleCandidate {
    const vt = vehicle.vehicleType;
    const compatibility = VehicleMasterService.checkPackingCompatibility(vt);

    const lengthMm = vt.internalLength != null
      ? UnitNormalizer.toIntegerMm(vt.internalLength, vt.dimensionUnit, 'vehicleType.internalLength')
      : 0;
    const widthMm = vt.internalWidth != null
      ? UnitNormalizer.toIntegerMm(vt.internalWidth, vt.dimensionUnit, 'vehicleType.internalWidth')
      : 0;
    const heightMm = vt.internalHeight != null
      ? UnitNormalizer.toIntegerMm(vt.internalHeight, vt.dimensionUnit, 'vehicleType.internalHeight')
      : 0;
    const maxPayloadGrams = vt.maxPayload != null
      ? UnitNormalizer.toIntegerGrams(vt.maxPayload, vt.weightUnit, 'vehicleType.maxPayload')
      : 0;

    const isOperationallyAvailable =
      vehicle.status === 'AVAILABLE' || vehicle.status === 'ACTIVE';

    return {
      candidateId: `vehicle-${vehicle.id}`,
      vehicleId: vehicle.id,
      vehicleTypeId: vt.id,
      registrationNumber: vehicle.registrationNumber,
      name: `${vt.name} (${vehicle.registrationNumber})`,
      lengthMm,
      widthMm,
      heightMm,
      volumeMm3: lengthMm * widthMm * heightMm,
      maxPayloadGrams,
      status: vehicle.status,
      isAvailable: isOperationallyAvailable,
      verificationStatus: vt.verificationStatus,
      isPackingCompatible: compatibility.isCompatible,
    };
  }

  /**
   * Maps an abstract VehicleType specification template to a FleetVehicleCandidate.
   */
  public mapVehicleTypeToCandidate(vt: VehicleType): FleetVehicleCandidate {
    const compatibility = VehicleMasterService.checkPackingCompatibility(vt);

    const lengthMm = vt.internalLength != null
      ? UnitNormalizer.toIntegerMm(vt.internalLength, vt.dimensionUnit, 'vehicleType.internalLength')
      : 0;
    const widthMm = vt.internalWidth != null
      ? UnitNormalizer.toIntegerMm(vt.internalWidth, vt.dimensionUnit, 'vehicleType.internalWidth')
      : 0;
    const heightMm = vt.internalHeight != null
      ? UnitNormalizer.toIntegerMm(vt.internalHeight, vt.dimensionUnit, 'vehicleType.internalHeight')
      : 0;
    const maxPayloadGrams = vt.maxPayload != null
      ? UnitNormalizer.toIntegerGrams(vt.maxPayload, vt.weightUnit, 'vehicleType.maxPayload')
      : 0;

    return {
      candidateId: `vt-${vt.id}`,
      vehicleTypeId: vt.id,
      name: vt.name,
      lengthMm,
      widthMm,
      heightMm,
      volumeMm3: lengthMm * widthMm * heightMm,
      maxPayloadGrams,
      status: 'AVAILABLE',
      isAvailable: true,
      verificationStatus: vt.verificationStatus,
      isPackingCompatible: compatibility.isCompatible,
    };
  }

  /**
   * Maps a database CargoItem to a normalized CargoItemInput.
   */
  private mapCargoItemToInput(item: CargoItem): CargoItemInput {
    const lengthMm = UnitNormalizer.toIntegerMm(item.length, item.dimensionUnit, 'cargoItem.length');
    const widthMm = UnitNormalizer.toIntegerMm(item.width, item.dimensionUnit, 'cargoItem.width');
    const heightMm = UnitNormalizer.toIntegerMm(item.height, item.dimensionUnit, 'cargoItem.height');
    const weightGrams = UnitNormalizer.toIntegerGrams(item.unitWeight, item.weightUnit, 'cargoItem.unitWeight');

    const maxStackWeightGrams = item.maxStackWeight != null
      ? UnitNormalizer.toIntegerGrams(item.maxStackWeight, WeightUnit.KG, 'cargoItem.maxStackWeight')
      : undefined;

    return {
      cargoId: item.id,
      description: item.description,
      lengthMm,
      widthMm,
      heightMm,
      weightGrams,
      quantity: item.quantity,
      isStackable: item.isStackable,
      maxStackWeightGrams,
      maxStackTiers: item.maxStackTiers ?? undefined,
      isFragile: item.isFragile,
      allowRotationHorizontal: item.allowRotationHorizontal,
      allowRotationVertical: item.allowRotationVertical,
      loadingPriority: item.loadingPriority,
      unloadingSequence: item.unloadingSequence,
    };
  }
}
