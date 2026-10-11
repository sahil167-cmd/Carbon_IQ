import { FleetAllocationEngine } from '../allocation/FleetAllocationEngine';
import {
  FleetAllocationInput,
  FleetAllocationResult,
  FleetVehicleCandidate,
} from '../allocation/types';
import {
  FleetOptimizationInput,
  FleetOptimizationImprovement,
  FleetOptimizationOptions,
  FleetOptimizationResult,
  FleetOptimizationSearchStatistics,
} from './types';

/**
 * FleetOptimizationEngine
 *
 * Implements bounded combinatorial search over physical fleet vehicle configurations,
 * evaluating feasibility using Phase 3A FleetAllocationEngine and Phase 1B CargoPackingEngine.
 *
 * Lexicographic Objective Hierarchy:
 * 1. Minimize physical vehicle count (fewer trucks strictly beats any utilization metric).
 * 2. Maximize payload utilization (integer-derived percentage).
 * 3. Maximize cargo-space volume utilization.
 * 4. Minimize unused payload capacity (grams).
 * 5. Minimize unused cargo-space volume (mm3).
 *
 * Algorithm Version: CarbonIQ-FleetOptimizer-Lexicographic-Bounded-v1.0.0
 * Optimality: BOUNDED_SEARCH_ONLY (guaranteed optimal within evaluated bounds and prunings).
 */
export class FleetOptimizationEngine {
  private readonly allocationEngine: FleetAllocationEngine;

  constructor(allocationEngine?: FleetAllocationEngine) {
    this.allocationEngine = allocationEngine ?? new FleetAllocationEngine();
  }

  /**
   * Executes bounded multi-objective fleet optimization.
   */
  public optimize(input: FleetOptimizationInput): FleetOptimizationResult {
    const startTime = Date.now();
    const options: Required<FleetOptimizationOptions> = {
      maxVehiclesToConsider: input.options?.maxVehiclesToConsider ?? 8,
      maxCandidateSolutions: input.options?.maxCandidateSolutions ?? 50,
      maxExecutionTimeMs: input.options?.maxExecutionTimeMs ?? 5000,
      allowMultiVehicleFallback: input.options?.allowMultiVehicleFallback ?? true,
    };

    // 1. Calculate baseline solution using Phase 3A deterministic heuristic
    const baseline = this.allocationEngine.allocate({
      shipmentId: input.shipmentId,
      cargoItems: input.cargoItems,
      vehicles: input.vehicles,
      options: {
        allowMultiVehicleFallback: options.allowMultiVehicleFallback,
      },
    });

    let bestSolution: FleetAllocationResult | null = baseline.success ? baseline : null;
    let configurationsEvaluated = 1; // Baseline counts as first evaluated configuration
    let feasibleConfigurationsCount = baseline.success ? 1 : 0;
    let rejectedConfigurationsCount = baseline.success ? 0 : 1;
    let searchComplete = true;
    let terminationReason: FleetOptimizationSearchStatistics['terminationReason'] =
      'EXHAUSTIVE_SEARCH_COMPLETED';

    // 2. Filter & prune candidate vehicles for optimization search pool
    const eligibleVehicles = this.filterEligibleVehicles(input.vehicles);
    const candidatePool = this.sortAndSliceCandidates(
      eligibleVehicles,
      options.maxVehiclesToConsider,
    );

    const totalCargoWeightGrams = input.cargoItems.reduce(
      (sum, item) => sum + item.weightGrams * item.quantity,
      0,
    );

    // If no eligible vehicles or no cargo, return immediate baseline result
    if (candidatePool.length === 0 || input.cargoItems.length === 0) {
      return this.assembleResult({
        baseline,
        bestSolution,
        configurationsEvaluated,
        feasibleConfigurationsCount,
        rejectedConfigurationsCount,
        searchComplete: true,
        terminationReason: candidatePool.length === 0 ? 'NO_FEASIBLE_FLEET' : 'EXHAUSTIVE_SEARCH_COMPLETED',
        totalVehiclesAvailable: input.vehicles.length,
        startTime,
      });
    }

    // 3. Search over vehicle subsets ordered by increasing cardinality k = 1..N
    // Since Objective 1 is minimum vehicle count, exploring k=1, k=2, ... guarantees
    // that if a feasible k-vehicle solution is found and all subsets of size <= k are checked,
    // we can safely terminate without evaluating larger subsets.
    const maxK = options.allowMultiVehicleFallback ? candidatePool.length : 1;

    searchLoop: for (let k = 1; k <= maxK; k++) {
      const subsets = this.generateCombinations(candidatePool, k);

      for (const subset of subsets) {
        // Check execution time limit
        if (Date.now() - startTime >= options.maxExecutionTimeMs) {
          searchComplete = false;
          terminationReason = 'TIME_LIMIT_EXCEEDED';
          break searchLoop;
        }

        // Check candidate evaluation limit
        if (configurationsEvaluated >= options.maxCandidateSolutions) {
          searchComplete = false;
          terminationReason = 'CANDIDATE_LIMIT_EXCEEDED';
          break searchLoop;
        }

        // Mathematical capacity lower-bound pruning:
        // Combined payload of vehicles in this subset must be >= total cargo weight
        const subsetTotalPayload = subset.reduce((sum, v) => sum + v.maxPayloadGrams, 0);
        if (subsetTotalPayload < totalCargoWeightGrams) {
          rejectedConfigurationsCount++;
          continue;
        }

        configurationsEvaluated++;

        // Evaluate deterministic allocation on this candidate subset
        const candidateAllocation = this.allocationEngine.allocate({
          shipmentId: input.shipmentId,
          cargoItems: input.cargoItems,
          vehicles: subset,
          options: {
            allowMultiVehicleFallback: options.allowMultiVehicleFallback,
          },
        });

        if (candidateAllocation.success) {
          feasibleConfigurationsCount++;
          if (bestSolution === null || this.isBetter(candidateAllocation, bestSolution)) {
            bestSolution = candidateAllocation;
          }
        } else {
          rejectedConfigurationsCount++;
        }
      }

      // Safe Early Termination Check:
      // If we have found a feasible solution using k vehicles, and all combinations
      // of size k have been evaluated, no subsequent subset with size > k can ever
      // beat k vehicles in our lexicographic objective!
      if (bestSolution !== null && bestSolution.metrics.vehicleCount === k) {
        terminationReason = 'EARLY_OPTIMAL_TERMINATION';
        searchComplete = true;
        break searchLoop;
      }
    }

    if (bestSolution === null) {
      terminationReason = 'NO_FEASIBLE_FLEET';
    }

    return this.assembleResult({
      baseline,
      bestSolution,
      configurationsEvaluated,
      feasibleConfigurationsCount,
      rejectedConfigurationsCount,
      searchComplete,
      terminationReason,
      totalVehiclesAvailable: input.vehicles.length,
      startTime,
    });
  }

  /**
   * Lexicographic comparison of two feasible allocation solutions.
   *
   * Priority hierarchy:
   * 1. Minimum vehicle count
   * 2. Maximum payload utilization
   * 3. Maximum volume utilization
   * 4. Minimum unused payload
   * 5. Minimum unused volume
   */
  public isBetter(candidate: FleetAllocationResult, currentBest: FleetAllocationResult): boolean {
    if (!candidate.success) return false;
    if (!currentBest.success) return true;

    // Objective 1: Minimum vehicle count (fewer trucks strictly wins)
    if (candidate.metrics.vehicleCount !== currentBest.metrics.vehicleCount) {
      return candidate.metrics.vehicleCount < currentBest.metrics.vehicleCount;
    }

    // Objective 2: Maximum payload utilization
    if (candidate.metrics.payloadUtilizationPct !== currentBest.metrics.payloadUtilizationPct) {
      return candidate.metrics.payloadUtilizationPct > currentBest.metrics.payloadUtilizationPct;
    }

    // Objective 3: Maximum volume utilization
    if (candidate.metrics.volumeUtilizationPct !== currentBest.metrics.volumeUtilizationPct) {
      return candidate.metrics.volumeUtilizationPct > currentBest.metrics.volumeUtilizationPct;
    }

    // Objective 4: Minimum unused payload
    if (candidate.metrics.unusedPayloadCapacityGrams !== currentBest.metrics.unusedPayloadCapacityGrams) {
      return candidate.metrics.unusedPayloadCapacityGrams < currentBest.metrics.unusedPayloadCapacityGrams;
    }

    // Objective 5: Minimum unused volume
    if (candidate.metrics.unusedVolumeCapacityMm3 !== currentBest.metrics.unusedVolumeCapacityMm3) {
      return candidate.metrics.unusedVolumeCapacityMm3 < currentBest.metrics.unusedVolumeCapacityMm3;
    }

    // Stable tie-breaker: compare concatenated vehicle IDs
    const candidateIdStr = candidate.selectedVehicleIds.slice().sort().join(',');
    const bestIdStr = currentBest.selectedVehicleIds.slice().sort().join(',');
    return candidateIdStr.localeCompare(bestIdStr) < 0;
  }

  /**
   * Generates all combinations of size k from an array of vehicles deterministically.
   */
  private generateCombinations<T>(arr: T[], k: number): T[][] {
    const results: T[][] = [];

    const helper = (start: number, current: T[]) => {
      if (current.length === k) {
        results.push([...current]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        helper(i + 1, current);
        current.pop();
      }
    };

    helper(0, []);
    return results;
  }

  /**
   * Filters candidate vehicles for operational and technical eligibility.
   */
  private filterEligibleVehicles(vehicles: FleetVehicleCandidate[]): FleetVehicleCandidate[] {
    return vehicles.filter((v) => {
      if (v.status === 'DECOMMISSIONED' || v.status === 'MAINTENANCE' || v.status === 'IN_TRANSIT') {
        return false;
      }
      if (v.isAvailable === false) {
        return false;
      }
      if (v.verificationStatus === 'DEPRECATED') {
        return false;
      }
      if (v.isPackingCompatible === false) {
        return false;
      }
      if (v.lengthMm <= 0 || v.widthMm <= 0 || v.heightMm <= 0 || v.maxPayloadGrams <= 0) {
        return false;
      }
      return true;
    });
  }

  /**
   * Sorts candidate vehicles deterministically and bounds the pool to maxVehicles.
   */
  private sortAndSliceCandidates(
    vehicles: FleetVehicleCandidate[],
    maxVehicles: number,
  ): FleetVehicleCandidate[] {
    const sorted = [...vehicles].sort((a, b) => {
      if (b.maxPayloadGrams !== a.maxPayloadGrams) {
        return b.maxPayloadGrams - a.maxPayloadGrams;
      }
      if (b.volumeMm3 !== a.volumeMm3) {
        return b.volumeMm3 - a.volumeMm3;
      }
      const aId = a.vehicleId ?? a.candidateId ?? a.vehicleTypeId;
      const bId = b.vehicleId ?? b.candidateId ?? b.vehicleTypeId;
      return aId.localeCompare(bId);
    });

    return sorted.slice(0, maxVehicles);
  }

  /**
   * Assembles the comprehensive FleetOptimizationResult.
   */
  private assembleResult(params: {
    baseline: FleetAllocationResult;
    bestSolution: FleetAllocationResult | null;
    configurationsEvaluated: number;
    feasibleConfigurationsCount: number;
    rejectedConfigurationsCount: number;
    searchComplete: boolean;
    terminationReason: FleetOptimizationSearchStatistics['terminationReason'];
    totalVehiclesAvailable: number;
    startTime: number;
  }): FleetOptimizationResult {
    const { baseline, bestSolution } = params;

    let improvement: FleetOptimizationImprovement = {
      vehiclesSaved: 0,
      payloadUtilizationDeltaPct: 0,
      volumeUtilizationDeltaPct: 0,
      unusedPayloadReductionGrams: 0,
      unusedVolumeReductionMm3: 0,
    };

    if (bestSolution && bestSolution.success) {
      if (baseline.success) {
        improvement = {
          vehiclesSaved: Math.max(0, baseline.metrics.vehicleCount - bestSolution.metrics.vehicleCount),
          payloadUtilizationDeltaPct:
            Math.round(
              (bestSolution.metrics.payloadUtilizationPct - baseline.metrics.payloadUtilizationPct) * 100,
            ) / 100,
          volumeUtilizationDeltaPct:
            Math.round(
              (bestSolution.metrics.volumeUtilizationPct - baseline.metrics.volumeUtilizationPct) * 100,
            ) / 100,
          unusedPayloadReductionGrams: Math.max(
            0,
            baseline.metrics.unusedPayloadCapacityGrams - bestSolution.metrics.unusedPayloadCapacityGrams,
          ),
          unusedVolumeReductionMm3: Math.max(
            0,
            baseline.metrics.unusedVolumeCapacityMm3 - bestSolution.metrics.unusedVolumeCapacityMm3,
          ),
        };
      } else {
        // Baseline could not complete allocation, but optimization found a feasible fleet!
        improvement = {
          vehiclesSaved: 0,
          payloadUtilizationDeltaPct: bestSolution.metrics.payloadUtilizationPct,
          volumeUtilizationDeltaPct: bestSolution.metrics.volumeUtilizationPct,
          unusedPayloadReductionGrams: 0,
          unusedVolumeReductionMm3: 0,
        };
      }
    }

    const searchStatistics: FleetOptimizationSearchStatistics = {
      totalVehiclesAvailable: params.totalVehiclesAvailable,
      configurationsEvaluated: params.configurationsEvaluated,
      feasibleConfigurationsCount: params.feasibleConfigurationsCount,
      rejectedConfigurationsCount: params.rejectedConfigurationsCount,
      searchComplete: params.searchComplete,
      terminationReason: params.terminationReason,
      executionDurationMs: Date.now() - params.startTime,
    };

    return {
      success: bestSolution !== null && bestSolution.success,
      algorithmName: 'CarbonIQ-FleetOptimizer-Lexicographic-Bounded',
      algorithmVersion: 'v1.0.0',
      optimalityGuarantee: params.searchComplete
        ? 'PROVABLY_OPTIMAL_WITHIN_BOUNDS'
        : 'BOUNDED_SEARCH_ONLY',
      baseline,
      bestSolution,
      improvement,
      searchStatistics,
    };
  }
}
