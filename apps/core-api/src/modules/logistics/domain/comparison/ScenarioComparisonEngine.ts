import {
  BestScenarioByMetric,
  ComparisonCategory,
  EvaluatedScenarioSummary,
  EvaluationDirection,
  MetricComparisonItem,
  ScenarioComparisonResult,
  ScenarioMetricCategoryGroup,
  ScenarioTradeOff,
  WinLossDimension,
} from './types';

export class ScenarioComparisonEngine {
  /**
   * Compares a baseline scenario against one or more target scenarios.
   */
  public static compare(
    baseline: EvaluatedScenarioSummary,
    candidates: EvaluatedScenarioSummary[]
  ): ScenarioComparisonResult {
    if (!baseline) {
      throw new Error('Baseline scenario is required for comparison');
    }

    const firstCandidate = candidates[0] || baseline;
    const categories = this.buildMetricCategories(baseline, firstCandidate);

    const deltaAnalysis: Record<string, ScenarioMetricCategoryGroup[]> = {};
    for (const cand of candidates) {
      deltaAnalysis[cand.id] = this.buildMetricCategories(baseline, cand);
    }
    if (!deltaAnalysis[baseline.id]) {
      deltaAnalysis[baseline.id] = this.buildMetricCategories(baseline, baseline);
    }

    const tradeOffs = this.analyzeTradeOffs(baseline, candidates);
    const allScenarios = [baseline, ...candidates.filter((c) => c.id !== baseline.id)];
    const { winLossSummary, bestScenarioByMetric } = this.computeWinLossSummary(baseline, allScenarios);

    return {
      baselineScenario: baseline,
      comparedScenarios: candidates,
      categories,
      deltaAnalysis,
      tradeOffs,
      tradeOffAnalysis: tradeOffs,
      winLossSummary,
      bestScenarioByMetric,
      computedAt: new Date().toISOString(),
    };
  }

  private static buildMetricCategories(
    baseline: EvaluatedScenarioSummary,
    target: EvaluatedScenarioSummary
  ): ScenarioMetricCategoryGroup[] {
    return [
      {
        category: 'FLEET_CAPACITY',
        title: 'Fleet & Capacity',
        description: 'Vehicles deployed, loaded weight, volume, and unallocated cargo packages.',
        metrics: [
          this.buildNumericMetric({
            key: 'vehicleCount',
            label: 'Allocated Vehicles',
            category: 'FLEET_CAPACITY',
            unit: 'trucks',
            baselineValue: baseline.vehicleCount,
            targetValue: target.vehicleCount,
            higherIsBetter: false,
            description: 'Total number of transport vehicles selected in the allocation plan.',
          }),
          this.buildNumericMetric({
            key: 'totalLoadedWeightKg',
            label: 'Loaded Weight',
            category: 'FLEET_CAPACITY',
            unit: 'kg',
            baselineValue: baseline.totalLoadedWeightKg,
            targetValue: target.totalLoadedWeightKg,
            higherIsBetter: null,
            description: 'Aggregate mass of all placed cargo across the fleet.',
          }),
          this.buildNumericMetric({
            key: 'totalLoadedVolumeM3',
            label: 'Loaded Volume',
            category: 'FLEET_CAPACITY',
            unit: 'm³',
            baselineValue: baseline.totalLoadedVolumeM3,
            targetValue: target.totalLoadedVolumeM3,
            higherIsBetter: null,
            description: 'Aggregate physical cube occupied by packed cargo.',
          }),
          this.buildNumericMetric({
            key: 'unusedPayloadKg',
            label: 'Unused Payload Headroom',
            category: 'FLEET_CAPACITY',
            unit: 'kg',
            baselineValue: baseline.unusedPayloadKg,
            targetValue: target.unusedPayloadKg,
            higherIsBetter: false,
            description: 'Remaining weight carrying capacity across the assigned vehicles.',
          }),
          this.buildNumericMetric({
            key: 'unusedVolumeM3',
            label: 'Unused Volume Headroom',
            category: 'FLEET_CAPACITY',
            unit: 'm³',
            baselineValue: baseline.unusedVolumeM3,
            targetValue: target.unusedVolumeM3,
            higherIsBetter: false,
            description: 'Remaining cubic space across the assigned vehicles.',
          }),
          this.buildNumericMetric({
            key: 'unassignedCargoCount',
            label: 'Unplaced Cargo Items',
            category: 'FLEET_CAPACITY',
            unit: 'items',
            baselineValue: baseline.unassignedCargoCount,
            targetValue: target.unassignedCargoCount,
            higherIsBetter: false,
            description: 'Shipment items that could not fit within the allocated fleet.',
          }),
        ],
      },
      {
        category: 'EFFICIENCY_UTILIZATION',
        title: 'Efficiency & Utilization',
        description: 'Average space and mass utilization rates across active vehicles.',
        metrics: [
          this.buildNumericMetric({
            key: 'overallPayloadUtilizationPct',
            label: 'Payload Utilization',
            category: 'EFFICIENCY_UTILIZATION',
            unit: '%',
            baselineValue: baseline.overallPayloadUtilizationPct,
            targetValue: target.overallPayloadUtilizationPct,
            higherIsBetter: true,
            description: 'Mean percentage of vehicle mass limit utilized by cargo.',
          }),
          this.buildNumericMetric({
            key: 'overallVolumeUtilizationPct',
            label: 'Volume Utilization',
            category: 'EFFICIENCY_UTILIZATION',
            unit: '%',
            baselineValue: baseline.overallVolumeUtilizationPct,
            targetValue: target.overallVolumeUtilizationPct,
            higherIsBetter: true,
            description: 'Mean percentage of cargo bay volume occupied by cargo.',
          }),
        ],
      },
      {
        category: 'ROUTING_GEOSPATIAL',
        title: 'Routing & Geospatial',
        description: 'Road transit distance, driving duration, and route feasibility.',
        metrics: [
          this.buildNumericMetric({
            key: 'routeDistanceKm',
            label: 'Route Distance',
            category: 'ROUTING_GEOSPATIAL',
            unit: 'km',
            baselineValue: baseline.routeDistanceKm,
            targetValue: target.routeDistanceKm,
            higherIsBetter: false,
            description: 'Cumulative point-to-point road transit distance.',
          }),
          this.buildNumericMetric({
            key: 'routeDurationMinutes',
            label: 'Transit Duration',
            category: 'ROUTING_GEOSPATIAL',
            unit: 'mins',
            baselineValue: baseline.routeDurationMinutes,
            targetValue: target.routeDurationMinutes,
            higherIsBetter: false,
            description: 'Estimated total transit drive time under typical conditions.',
          }),
          this.buildStringMetric({
            key: 'routeFeasibility',
            label: 'Route Feasibility',
            category: 'ROUTING_GEOSPATIAL',
            baselineValue: baseline.routeFeasibility,
            targetValue: target.routeFeasibility,
            description: 'Whether waypoints and transit restrictions are verified.',
          }),
        ],
      },
      {
        category: 'ENVIRONMENTAL',
        title: 'Environmental (Carbon Engine)',
        description: 'Authoritative Scope 3 GLEC freight emissions and carbon intensity.',
        metrics: [
          this.buildNumericMetric({
            key: 'totalCo2eKg',
            label: 'Total CO₂e Emissions',
            category: 'ENVIRONMENTAL',
            unit: 'kg CO₂e',
            baselineValue: baseline.totalCo2eKg,
            targetValue: target.totalCo2eKg,
            higherIsBetter: false,
            description: 'Total well-to-wheel greenhouse gas footprint calculated by Carbon Engine.',
          }),
          this.buildNumericMetric({
            key: 'emissionsIntensityGPerTonneKm',
            label: 'Emissions Intensity',
            category: 'ENVIRONMENTAL',
            unit: 'g/t-km',
            baselineValue: baseline.emissionsIntensityGPerTonneKm,
            targetValue: target.emissionsIntensityGPerTonneKm,
            higherIsBetter: false,
            description: 'Grams of CO₂e emitted per tonne of cargo moved one kilometer.',
          }),
          this.buildNumericMetric({
            key: 'tonneKm',
            label: 'Transport Activity',
            category: 'ENVIRONMENTAL',
            unit: 't-km',
            baselineValue: baseline.tonneKm,
            targetValue: target.tonneKm,
            higherIsBetter: null,
            description: 'Total freight work performed (tonnes payload × distance km).',
          }),
        ],
      },
      {
        category: 'COMPUTATIONAL_QUALITY',
        title: 'Computational & Search Quality',
        description: 'Algorithmic proof, search termination rationale, and compute time.',
        metrics: [
          this.buildNumericMetric({
            key: 'executionTimeMs',
            label: 'Search Duration',
            category: 'COMPUTATIONAL_QUALITY',
            unit: 'ms',
            baselineValue: baseline.executionTimeMs,
            targetValue: target.executionTimeMs,
            higherIsBetter: false,
            description: 'Compute time spent evaluating permutations within bounds.',
          }),
          this.buildNumericMetric({
            key: 'candidateSolutionsEvaluated',
            label: 'Candidate Solutions Evaluated',
            category: 'COMPUTATIONAL_QUALITY',
            unit: 'candidates',
            baselineValue: baseline.candidateSolutionsEvaluated,
            targetValue: target.candidateSolutionsEvaluated,
            higherIsBetter: null,
            description: 'Number of distinct fleet combinations simulated.',
          }),
          this.buildStringMetric({
            key: 'optimalityGuarantee',
            label: 'Optimality Guarantee',
            category: 'COMPUTATIONAL_QUALITY',
            baselineValue: baseline.optimalityGuarantee,
            targetValue: target.optimalityGuarantee,
            description: 'Deterministic quality disclosure of the heuristic search.',
          }),
          this.buildStringMetric({
            key: 'searchTerminationReason',
            label: 'Termination Reason',
            category: 'COMPUTATIONAL_QUALITY',
            baselineValue: baseline.searchTerminationReason,
            targetValue: target.searchTerminationReason,
            description: 'Condition that concluded the branch-and-bound exploration.',
          }),
        ],
      },
    ];
  }

  private static buildNumericMetric(opts: {
    key: string;
    label: string;
    category: ComparisonCategory;
    unit: string;
    baselineValue: number | null;
    targetValue: number | null;
    higherIsBetter: boolean | null;
    description?: string;
  }): MetricComparisonItem {
    const { key, label, category, unit, baselineValue, targetValue, higherIsBetter, description } = opts;

    if (baselineValue === null || targetValue === null || isNaN(baselineValue) || isNaN(targetValue)) {
      return {
        key,
        label,
        category,
        unit,
        baselineValue,
        targetValue,
        absoluteDelta: null,
        percentageDelta: null,
        direction: 'NEUTRAL',
        higherIsBetter,
        description,
      };
    }

    const absoluteDelta = Number((targetValue - baselineValue).toFixed(2));

    let percentageDelta: number | null = null;
    if (baselineValue !== 0) {
      percentageDelta = Number((((targetValue - baselineValue) / Math.abs(baselineValue)) * 100).toFixed(2));
    }

    let direction: EvaluationDirection = 'NEUTRAL';
    if (higherIsBetter !== null && absoluteDelta !== 0) {
      if (higherIsBetter) {
        direction = absoluteDelta > 0 ? 'FAVORABLE' : 'UNFAVORABLE';
      } else {
        direction = absoluteDelta < 0 ? 'FAVORABLE' : 'UNFAVORABLE';
      }
    }

    return {
      key,
      label,
      category,
      unit,
      baselineValue,
      targetValue,
      absoluteDelta,
      percentageDelta,
      direction,
      higherIsBetter,
      description,
    };
  }

  private static buildStringMetric(opts: {
    key: string;
    label: string;
    category: ComparisonCategory;
    baselineValue: string | null;
    targetValue: string | null;
    description?: string;
  }): MetricComparisonItem {
    const { key, label, category, baselineValue, targetValue, description } = opts;
    return {
      key,
      label,
      category,
      unit: '',
      baselineValue,
      targetValue,
      absoluteDelta: null,
      percentageDelta: null,
      direction: 'NEUTRAL',
      higherIsBetter: null,
      description,
    };
  }

  private static analyzeTradeOffs(
    baseline: EvaluatedScenarioSummary,
    candidates: EvaluatedScenarioSummary[]
  ): ScenarioTradeOff[] {
    const tradeOffs: ScenarioTradeOff[] = [];

    for (const target of candidates) {
      if (target.id === baseline.id) continue;

      // 1. Vehicle reduction vs Unplaced Cargo
      if (target.vehicleCount < baseline.vehicleCount) {
        const vehicleDelta = baseline.vehicleCount - target.vehicleCount;
        if (target.unassignedCargoCount > baseline.unassignedCargoCount) {
          tradeOffs.push({
            summary: `Fleet reduction vs Cargo Spillover: "${target.scenarioName}"`,
            category: 'FLEET_CAPACITY',
            advantage: `Requires ${vehicleDelta} fewer vehicle${vehicleDelta > 1 ? 's' : ''}.`,
            compromise: `Leaves ${target.unassignedCargoCount - baseline.unassignedCargoCount} additional cargo item(s) unplaced.`,
          });
        } else {
          tradeOffs.push({
            summary: `Dominant Fleet Reduction: "${target.scenarioName}"`,
            category: 'FLEET_CAPACITY',
            advantage: `Eliminates ${vehicleDelta} vehicle${vehicleDelta > 1 ? 's' : ''} while maintaining 100% cargo placement.`,
            compromise: 'Higher average payload and volume density per active vehicle.',
          });
        }
      }

      // 2. Carbon reduction vs Transit Distance / Duration
      if (
        target.totalCo2eKg !== null &&
        baseline.totalCo2eKg !== null &&
        target.totalCo2eKg < baseline.totalCo2eKg
      ) {
        const co2Delta = (baseline.totalCo2eKg - target.totalCo2eKg).toFixed(1);
        if (
          target.routeDistanceKm !== null &&
          baseline.routeDistanceKm !== null &&
          target.routeDistanceKm > baseline.routeDistanceKm
        ) {
          tradeOffs.push({
            summary: `Emissions Savings with Longer Routing: "${target.scenarioName}"`,
            category: 'ENVIRONMENTAL',
            advantage: `Reduces total emissions by ${co2Delta} kg CO₂e.`,
            compromise: `Incurs ${(target.routeDistanceKm - baseline.routeDistanceKm).toFixed(1)} km additional transit distance.`,
          });
        } else {
          tradeOffs.push({
            summary: `Direct Carbon Abatement: "${target.scenarioName}"`,
            category: 'ENVIRONMENTAL',
            advantage: `Saves ${co2Delta} kg CO₂e (${(((baseline.totalCo2eKg - target.totalCo2eKg) / baseline.totalCo2eKg) * 100).toFixed(1)}% reduction).`,
            compromise: 'None observed on routing dimensions.',
          });
        }
      }

      // 3. Payload utilization vs Volume utilization
      if (
        target.overallPayloadUtilizationPct > baseline.overallPayloadUtilizationPct &&
        target.overallVolumeUtilizationPct < baseline.overallVolumeUtilizationPct
      ) {
        tradeOffs.push({
          summary: `Mass vs Cubic Prioritization: "${target.scenarioName}"`,
          category: 'EFFICIENCY_UTILIZATION',
          advantage: `Increases payload utilization by ${(target.overallPayloadUtilizationPct - baseline.overallPayloadUtilizationPct).toFixed(1)}%.`,
          compromise: `Decreases volume utilization by ${(baseline.overallVolumeUtilizationPct - target.overallVolumeUtilizationPct).toFixed(1)}%.`,
        });
      }
    }

    return tradeOffs;
  }

  private static computeWinLossSummary(
    baseline: EvaluatedScenarioSummary,
    allScenarios: EvaluatedScenarioSummary[]
  ): { winLossSummary: Record<string, WinLossDimension>; bestScenarioByMetric: BestScenarioByMetric } {
    let minVehiclesSc = baseline;
    for (const sc of allScenarios) {
      if (sc.vehicleCount < minVehiclesSc.vehicleCount) {
        minVehiclesSc = sc;
      }
    }

    let minEmissionsSc: EvaluatedScenarioSummary | null = null;
    for (const sc of allScenarios) {
      if (sc.totalCo2eKg !== null) {
        if (!minEmissionsSc || sc.totalCo2eKg < (minEmissionsSc.totalCo2eKg ?? Infinity)) {
          minEmissionsSc = sc;
        }
      }
    }

    let maxPayloadSc = baseline;
    for (const sc of allScenarios) {
      if (sc.overallPayloadUtilizationPct > maxPayloadSc.overallPayloadUtilizationPct) {
        maxPayloadSc = sc;
      }
    }

    let maxVolumeSc = baseline;
    for (const sc of allScenarios) {
      if (sc.overallVolumeUtilizationPct > maxVolumeSc.overallVolumeUtilizationPct) {
        maxVolumeSc = sc;
      }
    }

    let minDistanceSc: EvaluatedScenarioSummary | null = null;
    for (const sc of allScenarios) {
      if (sc.routeDistanceKm !== null) {
        if (!minDistanceSc || sc.routeDistanceKm < (minDistanceSc.routeDistanceKm ?? Infinity)) {
          minDistanceSc = sc;
        }
      }
    }

    const winLossSummary: Record<string, WinLossDimension> = {
      vehicles: {
        dimension: 'vehicles',
        label: 'Fleet Size',
        winnerScenarioId: minVehiclesSc.id,
        winnerScenarioName: minVehiclesSc.scenarioName,
        baselineValue: baseline.vehicleCount,
        winnerValue: minVehiclesSc.vehicleCount,
        unit: 'trucks',
        marginDelta: Number((minVehiclesSc.vehicleCount - baseline.vehicleCount).toFixed(2)),
      },
      emissions: {
        dimension: 'emissions',
        label: 'Emissions',
        winnerScenarioId: minEmissionsSc?.id ?? null,
        winnerScenarioName: minEmissionsSc?.scenarioName ?? null,
        baselineValue: baseline.totalCo2eKg,
        winnerValue: minEmissionsSc?.totalCo2eKg ?? null,
        unit: 'kg CO₂e',
        marginDelta:
          minEmissionsSc && baseline.totalCo2eKg !== null && minEmissionsSc.totalCo2eKg !== null
            ? Number((minEmissionsSc.totalCo2eKg - baseline.totalCo2eKg).toFixed(2))
            : null,
      },
      payloadUtil: {
        dimension: 'payloadUtil',
        label: 'Payload Utilization',
        winnerScenarioId: maxPayloadSc.id,
        winnerScenarioName: maxPayloadSc.scenarioName,
        baselineValue: baseline.overallPayloadUtilizationPct,
        winnerValue: maxPayloadSc.overallPayloadUtilizationPct,
        unit: '%',
        marginDelta: Number((maxPayloadSc.overallPayloadUtilizationPct - baseline.overallPayloadUtilizationPct).toFixed(2)),
      },
      volumeUtil: {
        dimension: 'volumeUtil',
        label: 'Volume Utilization',
        winnerScenarioId: maxVolumeSc.id,
        winnerScenarioName: maxVolumeSc.scenarioName,
        baselineValue: baseline.overallVolumeUtilizationPct,
        winnerValue: maxVolumeSc.overallVolumeUtilizationPct,
        unit: '%',
        marginDelta: Number((maxVolumeSc.overallVolumeUtilizationPct - baseline.overallVolumeUtilizationPct).toFixed(2)),
      },
      distance: {
        dimension: 'distance',
        label: 'Route Distance',
        winnerScenarioId: minDistanceSc?.id ?? null,
        winnerScenarioName: minDistanceSc?.scenarioName ?? null,
        baselineValue: baseline.routeDistanceKm,
        winnerValue: minDistanceSc?.routeDistanceKm ?? null,
        unit: 'km',
        marginDelta:
          minDistanceSc && baseline.routeDistanceKm !== null && minDistanceSc.routeDistanceKm !== null
            ? Number((minDistanceSc.routeDistanceKm - baseline.routeDistanceKm).toFixed(2))
            : null,
      },
    };

    const bestScenarioByMetric: BestScenarioByMetric = {
      lowestEmissions: minEmissionsSc?.id ?? null,
      highestUtilization: maxPayloadSc.id,
      fewestVehicles: minVehiclesSc.id,
      shortestDistance: minDistanceSc?.id ?? null,
    };

    return { winLossSummary, bestScenarioByMetric };
  }
}
