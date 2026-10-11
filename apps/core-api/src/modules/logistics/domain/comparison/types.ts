export type EvaluationDirection = 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL';

export type ComparisonCategory =
  | 'FLEET_CAPACITY'
  | 'EFFICIENCY_UTILIZATION'
  | 'ROUTING_GEOSPATIAL'
  | 'ENVIRONMENTAL'
  | 'COMPUTATIONAL_QUALITY';

export interface MetricComparisonItem {
  key: string;
  label: string;
  category: ComparisonCategory;
  unit: string;
  baselineValue: number | string | null;
  targetValue: number | string | null;
  absoluteDelta: number | null;
  percentageDelta: number | null; // ((target - baseline) / baseline) * 100. null if baseline is 0 or unavailable
  direction: EvaluationDirection;
  higherIsBetter: boolean | null; // null if neutral/informational
  description?: string;
}

export interface ScenarioMetricCategoryGroup {
  category: ComparisonCategory;
  title: string;
  description: string;
  metrics: MetricComparisonItem[];
}

export interface ScenarioTradeOff {
  summary: string;
  category: ComparisonCategory;
  advantage: string;
  compromise: string;
}

export interface EvaluatedScenarioSummary {
  id: string;
  shipmentId: string;
  scenarioName: string;
  notes?: string | null;
  isBaseline: boolean;
  status: string;
  createdAt: string;

  // Operational metrics
  vehicleCount: number;
  totalLoadedWeightKg: number;
  totalLoadedVolumeM3: number;
  overallPayloadUtilizationPct: number;
  overallVolumeUtilizationPct: number;
  unusedPayloadKg: number;
  unusedVolumeM3: number;
  unassignedCargoCount: number;

  // Routing & Geospatial
  routeDistanceKm: number | null;
  routeDurationMinutes: number | null;
  routeFeasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';

  // Environmental (Authoritative Carbon Engine)
  totalCo2eKg: number | null;
  emissionsIntensityGPerTonneKm: number | null;
  tonneKm: number | null;
  carbonMethodology: string;

  // Search Quality & Diagnostics
  executionTimeMs: number;
  candidateSolutionsEvaluated: number;
  optimalityGuarantee: string;
  searchTerminationReason: string;

  // Applied What-If parameters
  parameters: Record<string, unknown>;
}

export interface WinLossDimension {
  dimension: 'vehicles' | 'emissions' | 'payloadUtil' | 'volumeUtil' | 'distance';
  label: string;
  winnerScenarioId: string | null;
  winnerScenarioName: string | null;
  baselineValue: number | null;
  winnerValue: number | null;
  unit: string;
  marginDelta: number | null;
}

export interface BestScenarioByMetric {
  lowestEmissions: string | null;
  highestUtilization: string | null;
  fewestVehicles: string | null;
  shortestDistance: string | null;
}

export interface ScenarioComparisonResult {
  baselineScenario: EvaluatedScenarioSummary;
  comparedScenarios: EvaluatedScenarioSummary[];
  categories: ScenarioMetricCategoryGroup[];
  deltaAnalysis: Record<string, ScenarioMetricCategoryGroup[]>;
  tradeOffs: ScenarioTradeOff[];
  tradeOffAnalysis: ScenarioTradeOff[];
  winLossSummary: Record<string, WinLossDimension>;
  bestScenarioByMetric: BestScenarioByMetric;
  computedAt: string;
}
