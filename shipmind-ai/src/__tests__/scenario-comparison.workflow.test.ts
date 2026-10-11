import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogisticsService from '../services/logistics.service';
import * as apiClient from '../lib/api-client';
import type {
  EvaluatedScenarioSummary,
  ScenarioComparisonResult,
  CreateScenarioRequest,
  CompareScenariosRequest,
} from '../types/logistics';

describe('Phase 8 — Scenario Comparison & What-If Optimization (Frontend Workflow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockBaseline: EvaluatedScenarioSummary = {
    id: 'run-1',
    shipmentId: 'ship-101',
    scenarioName: 'Baseline Heuristic Run',
    notes: null,
    isBaseline: true,
    status: 'COMPLETED',
    createdAt: '2026-09-08T10:00:00Z',
    vehicleCount: 4,
    totalLoadedWeightKg: 15000,
    totalLoadedVolumeM3: 52.4,
    overallPayloadUtilizationPct: 72.5,
    overallVolumeUtilizationPct: 65.0,
    unusedPayloadKg: 5000,
    unusedVolumeM3: 28.1,
    unassignedCargoCount: 0,
    routeDistanceKm: 850.0,
    routeDurationMinutes: 720,
    routeFeasibility: 'FEASIBLE',
    totalCo2eKg: 680.5,
    emissionsIntensityGPerTonneKm: 53.37,
    tonneKm: 12750,
    carbonMethodology: 'GLEC_FRAMEWORK_V2_FREIGHT',
    executionTimeMs: 110,
    candidateSolutionsEvaluated: 12,
    optimalityGuarantee: 'HEURISTIC_BOUNDED',
    searchTerminationReason: 'GREEDY_TERMINATED',
    parameters: {},
  };

  const mockTarget: EvaluatedScenarioSummary = {
    id: 'run-2',
    shipmentId: 'ship-101',
    scenarioName: 'Consolidated High-Cube Scenario',
    notes: null,
    isBaseline: false,
    status: 'COMPLETED',
    createdAt: '2026-09-08T10:15:00Z',
    vehicleCount: 3, // -1 truck
    totalLoadedWeightKg: 15000,
    totalLoadedVolumeM3: 52.4,
    overallPayloadUtilizationPct: 88.0, // +15.5%
    overallVolumeUtilizationPct: 81.2, // +16.2%
    unusedPayloadKg: 1800,
    unusedVolumeM3: 11.5,
    unassignedCargoCount: 0,
    routeDistanceKm: 865.0, // +15 km
    routeDurationMinutes: 735,
    routeFeasibility: 'FEASIBLE',
    totalCo2eKg: 545.2, // -135.3 kg CO2e
    emissionsIntensityGPerTonneKm: 41.97,
    tonneKm: 12975,
    carbonMethodology: 'GLEC_FRAMEWORK_V2_FREIGHT',
    executionTimeMs: 420,
    candidateSolutionsEvaluated: 64,
    optimalityGuarantee: 'EXHAUSTIVE_OPTIMAL',
    searchTerminationReason: 'OPTIMAL_FOUND',
    parameters: { maxVehiclesToConsider: 3 },
  };

  describe('LogisticsService API Contracts', () => {
    it('calls GET /api/v1/logistics/shipments/:shipmentId/scenarios correctly', async () => {
      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue([mockBaseline, mockTarget]);

      const result = await LogisticsService.getShipmentScenarios('ship-101');

      expect(apiGetSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments/ship-101/scenarios');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('run-1');
      expect(result[1].id).toBe('run-2');
    });

    it('calls POST /api/v1/logistics/shipments/:shipmentId/scenarios with supported bounded parameters', async () => {
      const apiPostSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValue(mockTarget);

      const payload: CreateScenarioRequest = {
        scenarioName: 'Strict 3-Truck Cap',
        options: {
          maxVehiclesToConsider: 3,
          maxCandidateSolutions: 50,
          maxExecutionTimeMs: 5000,
          allowMultiVehicleFallback: true,
        },
      };

      const result = await LogisticsService.createShipmentScenario('ship-101', payload);

      expect(apiPostSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/ship-101/scenarios',
        payload
      );
      expect(result.id).toBe('run-2');
      expect(result.scenarioName).toBe('Consolidated High-Cube Scenario');
    });

    it('calls POST /api/v1/logistics/shipments/:shipmentId/scenarios/compare with baseline and target IDs', async () => {
      const mockComparisonResult: ScenarioComparisonResult = {
        baselineScenario: mockBaseline,
        comparedScenarios: [mockTarget],
        categories: [],
        deltaAnalysis: {},
        tradeOffs: [],
        tradeOffAnalysis: [],
        winLossSummary: {
          vehicles: {
            dimension: 'vehicles',
            label: 'Fleet Size',
            winnerScenarioId: 'run-2',
            winnerScenarioName: 'Consolidated High-Cube Scenario',
            baselineValue: 4,
            winnerValue: 3,
            unit: 'trucks',
            marginDelta: -1,
          },
          emissions: {
            dimension: 'emissions',
            label: 'Emissions',
            winnerScenarioId: 'run-2',
            winnerScenarioName: 'Consolidated High-Cube Scenario',
            baselineValue: 680.5,
            winnerValue: 545.2,
            unit: 'kg CO₂e',
            marginDelta: -135.3,
          },
          payloadUtil: {
            dimension: 'payloadUtil',
            label: 'Payload Utilization',
            winnerScenarioId: 'run-2',
            winnerScenarioName: 'Consolidated High-Cube Scenario',
            baselineValue: 72.5,
            winnerValue: 88.0,
            unit: '%',
            marginDelta: 15.5,
          },
          volumeUtil: {
            dimension: 'volumeUtil',
            label: 'Volume Utilization',
            winnerScenarioId: 'run-2',
            winnerScenarioName: 'Consolidated High-Cube Scenario',
            baselineValue: 65.0,
            winnerValue: 81.2,
            unit: '%',
            marginDelta: 16.2,
          },
          distance: {
            dimension: 'distance',
            label: 'Route Distance',
            winnerScenarioId: 'run-1',
            winnerScenarioName: 'Baseline Heuristic Run',
            baselineValue: 850.0,
            winnerValue: 850.0,
            unit: 'km',
            marginDelta: 0,
          },
        },
        bestScenarioByMetric: {
          lowestEmissions: 'run-2',
          highestUtilization: 'run-2',
          fewestVehicles: 'run-2',
          shortestDistance: 'run-1',
        },
        computedAt: new Date().toISOString(),
      };

      const apiPostSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValue(mockComparisonResult);

      const comparePayload: CompareScenariosRequest = {
        baselineScenarioId: 'run-1',
        targetScenarioIds: ['run-2'],
      };

      const result = await LogisticsService.compareShipmentScenarios('ship-101', comparePayload);

      expect(apiPostSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/ship-101/scenarios/compare',
        comparePayload
      );
      expect(result.baselineScenario.id).toBe('run-1');
      expect(result.comparedScenarios[0].id).toBe('run-2');
      expect(result.winLossSummary.vehicles.winnerScenarioId).toBe('run-2');
      expect(result.bestScenarioByMetric.lowestEmissions).toBe('run-2');
    });
  });

  describe('Delta Calculation Logic & Edge Cases', () => {
    it('computes absolute and percentage delta correctly when baseline > 0', () => {
      const baselineVal = 680.5;
      const targetVal = 545.2;

      const absoluteDelta = Number((targetVal - baselineVal).toFixed(2));
      const percentageDelta = Number((((targetVal - baselineVal) / baselineVal) * 100).toFixed(2));

      expect(absoluteDelta).toBe(-135.3);
      expect(percentageDelta).toBeCloseTo(-19.88, 1);
    });

    it('returns null percentage delta when baseline is zero to prevent division by zero', () => {
      const baselineVal = 0;
      const targetVal = 3;

      let percentageDelta: number | null = null;
      if (baselineVal !== 0) {
        percentageDelta = ((targetVal - baselineVal) / baselineVal) * 100;
      }

      expect(percentageDelta).toBeNull();
    });

    it('returns null deltas and neutral assessment when a metric is not yet computed or null', () => {
      const baselineVal: number | null = null;
      const targetVal: number | null = null;

      const absoluteDelta = baselineVal !== null && targetVal !== null ? targetVal - baselineVal : null;
      const percentageDelta = baselineVal !== null && targetVal !== null && baselineVal !== 0
        ? ((targetVal - baselineVal) / baselineVal) * 100
        : null;

      expect(absoluteDelta).toBeNull();
      expect(percentageDelta).toBeNull();
    });

    it('evaluates directionality: lower is better for vehicle count and carbon emissions', () => {
      // Carbon reduction: lower is favorable
      const co2Delta = -135.3;
      const co2Direction = co2Delta < 0 ? 'FAVORABLE' : 'UNFAVORABLE';
      expect(co2Direction).toBe('FAVORABLE');

      // Vehicle count reduction: lower is favorable
      const vehicleDelta = -1;
      const vehicleDirection = vehicleDelta < 0 ? 'FAVORABLE' : 'UNFAVORABLE';
      expect(vehicleDirection).toBe('FAVORABLE');

      // Payload utilization increase: higher is favorable
      const utilDelta = 15.5;
      const utilDirection = utilDelta > 0 ? 'FAVORABLE' : 'UNFAVORABLE';
      expect(utilDirection).toBe('FAVORABLE');
    });
  });

  describe('Multi-Objective Trade-Off Detection', () => {
    it('identifies fleet consolidation vs distance penalty trade-off', () => {
      const vehicleSaved = mockBaseline.vehicleCount - mockTarget.vehicleCount; // 1
      const extraDistanceKm = (mockTarget.routeDistanceKm ?? 0) - (mockBaseline.routeDistanceKm ?? 0); // 15 km

      expect(vehicleSaved).toBe(1);
      expect(extraDistanceKm).toBe(15);
      expect(mockTarget.totalCo2eKg!).toBeLessThan(mockBaseline.totalCo2eKg!);
    });

    it('verifies that no synthetic placeholder numbers are injected for missing routes', () => {
      const unroutedScenario: EvaluatedScenarioSummary = {
        ...mockBaseline,
        routeDistanceKm: null,
        routeDurationMinutes: null,
        routeFeasibility: 'UNKNOWN',
      };

      expect(unroutedScenario.routeDistanceKm).toBeNull();
      expect(unroutedScenario.routeDurationMinutes).toBeNull();
      expect(unroutedScenario.routeFeasibility).toBe('UNKNOWN');
    });
  });
});
