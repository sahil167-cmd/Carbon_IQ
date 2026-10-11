import { CargoPackingEngine } from '../packing/CargoPackingEngine';
import {
  CargoItemInput,
  PhysicalCargoInstance,
  TruckCargoSpace,
} from '../packing/types';
import {
  FleetAllocationInput,
  FleetAllocationObjectiveMetrics,
  FleetAllocationResult,
  FleetAllocationViolation,
  FleetVehicleCandidate,
  VehicleCargoAssignment,
} from './types';

/**
 * Deterministic Fleet Allocation Engine (Pure Domain)
 *
 * Implements DETERMINISTIC FLEET ALLOCATION HEURISTIC v1.
 *
 * Responsibilities:
 * 1. Filters candidate vehicles for operational availability and engineering completeness.
 * 2. Deterministically sorts vehicles using stable tie-breakers.
 * 3. Strategy 1 (Single-Vehicle First): Attempts to allocate 100% of cargo to a single vehicle.
 * 4. Strategy 2 (Multi-Vehicle Fallback): Allocates cargo across multiple vehicles without splitting physical instances.
 * 5. Uses Phase 1B CargoPackingEngine to validate physical 3D feasibility on every vehicle.
 * 6. Calculates comprehensive objective metrics for capacity and volume utilization.
 */
export class FleetAllocationEngine {
  private readonly packingEngine: CargoPackingEngine;

  constructor(packingEngine?: CargoPackingEngine) {
    this.packingEngine = packingEngine ?? new CargoPackingEngine();
  }

  /**
   * Executes deterministic fleet allocation.
   */
  public allocate(input: FleetAllocationInput): FleetAllocationResult {
    const startTime = Date.now();
    const violations: FleetAllocationViolation[] = [];

    // 1. Expand and Validate Cargo Instances
    const allInstances = this.expandCargoInstances(input.cargoItems);
    const totalCargoWeightGrams = allInstances.reduce((sum, inst) => sum + inst.weightGrams, 0);
    const totalCargoVolumeMm3 = allInstances.reduce((sum, inst) => sum + inst.volumeMm3, 0);

    // 2. Filter Candidate Vehicles for Operational & Engineering Eligibility
    const eligibleVehicles = this.filterEligibleVehicles(input.vehicles, violations);

    // 3. Deterministically Sort Candidate Vehicles
    const sortedVehicles = this.sortCandidateVehicles(eligibleVehicles);

    // If no cargo requested, return immediate empty success
    if (allInstances.length === 0) {
      return this.buildResult({
        success: true,
        assignments: [],
        unallocated: [],
        violations,
        totalCargoWeightGrams: 0,
        totalCargoVolumeMm3: 0,
        startTime,
      });
    }

    // If no eligible vehicles exist, report all cargo unallocated
    if (sortedVehicles.length === 0) {
      violations.push({
        code: 'NO_ELIGIBLE_VEHICLES',
        message: 'No eligible, available, and packing-compatible vehicles found for allocation',
      });

      return this.buildResult({
        success: false,
        assignments: [],
        unallocated: allInstances.map((inst) => ({
          instanceId: inst.instanceId,
          cargoId: inst.cargoId,
          description: inst.description,
          weightGrams: inst.weightGrams,
          volumeMm3: inst.volumeMm3,
          reason: 'No eligible vehicles available in fleet candidate pool',
        })),
        violations,
        totalCargoWeightGrams,
        totalCargoVolumeMm3,
        startTime,
      });
    }

    // =========================================================================
    // STRATEGY 1: SINGLE-VEHICLE FIRST (Section 8)
    // =========================================================================
    for (const vehicle of sortedVehicles) {
      // Hard capacity filter: vehicle max payload must be >= total cargo weight
      if (vehicle.maxPayloadGrams < totalCargoWeightGrams) {
        continue;
      }

      // Hard volume filter: vehicle cargo space must be >= total cargo volume
      if (vehicle.volumeMm3 < totalCargoVolumeMm3) {
        continue;
      }

      // Test physical 3D feasibility using Phase 1B CargoPackingEngine
      const truckSpace: TruckCargoSpace = {
        lengthMm: vehicle.lengthMm,
        widthMm: vehicle.widthMm,
        heightMm: vehicle.heightMm,
        maxPayloadGrams: vehicle.maxPayloadGrams,
        name: vehicle.name,
      };

      const packResult = this.packingEngine.pack({
        truck: truckSpace,
        cargo: input.cargoItems,
      });

      // If all cargo instances were successfully placed without unplaced items
      if (packResult.success && packResult.unplacedCount === 0) {
        const assignment: VehicleCargoAssignment = {
          vehicle,
          vehicleSequence: 1,
          assignedInstances: allInstances,
          packingResult: packResult,
          assignedCargoWeightGrams: totalCargoWeightGrams,
          payloadCapacityGrams: vehicle.maxPayloadGrams,
          payloadUtilizationPct: (totalCargoWeightGrams / vehicle.maxPayloadGrams) * 100,
          unusedPayloadGrams: Math.max(0, vehicle.maxPayloadGrams - totalCargoWeightGrams),
          assignedCargoVolumeMm3: totalCargoVolumeMm3,
          cargoSpaceVolumeMm3: vehicle.volumeMm3,
          volumeUtilizationPct: (totalCargoVolumeMm3 / vehicle.volumeMm3) * 100,
          unusedVolumeMm3: Math.max(0, vehicle.volumeMm3 - totalCargoVolumeMm3),
        };

        return this.buildResult({
          success: true,
          assignments: [assignment],
          unallocated: [],
          violations,
          totalCargoWeightGrams,
          totalCargoVolumeMm3,
          startTime,
        });
      }
    }

    // =========================================================================
    // STRATEGY 2: MULTI-VEHICLE FALLBACK (Section 9)
    // =========================================================================
    const allowMulti = input.options?.allowMultiVehicleFallback ?? true;
    if (!allowMulti) {
      violations.push({
        code: 'MULTI_VEHICLE_DISALLOWED',
        message: 'Cargo does not fit any single vehicle and multi-vehicle fallback is disabled',
      });

      return this.buildResult({
        success: false,
        assignments: [],
        unallocated: allInstances.map((inst) => ({
          instanceId: inst.instanceId,
          cargoId: inst.cargoId,
          description: inst.description,
          weightGrams: inst.weightGrams,
          volumeMm3: inst.volumeMm3,
          reason: 'Does not fit any single vehicle and multi-vehicle fallback is disabled',
        })),
        violations,
        totalCargoWeightGrams,
        totalCargoVolumeMm3,
        startTime,
      });
    }

    // Deterministic greedy allocation across sorted vehicles
    const assignments: VehicleCargoAssignment[] = [];
    let remainingInstances = [...allInstances];
    const usedVehicleIds = new Set<string>();

    for (const vehicle of sortedVehicles) {
      if (remainingInstances.length === 0) {
        break;
      }

      // Avoid dispatching the same physical asset more than once in a simultaneous allocation
      const vKey = vehicle.vehicleId ?? vehicle.candidateId;
      if (usedVehicleIds.has(vKey)) {
        continue;
      }

      // Find candidates from remaining instances that fit within this vehicle's payload capacity
      let accumulatedWeight = 0;
      const candidateSubset: PhysicalCargoInstance[] = [];

      for (const inst of remainingInstances) {
        if (accumulatedWeight + inst.weightGrams <= vehicle.maxPayloadGrams) {
          candidateSubset.push(inst);
          accumulatedWeight += inst.weightGrams;
        }
      }

      if (candidateSubset.length === 0) {
        continue;
      }

      // Convert candidate instances into CargoItemInputs with individual identity tracking
      const candidateCargoInputs: CargoItemInput[] = candidateSubset.map((inst) => ({
        cargoId: inst.instanceId, // Use unique instanceId as cargoId so packing engine preserves exact instance
        description: inst.description,
        lengthMm: inst.lengthMm,
        widthMm: inst.widthMm,
        heightMm: inst.heightMm,
        weightGrams: inst.weightGrams,
        quantity: 1, // Physical instances are atomic and never split
        isStackable: inst.isStackable,
        maxStackWeightGrams: inst.maxStackWeightGrams,
        maxStackTiers: inst.maxStackTiers,
        isFragile: inst.isFragile,
        allowRotationHorizontal: inst.allowRotationHorizontal,
        allowRotationVertical: inst.allowRotationVertical,
        allowedOrientations: inst.allowedOrientations,
        loadingPriority: inst.loadingPriority,
        unloadingSequence: inst.unloadingSequence,
      }));

      const truckSpace: TruckCargoSpace = {
        lengthMm: vehicle.lengthMm,
        widthMm: vehicle.widthMm,
        heightMm: vehicle.heightMm,
        maxPayloadGrams: vehicle.maxPayloadGrams,
        name: vehicle.name,
      };

      const packResult = this.packingEngine.pack({
        truck: truckSpace,
        cargo: candidateCargoInputs,
      });

      // If at least one instance was placed in this vehicle
      if (packResult.placements.length > 0) {
        // Find which instances were placed
        const placedIds = new Set(packResult.placements.map((p) => p.cargoId));
        const assignedInstances = candidateSubset.filter((inst) => placedIds.has(inst.instanceId));

        const assignedWeight = assignedInstances.reduce((sum, i) => sum + i.weightGrams, 0);
        const assignedVolume = assignedInstances.reduce((sum, i) => sum + i.volumeMm3, 0);

        assignments.push({
          vehicle,
          vehicleSequence: assignments.length + 1,
          assignedInstances,
          packingResult: packResult,
          assignedCargoWeightGrams: assignedWeight,
          payloadCapacityGrams: vehicle.maxPayloadGrams,
          payloadUtilizationPct: (assignedWeight / vehicle.maxPayloadGrams) * 100,
          unusedPayloadGrams: Math.max(0, vehicle.maxPayloadGrams - assignedWeight),
          assignedCargoVolumeMm3: assignedVolume,
          cargoSpaceVolumeMm3: vehicle.volumeMm3,
          volumeUtilizationPct: (assignedVolume / vehicle.volumeMm3) * 100,
          unusedVolumeMm3: Math.max(0, vehicle.volumeMm3 - assignedVolume),
        });

        usedVehicleIds.add(vKey);

        // Remove assigned instances from remaining
        remainingInstances = remainingInstances.filter((inst) => !placedIds.has(inst.instanceId));
      }
    }

    const isComplete = remainingInstances.length === 0;

    const unallocated = remainingInstances.map((inst) => ({
      instanceId: inst.instanceId,
      cargoId: inst.cargoId,
      description: inst.description,
      weightGrams: inst.weightGrams,
      volumeMm3: inst.volumeMm3,
      reason: 'No available fleet vehicle with remaining capacity could physically fit this cargo',
    }));

    if (!isComplete) {
      violations.push({
        code: 'PARTIAL_FLEET_ALLOCATION',
        message: `${remainingInstances.length} cargo instance(s) could not be allocated within the available fleet`,
      });
    }

    return this.buildResult({
      success: isComplete,
      assignments,
      unallocated,
      violations,
      totalCargoWeightGrams,
      totalCargoVolumeMm3,
      startTime,
    });
  }

  /**
   * Filters out unavailable, decommissioned, deprecated, or incomplete vehicles.
   */
  private filterEligibleVehicles(
    vehicles: FleetVehicleCandidate[],
    violations: FleetAllocationViolation[],
  ): FleetVehicleCandidate[] {
    return vehicles.filter((v) => {
      // 1. Physical vehicle status checks
      if (v.status === 'DECOMMISSIONED') {
        violations.push({
          code: 'VEHICLE_DECOMMISSIONED',
          message: `Vehicle ${v.name} (${v.candidateId}) is DECOMMISSIONED and excluded from allocation`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      if (v.status === 'MAINTENANCE' || v.status === 'IN_TRANSIT') {
        violations.push({
          code: 'VEHICLE_UNAVAILABLE_STATUS',
          message: `Vehicle ${v.name} (${v.candidateId}) status is ${v.status} and cannot be assigned`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      if (v.isAvailable === false) {
        violations.push({
          code: 'VEHICLE_UNAVAILABLE',
          message: `Vehicle ${v.name} (${v.candidateId}) is operationally unavailable`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      // 2. Vehicle specification lifecycle check
      if (v.verificationStatus === 'DEPRECATED') {
        violations.push({
          code: 'SPECIFICATION_DEPRECATED',
          message: `Vehicle specification ${v.vehicleTypeId} is DEPRECATED and ineligible for allocation`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      // 3. Packing compatibility & dimensional completeness check
      if (v.isPackingCompatible === false) {
        violations.push({
          code: 'SPECIFICATION_INCOMPLETE',
          message: `Vehicle ${v.name} (${v.candidateId}) is marked not packing-compatible (incomplete cargo bay)`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      if (v.lengthMm <= 0 || v.widthMm <= 0 || v.heightMm <= 0) {
        violations.push({
          code: 'INVALID_CARGO_DIMENSIONS',
          message: `Vehicle ${v.name} (${v.candidateId}) has non-positive internal dimensions`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      if (v.maxPayloadGrams <= 0) {
        violations.push({
          code: 'INVALID_PAYLOAD',
          message: `Vehicle ${v.name} (${v.candidateId}) has non-positive maximum payload`,
          candidateId: v.candidateId,
          vehicleId: v.vehicleId,
        });
        return false;
      }

      return true;
    });
  }

  /**
   * Deterministically sorts candidate vehicles using stable tie-breakers:
   * 1. Primary: Maximum payload capacity (descending)
   * 2. Secondary: Cargo-space volume (descending)
   * 3. Tertiary: Preference for physical vehicle assets over pure templates
   * 4. Quaternary: Lexicographical candidate identifier (ascending)
   */
  private sortCandidateVehicles(vehicles: FleetVehicleCandidate[]): FleetVehicleCandidate[] {
    return [...vehicles].sort((a, b) => {
      // 1. Useful Payload Capacity (descending)
      if (b.maxPayloadGrams !== a.maxPayloadGrams) {
        return b.maxPayloadGrams - a.maxPayloadGrams;
      }

      // 2. Cargo-Space Volume (descending)
      if (b.volumeMm3 !== a.volumeMm3) {
        return b.volumeMm3 - a.volumeMm3;
      }

      // 3. Physical Asset Priority (physical vehicles preferred over abstract templates)
      const aIsPhysical = a.vehicleId ? 1 : 0;
      const bIsPhysical = b.vehicleId ? 1 : 0;
      if (bIsPhysical !== aIsPhysical) {
        return bIsPhysical - aIsPhysical;
      }

      // 4. Stable Lexicographical ID Tie-Breaker (ascending)
      const aId = a.vehicleId ?? a.candidateId ?? a.vehicleTypeId;
      const bId = b.vehicleId ?? b.candidateId ?? b.vehicleTypeId;
      return aId.localeCompare(bId);
    });
  }

  /**
   * Expands cargo items into discrete physical instances.
   * Sorts deterministically by loading priority (descending), unloading sequence (ascending),
   * volume (descending), and instanceId (ascending).
   */
  private expandCargoInstances(cargoItems: CargoItemInput[]): PhysicalCargoInstance[] {
    const instances: PhysicalCargoInstance[] = [];

    for (const item of cargoItems) {
      const volumeMm3 = item.lengthMm * item.widthMm * item.heightMm;
      for (let i = 0; i < item.quantity; i++) {
        instances.push({
          instanceId: `${item.cargoId}#${i + 1}`,
          cargoId: item.cargoId,
          description: item.description,
          lengthMm: item.lengthMm,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          weightGrams: item.weightGrams,
          volumeMm3,
          isStackable: item.isStackable ?? true,
          maxStackWeightGrams: item.maxStackWeightGrams,
          maxStackTiers: item.maxStackTiers,
          isFragile: item.isFragile ?? false,
          allowRotationHorizontal: item.allowRotationHorizontal ?? true,
          allowRotationVertical: item.allowRotationVertical ?? false,
          allowedOrientations: item.allowedOrientations,
          loadingPriority: item.loadingPriority ?? 1,
          unloadingSequence: item.unloadingSequence ?? 1,
        });
      }
    }

    return instances.sort((a, b) => {
      // 1. Higher loading priority first
      if (b.loadingPriority !== a.loadingPriority) {
        return b.loadingPriority - a.loadingPriority;
      }
      // 2. Earlier delivery stop first (LIFO order for unloading)
      if (a.unloadingSequence !== b.unloadingSequence) {
        return a.unloadingSequence - b.unloadingSequence;
      }
      // 3. Larger volume first
      if (b.volumeMm3 !== a.volumeMm3) {
        return b.volumeMm3 - a.volumeMm3;
      }
      // 4. Stable tie-breaker: instance ID
      return a.instanceId.localeCompare(b.instanceId);
    });
  }

  /**
   * Constructs the comprehensive result object with objective metrics.
   */
  private buildResult(params: {
    success: boolean;
    assignments: VehicleCargoAssignment[];
    unallocated: Array<{
      instanceId: string;
      cargoId: string;
      description?: string;
      weightGrams: number;
      volumeMm3: number;
      reason: string;
    }>;
    violations: FleetAllocationViolation[];
    totalCargoWeightGrams: number;
    totalCargoVolumeMm3: number;
    startTime: number;
  }): FleetAllocationResult {
    const totalPayloadCapacityGrams = params.assignments.reduce(
      (sum, a) => sum + a.payloadCapacityGrams,
      0,
    );
    const totalAllocatedWeightGrams = params.assignments.reduce(
      (sum, a) => sum + a.assignedCargoWeightGrams,
      0,
    );
    const totalCargoSpaceVolumeMm3 = params.assignments.reduce(
      (sum, a) => sum + a.cargoSpaceVolumeMm3,
      0,
    );
    const totalAllocatedVolumeMm3 = params.assignments.reduce(
      (sum, a) => sum + a.assignedCargoVolumeMm3,
      0,
    );

    const payloadUtilizationPct =
      totalPayloadCapacityGrams > 0
        ? (totalAllocatedWeightGrams / totalPayloadCapacityGrams) * 100
        : 0;

    const volumeUtilizationPct =
      totalCargoSpaceVolumeMm3 > 0
        ? (totalAllocatedVolumeMm3 / totalCargoSpaceVolumeMm3) * 100
        : 0;

    const metrics: FleetAllocationObjectiveMetrics = {
      vehicleCount: params.assignments.length,
      totalPayloadCapacityGrams,
      totalCargoWeightGrams: params.totalCargoWeightGrams,
      payloadUtilizationPct: Math.round(payloadUtilizationPct * 100) / 100,
      totalCargoVolumeMm3: params.totalCargoVolumeMm3,
      totalCargoSpaceVolumeMm3,
      volumeUtilizationPct: Math.round(volumeUtilizationPct * 100) / 100,
      unusedPayloadCapacityGrams: Math.max(0, totalPayloadCapacityGrams - totalAllocatedWeightGrams),
      unusedVolumeCapacityMm3: Math.max(0, totalCargoSpaceVolumeMm3 - totalAllocatedVolumeMm3),
    };

    return {
      success: params.success,
      algorithmName: 'DETERMINISTIC_FLEET_ALLOCATION_HEURISTIC',
      algorithmVersion: 'v1.0.0',
      executionDurationMs: Date.now() - params.startTime,
      vehicleAssignments: params.assignments,
      selectedVehicleIds: params.assignments.map(
        (a) => a.vehicle.vehicleId ?? a.vehicle.candidateId,
      ),
      unallocatedCargo: params.unallocated,
      violations: params.violations,
      metrics,
    };
  }
}
