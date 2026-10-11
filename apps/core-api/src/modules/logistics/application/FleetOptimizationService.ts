import {
  CargoItem,
  OptimizationStatus,
  Prisma,
  PrismaClient,
  WeightUnit,
} from '@prisma/client';
import {
  LogisticsRepository,
  VehicleWithSpecification,
} from '../infrastructure/logistics.repository';
import { UnitNormalizer } from './unit-normalizer';
import { VehicleMasterService } from './VehicleMasterService';
import { CargoItemInput } from '../domain/packing/types';
import { FleetVehicleCandidate } from '../domain/allocation/types';
import { FleetOptimizationEngine } from '../domain/optimization/FleetOptimizationEngine';
import {
  FleetOptimizationInput,
  FleetOptimizationOptions,
  FleetOptimizationResult,
} from '../domain/optimization/types';
import { ValidationError } from '../../../core/errors/app.error';

export interface OptimizeFleetRequest {
  shipmentId: string;
  vehicleIds?: string[];
  vehicleTypeIds?: string[];
  options?: FleetOptimizationOptions;
  persistOptimizationRun?: boolean;
  scenarioName?: string;
}

export interface OptimizeFleetResponse extends FleetOptimizationResult {
  optimizationRunId?: string;
}

/**
 * FleetOptimizationService
 *
 * Tenant-scoped application service bridging persistent database models
 * with the pure domain FleetOptimizationEngine.
 *
 * Enforces strict multi-tenancy:
 * - Shipment and physical vehicles must belong to the caller's organization.
 * - Cross-tenant access returns NotFoundError (HTTP 404).
 * - Global approved VehicleType templates (organizationId: null) can be used.
 */
export class FleetOptimizationService {
  private readonly repository: LogisticsRepository;
  private readonly engine: FleetOptimizationEngine;

  constructor(
    prismaOrRepo: PrismaClient | LogisticsRepository,
    organizationId?: string,
    engine?: FleetOptimizationEngine,
  ) {
    if (prismaOrRepo instanceof LogisticsRepository) {
      this.repository = prismaOrRepo;
    } else {
      this.repository = new LogisticsRepository(prismaOrRepo, organizationId);
    }
    this.engine = engine ?? new FleetOptimizationEngine();
  }

  /**
   * Executes multi-objective bounded optimization for a shipment.
   */
  public async optimizeFleetForShipment(request: OptimizeFleetRequest): Promise<OptimizeFleetResponse> {
    if (!request.shipmentId) {
      throw new ValidationError('shipmentId is required');
    }

    // 1. Retrieve Shipment and Cargo Items (strictly tenant-scoped)
    const shipment = await this.repository.findShipmentWithCargo(request.shipmentId);

    if (!shipment.cargoItems || shipment.cargoItems.length === 0) {
      throw new ValidationError(`Shipment '${request.shipmentId}' has no cargo items to optimize`);
    }

    // 2. Normalize Cargo Items to integer mm & grams
    const cargoInputs: CargoItemInput[] = shipment.cargoItems.map((item) =>
      this.mapCargoItemToInput(item),
    );

    // 3. Resolve Candidate Vehicles
    const candidateVehicles = await this.resolveVehicleCandidates(request);

    // 4. Execute Pure Domain Fleet Optimization Engine
    const optimizationInput: FleetOptimizationInput = {
      shipmentId: request.shipmentId,
      cargoItems: cargoInputs,
      vehicles: candidateVehicles,
      options: request.options,
    };

    const result = this.engine.optimize(optimizationInput);
    const activeSolution = result.bestSolution ?? result.baseline;

    // 5. Optionally Persist OptimizationRun and LoadPlans
    let optimizationRunId: string | undefined;

    if (request.persistOptimizationRun) {

      const loadPlansData = activeSolution.vehicleAssignments.map((assignment) => ({
        vehicleSequence: assignment.vehicleSequence,
        vehicleTypeId: assignment.vehicle.vehicleTypeId,
        vehicleId: assignment.vehicle.vehicleId ?? null,
        loadedWeightKg: assignment.assignedCargoWeightGrams / 1000,
        loadedVolumeM3: assignment.assignedCargoVolumeMm3 / 1e9,
        weightUtilizationPct: assignment.payloadUtilizationPct,
        volumeUtilizationPct: assignment.volumeUtilizationPct,
        placementsJson: {
          vehicleDimensions: {
            lengthMm: assignment.vehicle.lengthMm,
            widthMm: assignment.vehicle.widthMm,
            heightMm: assignment.vehicle.heightMm,
            volumeMm3: assignment.vehicle.volumeMm3,
            maxPayloadGrams: assignment.vehicle.maxPayloadGrams,
            name: assignment.vehicle.name,
            registrationNumber: assignment.vehicle.registrationNumber,
          },
          placements: assignment.packingResult.placements,
        } as any,
      }));

      const run = await this.repository.createOptimizationRunWithLoadPlans({
        shipmentId: request.shipmentId,
        scenarioName: request.scenarioName || 'Lexicographic Fleet Optimization',
        status: result.success ? OptimizationStatus.COMPLETED : OptimizationStatus.FAILED,
        algorithmVersion: result.algorithmName,
        parametersJson: {
          options: request.options ?? {},
          vehicleIds: request.vehicleIds ?? [],
          vehicleTypeIds: request.vehicleTypeIds ?? [],
        } as any,
        baselineTruckCount: result.baseline.metrics.vehicleCount,
        optimizedTruckCount: activeSolution.metrics.vehicleCount,
        totalLoadedWeightKg: activeSolution.metrics.totalCargoWeightGrams / 1000,
        totalLoadedVolumeM3: activeSolution.metrics.totalCargoVolumeMm3 / 1e9,
        overallVolumeUtilizationPct: activeSolution.metrics.volumeUtilizationPct,
        overallWeightUtilizationPct: activeSolution.metrics.payloadUtilizationPct,
        unassignedItemsCount: activeSolution.unallocatedCargo.length,
        violationsCount: activeSolution.violations.length,
        violationsJson: {
          violations: activeSolution.violations,
          improvement: result.improvement,
          searchStatistics: result.searchStatistics,
          unallocatedCargo: activeSolution.unallocatedCargo,
        } as any,
        executionTimeMs: result.searchStatistics.executionDurationMs,
        loadPlans: loadPlansData,
      });

      optimizationRunId = run.id;
    }

    return {
      ...result,
      success: activeSolution.vehicleAssignments.length > 0 ? true : result.success,
      bestSolution: result.bestSolution ?? (activeSolution.vehicleAssignments.length > 0 ? activeSolution : null),
      optimizationRunId,
    };
  }

  /**
   * Authoritative Indian Container Truck Specifications (FR8 Industry Standard)
   */
  private static readonly INDIAN_TRUCK_SPECS: Record<
    string,
    { name: string; lengthMm: number; widthMm: number; heightMm: number; maxPayloadGrams: number; category: string }
  > = {
    TRK_TATA_ACE: { name: 'Tata Ace (Chota Hathi)', lengthMm: 2130, widthMm: 1460, heightMm: 1460, maxPayloadGrams: 850000, category: 'LIGHT_COMMERCIAL' },
    TRK_ASHOK_DOST: { name: 'Ashok Leyland Dost', lengthMm: 2500, widthMm: 1620, heightMm: 1520, maxPayloadGrams: 1500000, category: 'LIGHT_COMMERCIAL' },
    TRK_BOLERO_MAXI: { name: 'Mahindra Bolero Maxi Truck', lengthMm: 2740, widthMm: 1680, heightMm: 1680, maxPayloadGrams: 1700000, category: 'LIGHT_COMMERCIAL' },
    TRK_TATA_407: { name: 'Tata 407 (10 FT Mini Truck)', lengthMm: 3050, widthMm: 1830, heightMm: 1680, maxPayloadGrams: 2500000, category: 'MEDIUM_DUTY' },
    TRK_EICHER_14FT: { name: '14 FT Container Truck (Eicher)', lengthMm: 4270, widthMm: 1980, heightMm: 1980, maxPayloadGrams: 4000000, category: 'MEDIUM_DUTY' },
    TRK_EICHER_17FT: { name: '17 FT Container Truck', lengthMm: 5180, widthMm: 2130, heightMm: 2130, maxPayloadGrams: 5000000, category: 'MEDIUM_DUTY' },
    TRK_CONTAINER_20FT: { name: '20 FT Container Truck', lengthMm: 6100, widthMm: 2440, heightMm: 2440, maxPayloadGrams: 7000000, category: 'HEAVY_DUTY' },
    TRK_CONTAINER_24FT: { name: '24 FT Container Truck (High-Cube)', lengthMm: 7320, widthMm: 2440, heightMm: 2590, maxPayloadGrams: 9000000, category: 'HEAVY_DUTY' },
    TRK_32FT_SXL: { name: '32 FT Single Axle (SXL)', lengthMm: 9750, widthMm: 2440, heightMm: 2440, maxPayloadGrams: 7500000, category: 'HEAVY_DUTY' },
    TRK_32FT_MXL: { name: '32 FT Multi-Axle (MXL)', lengthMm: 9750, widthMm: 2440, heightMm: 2590, maxPayloadGrams: 15000000, category: 'HEAVY_DUTY' },
    TRK_40FT_TRAILER: { name: '40 FT Heavy Container Trailer', lengthMm: 12190, widthMm: 2440, heightMm: 2590, maxPayloadGrams: 22000000, category: 'HEAVY_DUTY' },
  };

  /**
   * Resolves vehicle candidates based on explicit IDs or tenant defaults.
   */
  private async resolveVehicleCandidates(request: OptimizeFleetRequest): Promise<FleetVehicleCandidate[]> {
    const candidates: FleetVehicleCandidate[] = [];

    // Case 0A: Explicit targetVehicle in options
    const targetSpec = (request.options as any)?.targetVehicle;
    if (targetSpec && Number(targetSpec.lengthMm) > 0) {
      const l = Number(targetSpec.lengthMm);
      const w = Number(targetSpec.widthMm);
      const h = Number(targetSpec.heightMm);
      return [
        {
          candidateId: `target-${targetSpec.id || 'selected'}`,
          vehicleTypeId: targetSpec.id || 'target-vt',
          name: targetSpec.name || 'Selected Truck',
          lengthMm: l,
          widthMm: w,
          heightMm: h,
          volumeMm3: l * w * h,
          maxPayloadGrams: Number(targetSpec.maxPayloadGrams) || 5000000,
          status: 'AVAILABLE',
          isAvailable: true,
          verificationStatus: 'VERIFIED',
          isPackingCompatible: true,
        },
      ];
    }

    // Case 0B: ScenarioName matching an Indian Truck specification (e.g. "3D Load — Ashok Leyland Dost")
    if (request.scenarioName) {
      for (const [key, spec] of Object.entries(FleetOptimizationService.INDIAN_TRUCK_SPECS)) {
        const lowerScenario = request.scenarioName.toLowerCase();
        const baseName = spec.name.split('(')[0].trim().toLowerCase();
        if (
          lowerScenario.includes(spec.name.toLowerCase()) ||
          lowerScenario.includes(baseName) ||
          lowerScenario.includes(key.toLowerCase())
        ) {
          return [
            {
              candidateId: `indian-${key}`,
              vehicleTypeId: key,
              name: spec.name,
              lengthMm: spec.lengthMm,
              widthMm: spec.widthMm,
              heightMm: spec.heightMm,
              volumeMm3: spec.lengthMm * spec.widthMm * spec.heightMm,
              maxPayloadGrams: spec.maxPayloadGrams,
              status: 'AVAILABLE',
              isAvailable: true,
              verificationStatus: 'VERIFIED',
              isPackingCompatible: true,
            },
          ];
        }
      }
    }

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
      const hasEligible = candidates.some(
        (c) => c.isAvailable && c.isPackingCompatible && c.verificationStatus !== 'DEPRECATED',
      );
      if (hasEligible) {
        return candidates;
      }
      // If physical fleet has no eligible candidates, clear and fall through to templates
      candidates.length = 0;
    }

    // Case D: Fallback to Tenant's Accessible VehicleTypes (Global + Custom)
    const accessibleTypes = await this.repository.listAccessibleVehicleTypes();
    for (const vt of accessibleTypes) {
      candidates.push(this.mapVehicleTypeToCandidate(vt));
    }

    return candidates;
  }

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

  public mapVehicleTypeToCandidate(vt: any): FleetVehicleCandidate {
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
