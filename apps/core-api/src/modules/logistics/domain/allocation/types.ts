import {
  CargoItemInput,
  PackingResult,
  PhysicalCargoInstance,
  TruckCargoSpace,
} from '../packing/types';

/**
 * Pure Domain Candidate Vehicle representation for fleet allocation.
 * Dimensions are integer millimetres (mm) and mass is integer grams (g).
 */
export interface FleetVehicleCandidate {
  candidateId: string;
  vehicleId?: string;       // Physical fleet vehicle ID (if physical asset)
  vehicleTypeId: string;   // Vehicle specification template ID
  registrationNumber?: string;
  name: string;

  // Spatial Dimensions (integer mm)
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  volumeMm3: number;

  // Weight Capacity (integer grams)
  maxPayloadGrams: number;

  // Operational & Engineering Status
  status?: string;         // e.g. "AVAILABLE", "ACTIVE", "MAINTENANCE", "DECOMMISSIONED"
  isAvailable?: boolean;   // true if operationally available
  verificationStatus?: string; // "VERIFIED", "UNVERIFIED", "DEPRECATED"
  isPackingCompatible?: boolean;

  // Optional operational sorting weights or costs (for future multi-objective scoring)
  metadata?: Record<string, any>;
}

/**
 * Options controlling the fleet allocation engine execution.
 */
export interface FleetAllocationOptions {
  allowMultiVehicleFallback?: boolean; // Default: true
  maxVehiclesToConsider?: number;      // Maximum vehicles in search pool
}

/**
 * Pure Domain Input contract for FleetAllocationEngine.
 */
export interface FleetAllocationInput {
  shipmentId: string;
  cargoItems: CargoItemInput[];
  vehicles: FleetVehicleCandidate[];
  options?: FleetAllocationOptions;
}

/**
 * Represents the cargo assigned to a specific vehicle in the fleet allocation.
 */
export interface VehicleCargoAssignment {
  vehicle: FleetVehicleCandidate;
  vehicleSequence: number; // 1, 2, ... N
  assignedInstances: PhysicalCargoInstance[];
  packingResult: PackingResult;

  // Weight Accounting
  assignedCargoWeightGrams: number;
  payloadCapacityGrams: number;
  payloadUtilizationPct: number;
  unusedPayloadGrams: number;

  // Volume Accounting
  assignedCargoVolumeMm3: number;
  cargoSpaceVolumeMm3: number;
  volumeUtilizationPct: number;
  unusedVolumeMm3: number;
}

/**
 * Objective metrics quantifying capacity utilization and physical fleet efficiency.
 */
export interface FleetAllocationObjectiveMetrics {
  vehicleCount: number;
  totalPayloadCapacityGrams: number;
  totalCargoWeightGrams: number;
  payloadUtilizationPct: number;
  totalCargoVolumeMm3: number;
  totalCargoSpaceVolumeMm3: number;
  volumeUtilizationPct: number;
  unusedPayloadCapacityGrams: number;
  unusedVolumeCapacityMm3: number;
}

/**
 * Rule or capacity violation encountered during allocation.
 */
export interface FleetAllocationViolation {
  code: string;
  message: string;
  candidateId?: string;
  vehicleId?: string;
  cargoId?: string;
  instanceId?: string;
}

/**
 * Comprehensive result of fleet allocation.
 */
export interface FleetAllocationResult {
  success: boolean;
  algorithmName: string;
  algorithmVersion: string;
  executionDurationMs: number;

  // Vehicle Assignments & Identifiers
  vehicleAssignments: VehicleCargoAssignment[];
  selectedVehicleIds: string[];

  // Unallocated Cargo Manifest (if any)
  unallocatedCargo: Array<{
    instanceId: string;
    cargoId: string;
    description?: string;
    weightGrams: number;
    volumeMm3: number;
    reason: string;
  }>;

  // Diagnostic Audit Violations
  violations: FleetAllocationViolation[];

  // Objective Utilization Metrics
  metrics: FleetAllocationObjectiveMetrics;
}
