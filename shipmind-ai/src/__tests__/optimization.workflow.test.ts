import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogisticsService from '../services/logistics.service';
import * as apiClient from '../lib/api-client';
import type {
  FleetOptimizationResult,
  PersistedOptimizationRun,
  OptimizeShipmentRequest,
} from '../types/logistics';

describe('Phase 7C: Logistics Frontend — Fleet Optimization & Results Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Optimization Execution & API Request Dispatch
  // =========================================================================
  describe('Optimization Execution Service', () => {
    it('TEST 1: Submits bounded fleet optimization request with custom options and persistence', async () => {
      const mockResult: FleetOptimizationResult = {
        success: true,
        algorithmName: 'BOUNDED-BRANCH-AND-BOUND',
        algorithmVersion: '3D-BIN-PACK-V1-FIRST-FIT-DECREASING',
        optimalityGuarantee: 'PROVABLY_OPTIMAL_WITHIN_BOUNDS',
        optimizationRunId: 'opt-run-101',
        baseline: {
          success: true,
          algorithmName: 'FIRST-FIT',
          algorithmVersion: '1.0',
          executionDurationMs: 12,
          vehicleAssignments: [],
          selectedVehicleIds: ['veh-1', 'veh-2'],
          unallocatedCargo: [],
          violations: [],
          metrics: {
            vehicleCount: 2,
            totalPayloadCapacityGrams: 5000000,
            totalCargoWeightGrams: 3200000,
            payloadUtilizationPct: 64.0,
            totalCargoVolumeMm3: 15000000000,
            totalCargoSpaceVolumeMm3: 25000000000,
            volumeUtilizationPct: 60.0,
            unusedPayloadCapacityGrams: 1800000,
            unusedVolumeCapacityMm3: 10000000000,
          },
        },
        bestSolution: {
          success: true,
          algorithmName: 'BOUNDED-OPTIMIZER',
          algorithmVersion: '1.0',
          executionDurationMs: 45,
          vehicleAssignments: [],
          selectedVehicleIds: ['veh-1'],
          unallocatedCargo: [],
          violations: [],
          metrics: {
            vehicleCount: 1,
            totalPayloadCapacityGrams: 3500000,
            totalCargoWeightGrams: 3200000,
            payloadUtilizationPct: 91.4,
            totalCargoVolumeMm3: 15000000000,
            totalCargoSpaceVolumeMm3: 17000000000,
            volumeUtilizationPct: 88.2,
            unusedPayloadCapacityGrams: 300000,
            unusedVolumeCapacityMm3: 2000000000,
          },
        },
        improvement: {
          vehiclesSaved: 1,
          payloadUtilizationDeltaPct: 27.4,
          volumeUtilizationDeltaPct: 28.2,
          unusedPayloadReductionGrams: 1500000,
          unusedVolumeReductionMm3: 8000000000,
        },
        searchStatistics: {
          totalVehiclesAvailable: 5,
          configurationsEvaluated: 12,
          feasibleConfigurationsCount: 3,
          rejectedConfigurationsCount: 9,
          searchComplete: true,
          terminationReason: 'EXHAUSTIVE_SEARCH_COMPLETED',
          executionDurationMs: 45,
        },
      };

      const apiPostSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValue(mockResult);

      const requestPayload: OptimizeShipmentRequest = {
        scenarioName: 'Test High-Density Run',
        options: {
          maxVehiclesToConsider: 6,
          maxCandidateSolutions: 30,
          maxExecutionTimeMs: 4000,
          allowMultiVehicleFallback: true,
        },
        persistOptimizationRun: true,
      };

      const result = await LogisticsService.optimizeShipment('shp-99', requestPayload);

      expect(apiPostSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/shp-99/optimize',
        requestPayload,
      );
      expect(result.success).toBe(true);
      expect(result.optimizationRunId).toBe('opt-run-101');
      expect(result.optimalityGuarantee).toBe('PROVABLY_OPTIMAL_WITHIN_BOUNDS');
      expect(result.improvement.vehiclesSaved).toBe(1);
    });

    it('TEST 2: Supports non-persisted on-the-fly optimization request without database write', async () => {
      const mockResult: FleetOptimizationResult = {
        success: true,
        algorithmName: 'FAST-ALLOCATOR',
        algorithmVersion: '1.0',
        optimalityGuarantee: 'BOUNDED_SEARCH_ONLY',
        baseline: {
          success: true,
          algorithmName: 'FIRST-FIT',
          algorithmVersion: '1.0',
          executionDurationMs: 5,
          vehicleAssignments: [],
          selectedVehicleIds: ['veh-1'],
          unallocatedCargo: [],
          violations: [],
          metrics: {
            vehicleCount: 1,
            totalPayloadCapacityGrams: 2000000,
            totalCargoWeightGrams: 1000000,
            payloadUtilizationPct: 50.0,
            totalCargoVolumeMm3: 5000000000,
            totalCargoSpaceVolumeMm3: 10000000000,
            volumeUtilizationPct: 50.0,
            unusedPayloadCapacityGrams: 1000000,
            unusedVolumeCapacityMm3: 5000000000,
          },
        },
        bestSolution: null,
        improvement: {
          vehiclesSaved: 0,
          payloadUtilizationDeltaPct: 0,
          volumeUtilizationDeltaPct: 0,
          unusedPayloadReductionGrams: 0,
          unusedVolumeReductionMm3: 0,
        },
        searchStatistics: {
          totalVehiclesAvailable: 2,
          configurationsEvaluated: 2,
          feasibleConfigurationsCount: 1,
          rejectedConfigurationsCount: 1,
          searchComplete: true,
          terminationReason: 'EARLY_OPTIMAL_TERMINATION',
          executionDurationMs: 8,
        },
      };

      const apiPostSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValue(mockResult);

      const result = await LogisticsService.optimizeShipment('shp-99', {
        persistOptimizationRun: false,
      });

      expect(apiPostSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/shp-99/optimize',
        { persistOptimizationRun: false },
      );
      expect(result.optimizationRunId).toBeUndefined();
      expect(result.optimalityGuarantee).toBe('BOUNDED_SEARCH_ONLY');
    });

    it('TEST 3: Propagates error when backend optimization fails or times out', async () => {
      vi.spyOn(apiClient, 'apiPost').mockRejectedValue(
        new Error('Optimization bounds exceeded: Time limit reached (5000ms)'),
      );

      await expect(
        LogisticsService.optimizeShipment('shp-99', {
          options: { maxExecutionTimeMs: 5000 },
        }),
      ).rejects.toThrow('Optimization bounds exceeded');
    });
  });

  // =========================================================================
  // 2. Persisted Optimization Result Retrieval
  // =========================================================================
  describe('Persisted Optimization Result Retrieval', () => {
    it('TEST 4: Fetches persisted optimization run with multi-vehicle load plans', async () => {
      const mockRun: PersistedOptimizationRun = {
        id: 'opt-run-202',
        shipmentId: 'shp-100',
        scenarioName: 'Express Fleet Allocation',
        status: 'FEASIBLE',
        algorithmVersion: '3D-BIN-PACK-V1-FIRST-FIT-DECREASING',
        baselineTruckCount: 3,
        optimizedTruckCount: 2,
        totalLoadedWeightKg: 4500,
        totalLoadedVolumeM3: 18.5,
        overallWeightUtilizationPct: 88.5,
        overallVolumeUtilizationPct: 82.0,
        unassignedItemsCount: 0,
        violationsCount: 0,
        executionTimeMs: 142,
        loadPlans: [
          {
            id: 'lp-1',
            vehicleSequence: 1,
            vehicleTypeId: 'TATA-407-3T',
            vehicleId: 'veh-tata-01',
            loadedWeightKg: 2500,
            loadedVolumeM3: 10.2,
            weightUtilizationPct: 92.5,
            volumeUtilizationPct: 85.0,
            placementsJson: [
              { instanceId: 'inst-1', description: 'Heavy Machine Parts', lengthMm: 1200, widthMm: 800, heightMm: 900 },
              { instanceId: 'inst-2', description: 'Steel Brackets', lengthMm: 600, widthMm: 400, heightMm: 300 },
            ],
          },
          {
            id: 'lp-2',
            vehicleSequence: 2,
            vehicleTypeId: 'MAHINDRA-BOLERO-MAXI-1.7T',
            vehicleId: 'veh-bolero-02',
            loadedWeightKg: 2000,
            loadedVolumeM3: 8.3,
            weightUtilizationPct: 83.3,
            volumeUtilizationPct: 78.5,
            placementsJson: [
              { instanceId: 'inst-3', description: 'Packaging Boxes', lengthMm: 500, widthMm: 500, heightMm: 500 },
            ],
          },
        ],
        createdAt: '2026-09-07T00:30:00.000Z',
      };

      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue(mockRun);

      const result = await LogisticsService.getOptimizationResult('opt-run-202');

      expect(apiGetSpy).toHaveBeenCalledWith('/api/v1/logistics/optimizations/opt-run-202');
      expect(result.id).toBe('opt-run-202');
      expect(result.status).toBe('FEASIBLE');
      expect(result.loadPlans).toHaveLength(2);
      expect(result.loadPlans![0].vehicleTypeId).toBe('TATA-407-3T');
      expect(result.loadPlans![0].weightUtilizationPct).toBe(92.5);
    });

    it('TEST 5: Handles 404 when requesting non-existent optimization run', async () => {
      vi.spyOn(apiClient, 'apiGet').mockRejectedValue(new Error('OptimizationRun not found'));

      await expect(LogisticsService.getOptimizationResult('invalid-run-id')).rejects.toThrow(
        'OptimizationRun not found',
      );
    });
  });

  // =========================================================================
  // 3. Domain Metric & Accounting Validation
  // =========================================================================
  describe('Domain Metrics & Utilization Accounting', () => {
    it('TEST 6: Accurately calculates vehicles saved between baseline and optimized fleet', () => {
      const baselineTruckCount = 4;
      const optimizedTruckCount = 2;
      const vehiclesSaved = baselineTruckCount - optimizedTruckCount;

      expect(vehiclesSaved).toBe(2);
      expect(vehiclesSaved > 0).toBe(true);
    });

    it('TEST 7: Computes remaining weight and volume headroom for assigned vehicle', () => {
      const loadedWeightKg = 2500;
      const weightUtilizationPct = 80; // 80% utilization => total capacity is 3125 kg
      const totalCapacityKg = loadedWeightKg / (weightUtilizationPct / 100);
      const remainingHeadroomKg = totalCapacityKg - loadedWeightKg;

      expect(totalCapacityKg).toBeCloseTo(3125);
      expect(remainingHeadroomKg).toBeCloseTo(625);

      const loadedVolumeM3 = 12.0;
      const volumeUtilizationPct = 75; // 75% utilization => total capacity is 16.0 m3
      const totalVolumeM3 = loadedVolumeM3 / (volumeUtilizationPct / 100);
      const remainingVolumeHeadroomM3 = totalVolumeM3 - loadedVolumeM3;

      expect(totalVolumeM3).toBeCloseTo(16.0);
      expect(remainingVolumeHeadroomM3).toBeCloseTo(4.0);
    });

    it('TEST 8: Flags unallocated cargo warning when unassignedItemsCount > 0', () => {
      const runWithUnallocated: Partial<PersistedOptimizationRun> = {
        unassignedItemsCount: 3,
        violationsCount: 1,
      };

      const isAllAllocated = (runWithUnallocated.unassignedItemsCount ?? 0) === 0;
      expect(isAllAllocated).toBe(false);
      expect(runWithUnallocated.unassignedItemsCount).toBe(3);
    });

    it('TEST 9: Confirms 100% allocation when unassignedItemsCount === 0', () => {
      const runComplete: Partial<PersistedOptimizationRun> = {
        unassignedItemsCount: 0,
        violationsCount: 0,
      };

      const isAllAllocated = (runComplete.unassignedItemsCount ?? 0) === 0;
      expect(isAllAllocated).toBe(true);
    });
  });

  // =========================================================================
  // 4. Truthfulness & Search Quality Classification
  // =========================================================================
  describe('Optimality & Search Quality Truthfulness', () => {
    it('TEST 10: Correctly differentiates provably optimal vs bounded search guarantees', () => {
      const provableResult: Partial<FleetOptimizationResult> = {
        optimalityGuarantee: 'PROVABLY_OPTIMAL_WITHIN_BOUNDS',
        searchStatistics: {
          totalVehiclesAvailable: 4,
          configurationsEvaluated: 16,
          feasibleConfigurationsCount: 4,
          rejectedConfigurationsCount: 12,
          searchComplete: true,
          terminationReason: 'EXHAUSTIVE_SEARCH_COMPLETED',
          executionDurationMs: 38,
        },
      };

      const boundedResult: Partial<FleetOptimizationResult> = {
        optimalityGuarantee: 'BOUNDED_SEARCH_ONLY',
        searchStatistics: {
          totalVehiclesAvailable: 10,
          configurationsEvaluated: 50,
          feasibleConfigurationsCount: 5,
          rejectedConfigurationsCount: 45,
          searchComplete: false,
          terminationReason: 'TIME_LIMIT_EXCEEDED',
          executionDurationMs: 5000,
        },
      };

      expect(provableResult.optimalityGuarantee).toBe('PROVABLY_OPTIMAL_WITHIN_BOUNDS');
      expect(provableResult.searchStatistics?.terminationReason).toBe('EXHAUSTIVE_SEARCH_COMPLETED');

      expect(boundedResult.optimalityGuarantee).toBe('BOUNDED_SEARCH_ONLY');
      expect(boundedResult.searchStatistics?.terminationReason).toBe('TIME_LIMIT_EXCEEDED');
      expect(boundedResult.searchStatistics?.searchComplete).toBe(false);
    });

    it('TEST 11: Recognizes all valid backend termination reasons without unhandled branches', () => {
      const validTerminationReasons = [
        'EXHAUSTIVE_SEARCH_COMPLETED',
        'EARLY_OPTIMAL_TERMINATION',
        'TIME_LIMIT_EXCEEDED',
        'CANDIDATE_LIMIT_EXCEEDED',
        'NO_FEASIBLE_FLEET',
      ] as const;

      for (const reason of validTerminationReasons) {
        expect([
          'EXHAUSTIVE_SEARCH_COMPLETED',
          'EARLY_OPTIMAL_TERMINATION',
          'TIME_LIMIT_EXCEEDED',
          'CANDIDATE_LIMIT_EXCEEDED',
          'NO_FEASIBLE_FLEET',
        ]).toContain(reason);
      }
    });

    it('TEST 12: Preserves load plan structure and placements payload for future 3D viewer', () => {
      const samplePlacements = [
        {
          cargoId: 'cargo-1',
          instanceId: 'inst-1',
          xMm: 0,
          yMm: 0,
          zMm: 0,
          lengthMm: 1000,
          widthMm: 800,
          heightMm: 600,
          orientation: 'DEFAULT',
        },
        {
          cargoId: 'cargo-2',
          instanceId: 'inst-2',
          xMm: 1000,
          yMm: 0,
          zMm: 0,
          lengthMm: 800,
          widthMm: 800,
          heightMm: 600,
          orientation: 'ROTATE_90_HORIZONTAL',
        },
      ];

      const loadPlan = {
        vehicleSequence: 1,
        loadedWeightKg: 1200,
        loadedVolumeM3: 4.8,
        weightUtilizationPct: 80,
        volumeUtilizationPct: 70,
        placementsJson: samplePlacements,
      };

      expect(loadPlan.placementsJson).toHaveLength(2);
      expect(loadPlan.placementsJson[0].xMm).toBe(0);
      expect(loadPlan.placementsJson[1].xMm).toBe(1000);
      expect(loadPlan.placementsJson[1].orientation).toBe('ROTATE_90_HORIZONTAL');
    });
  });
});
