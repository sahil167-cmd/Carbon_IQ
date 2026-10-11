import { CargoItemInput } from '../packing/types';
import {
  FleetAllocationResult,
  FleetVehicleCandidate,
} from '../allocation/types';

/**
 * Configuration options for bounded fleet optimization.
 */
export interface FleetOptimizationOptions {
  /**
   * Maximum fleet candidate pool size to consider (prunes excessive vehicles).
   * Default: 8
   */
  maxVehiclesToConsider?: number;

  /**
   * Maximum number of fleet configurations to evaluate before terminating.
   * Default: 50
   */
  maxCandidateSolutions?: number;

  /**
   * Maximum wall-clock execution time in milliseconds.
   * Default: 5000 ms
   */
  maxExecutionTimeMs?: number;

  /**
   * If false, strictly evaluates only single-vehicle solutions.
   * Default: true
   */
  allowMultiVehicleFallback?: boolean;
}

/**
 * Pure Domain input contract for FleetOptimizationEngine.
 */
export interface FleetOptimizationInput {
  shipmentId: string;
  cargoItems: CargoItemInput[];
  vehicles: FleetVehicleCandidate[];
  options?: FleetOptimizationOptions;
}

/**
 * Quantification of improvements achieved over the greedy baseline.
 */
export interface FleetOptimizationImprovement {
  vehiclesSaved: number;
  payloadUtilizationDeltaPct: number;
  volumeUtilizationDeltaPct: number;
  unusedPayloadReductionGrams: number;
  unusedVolumeReductionMm3: number;
}

/**
 * Execution diagnostics and search tree statistics.
 */
export interface FleetOptimizationSearchStatistics {
  totalVehiclesAvailable: number;
  configurationsEvaluated: number;
  feasibleConfigurationsCount: number;
  rejectedConfigurationsCount: number;
  searchComplete: boolean;
  terminationReason:
    | 'EXHAUSTIVE_SEARCH_COMPLETED'
    | 'EARLY_OPTIMAL_TERMINATION'
    | 'TIME_LIMIT_EXCEEDED'
    | 'CANDIDATE_LIMIT_EXCEEDED'
    | 'NO_FEASIBLE_FLEET';
  executionDurationMs: number;
}

/**
 * Complete multi-objective fleet optimization result.
 */
export interface FleetOptimizationResult {
  success: boolean;
  algorithmName: string;
  algorithmVersion: string;
  optimalityGuarantee: 'BOUNDED_SEARCH_ONLY' | 'PROVABLY_OPTIMAL_WITHIN_BOUNDS';

  baseline: FleetAllocationResult;
  bestSolution: FleetAllocationResult | null;
  improvement: FleetOptimizationImprovement;
  searchStatistics: FleetOptimizationSearchStatistics;
  metadata?: Record<string, any>;
}
