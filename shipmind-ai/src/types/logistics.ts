/**
 * Logistics TypeScript Domain & DTO Types for CarbonIQ Web Frontend
 */

export type ShipmentStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'OPTIMIZED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type StopType = 'PICKUP' | 'DROPOFF' | 'TRANSIT_WAYPOINT';

export type DimensionUnit = 'MM' | 'CM' | 'M' | 'INCH' | 'FT';

export type WeightUnit = 'KG' | 'TONNE' | 'POUND' | 'GRAM';

export interface GeocodeResult {
  displayName: string;
  city?: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  confidence: number;
  provider?: string;
}

export interface ShipmentStop {
  id?: string;
  shipmentId?: string;
  stopType: StopType;
  sequenceOrder?: number;
  stopSequence?: number;
  facilityName?: string | null;
  locationName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  specialInstructions?: string | null;
  siteId?: string | null;
}

export interface CargoItem {
  id: string;
  shipmentId: string;
  description: string;
  sku?: string | null;
  packageType?: string | null;
  quantity: number;
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  unitWeight: number;
  weightUnit: WeightUnit;
  totalWeightKg: number;
  totalVolumeM3: number;
  isStackable: boolean;
  maxStackWeight?: number | null;
  maxStackTiers?: number | null;
  isFragile: boolean;
  allowRotationHorizontal: boolean;
  allowRotationVertical: boolean;
  allowedOrientations: string[];
  loadingPriority?: number | null;
  unloadingSequence?: number | null;
  handlingInstructions?: string | null;
  hazardousMaterialClass?: string | null;
  temperatureControlRequired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shipment {
  id: string;
  organizationId: string;
  shipmentNumber: string;
  referenceNumber?: string | null;
  description?: string | null;
  status: ShipmentStatus;
  plannedPickupDate?: string | null;
  plannedDeliveryDate?: string | null;
  actualPickupDate?: string | null;
  actualDeliveryDate?: string | null;
  totalDistanceKm?: number | null;
  totalDurationHours?: number | null;
  totalWeightKg?: number | null;
  totalVolumeM3?: number | null;
  totalPalletCount?: number | null;
  metadata?: Record<string, any> | null;
  stops?: ShipmentStop[];
  cargoItems?: CargoItem[];
  cargoItemsCount?: number;
  optimizationRuns?: Array<{
    id: string;
    scenarioName?: string;
    status: string;
    baselineTruckCount: number;
    optimizedTruckCount: number;
    totalLoadedWeightKg: number;
    totalLoadedVolumeM3: number;
    overallVolumeUtilizationPct: number;
    overallWeightUtilizationPct: number;
    createdAt: string;
  }>;
  loadPlans?: Array<{
    id: string;
    vehicleSequence: number;
    loadedWeightKg: number;
    loadedVolumeM3: number;
    weightUtilizationPct: number;
    volumeUtilizationPct: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateShipmentInput {
  shipmentNumber?: string;
  referenceNumber?: string;
  description?: string;
  plannedPickupDate?: string;
  plannedDeliveryDate?: string;
  metadata?: Record<string, any>;
  stops?: ShipmentStop[];
}

export interface UpdateShipmentInput {
  status?: ShipmentStatus;
  referenceNumber?: string;
  description?: string;
  plannedPickupDate?: string;
  plannedDeliveryDate?: string;
  metadata?: Record<string, any>;
}

export interface CreateCargoItemInput {
  description: string;
  sku?: string;
  packageType?: string;
  quantity?: number;
  length: number;
  width: number;
  height: number;
  dimensionUnit?: DimensionUnit;
  unitWeight: number;
  weightUnit?: WeightUnit;
  isStackable?: boolean;
  maxStackWeight?: number;
  maxStackTiers?: number;
  isFragile?: boolean;
  allowRotationHorizontal?: boolean;
  allowRotationVertical?: boolean;
  allowedOrientations?: string[];
  loadingPriority?: number;
  unloadingSequence?: number;
  handlingInstructions?: string;
}

export interface UpdateCargoItemInput extends Partial<CreateCargoItemInput> {}

// =========================================================================
// Optimization Types
// =========================================================================

export interface FleetOptimizationOptions {
  maxVehiclesToConsider?: number;
  maxCandidateSolutions?: number;
  maxExecutionTimeMs?: number;
  allowMultiVehicleFallback?: boolean;
}

export interface OptimizeShipmentRequest {
  scenarioName?: string;
  vehicleIds?: string[];
  vehicleTypeIds?: string[];
  options?: FleetOptimizationOptions;
  persistOptimizationRun?: boolean;
}

export interface FleetVehicleCandidate {
  candidateId: string;
  vehicleId?: string;
  vehicleTypeId: string;
  registrationNumber?: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  volumeMm3: number;
  maxPayloadGrams: number;
  status?: string;
  isAvailable: boolean;
  verificationStatus?: string;
  isPackingCompatible: boolean;
}

export interface PhysicalCargoInstance {
  instanceId: string;
  cargoId: string;
  description: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightGrams: number;
  volumeMm3: number;
  isStackable: boolean;
  isFragile: boolean;
  allowRotationHorizontal: boolean;
  allowRotationVertical: boolean;
}

export interface VehicleCargoAssignment {
  vehicle: FleetVehicleCandidate;
  vehicleSequence: number;
  assignedInstances: PhysicalCargoInstance[];
  packingResult: {
    success: boolean;
    placedCount: number;
    unplacedCount: number;
    placements: Array<{
      cargoId: string;
      instanceId: string;
      xMm: number;
      yMm: number;
      zMm: number;
      lengthMm: number;
      widthMm: number;
      heightMm: number;
      orientation: string;
    }>;
  };
  assignedCargoWeightGrams: number;
  payloadCapacityGrams: number;
  payloadUtilizationPct: number;
  unusedPayloadGrams: number;
  assignedCargoVolumeMm3: number;
  cargoSpaceVolumeMm3: number;
  volumeUtilizationPct: number;
  unusedVolumeMm3: number;
}

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

export interface FleetAllocationResult {
  success: boolean;
  algorithmName: string;
  algorithmVersion: string;
  executionDurationMs: number;
  vehicleAssignments: VehicleCargoAssignment[];
  selectedVehicleIds: string[];
  unallocatedCargo: Array<{
    instanceId: string;
    cargoId: string;
    description?: string;
    weightGrams: number;
    volumeMm3: number;
    reason: string;
  }>;
  violations: Array<{
    code: string;
    message: string;
    candidateId?: string;
    vehicleId?: string;
    cargoId?: string;
  }>;
  metrics: FleetAllocationObjectiveMetrics;
}

export interface FleetOptimizationImprovement {
  vehiclesSaved: number;
  payloadUtilizationDeltaPct: number;
  volumeUtilizationDeltaPct: number;
  unusedPayloadReductionGrams: number;
  unusedVolumeReductionMm3: number;
}

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

export interface FleetOptimizationResult {
  success: boolean;
  algorithmName: string;
  algorithmVersion: string;
  optimalityGuarantee: 'BOUNDED_SEARCH_ONLY' | 'PROVABLY_OPTIMAL_WITHIN_BOUNDS';
  baseline: FleetAllocationResult;
  bestSolution: FleetAllocationResult | null;
  improvement: FleetOptimizationImprovement;
  searchStatistics: FleetOptimizationSearchStatistics;
  optimizationRunId?: string;
  metadata?: Record<string, any>;
}

export interface VehicleDimensionsSnapshot {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  volumeMm3?: number;
  maxPayloadGrams?: number;
  name?: string;
  registrationNumber?: string;
}

export interface Placement3D {
  instanceId: string;
  cargoId: string;
  description?: string;
  xMm: number;
  yMm: number;
  zMm: number;
  lengthMm: number; // Oriented dx
  widthMm: number;  // Oriented dy
  heightMm: number; // Oriented dz
  weightGrams: number;
  orientation: string;
  loadingSequence?: number;
  unloadingSequence?: number;
}

export interface PlacementsPayload {
  vehicleDimensions?: VehicleDimensionsSnapshot;
  placements: Placement3D[];
}

export interface VehicleTypeDetails {
  id: string;
  name: string;
  internalLength?: number | null;
  internalWidth?: number | null;
  internalHeight?: number | null;
  dimensionUnit?: string | null;
  maxPayload?: number | null;
  weightUnit?: string | null;
  volumetricCapacity?: number | null;
}

export interface VehicleDetails {
  id: string;
  registrationNumber?: string | null;
  fleetNumber?: string | null;
  vehicleType?: VehicleTypeDetails | null;
}

export interface LoadPlanItem {
  id: string;
  vehicleSequence: number;
  vehicleTypeId?: string | null;
  vehicleId?: string | null;
  loadedWeightKg: number;
  loadedVolumeM3: number;
  weightUtilizationPct: number;
  volumeUtilizationPct: number;
  placementsJson?: PlacementsPayload | Placement3D[] | any;
  vehicleType?: VehicleTypeDetails | null;
  vehicle?: VehicleDetails | null;
}

export interface UnallocatedCargoItem {
  instanceId: string;
  cargoId: string;
  description?: string;
  weightGrams: number;
  volumeMm3: number;
  reason: string;
}

export interface PersistedOptimizationRun {
  id: string;
  shipmentId: string;
  scenarioName: string;
  status: string;
  algorithmVersion: string;
  baselineTruckCount?: number | null;
  optimizedTruckCount?: number | null;
  totalLoadedWeightKg?: number | null;
  totalLoadedVolumeM3?: number | null;
  overallVolumeUtilizationPct?: number | null;
  overallWeightUtilizationPct?: number | null;
  unassignedItemsCount?: number;
  violationsCount?: number;
  violationsJson?: any;
  executionTimeMs?: number | null;
  loadPlans?: LoadPlanItem[];
  createdAt: string;
  updatedAt?: string;
}

// ── Routing & Traffic Domain Interfaces ─────────────────────────────────────

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteGeometry {
  format: 'GEOJSON' | 'ENCODED_POLYLINE' | 'COORDINATES';
  coordinates?: [number, number][]; // [longitude, latitude] GeoJSON coordinate pairs
  encodedPolyline?: string;
}

export interface RouteStep {
  distanceMeters: number;
  durationSeconds: number;
  instruction?: string;
  name?: string;
  type?: number;
}

export interface RouteSegment {
  distanceMeters: number;
  durationSeconds: number;
  steps?: RouteStep[];
}

export interface RouteLeg {
  origin: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  durationSeconds: number; // Provider free-flow travel duration (NOT live traffic)
  segments?: RouteSegment[];
  geometry?: RouteGeometry;
}

export interface RouteMetadata {
  timestamp: string;
  isTrafficAware: boolean;
  appliedProfile: string;
  appliedVehicleConstraints?: Record<string, unknown>;
  unsupportedVehicleConstraints?: string[];
  [key: string]: unknown;
}

export interface RouteResult {
  success: boolean;
  distanceMeters: number;
  durationSeconds: number; // Provider free-flow travel duration (NOT live traffic)
  geometry: RouteGeometry;
  legs: RouteLeg[];
  segments?: RouteSegment[];
  provider: string;
  providerVersion?: string;
  metadata: RouteMetadata;
}

export type TrafficStatus = 'BASELINE' | 'LIVE' | 'PREDICTED' | 'UNAVAILABLE' | 'ERROR';

export type CongestionLevel =
  | 'UNKNOWN'
  | 'FREE_FLOW'
  | 'LIGHT'
  | 'MODERATE'
  | 'HEAVY'
  | 'SEVERE';

export interface TrafficAssessment {
  status: TrafficStatus;
  isLive: boolean;
  isPredicted: boolean;
  baseDurationSeconds: number;
  trafficDurationSeconds: number;
  trafficDelaySeconds: number;
  confidence?: number;
  source: string;
  congestionLevel?: CongestionLevel;
  metadata?: Record<string, unknown>;
}

export interface TrafficETAResult {
  success: boolean;
  route: RouteResult;
  departureTime: string; // ISO 8601 string
  estimatedTimeOfArrival: string; // ISO 8601 string
  baseRouteDistanceMeters: number;
  baseDurationSeconds: number;
  trafficDurationSeconds: number;
  trafficDelaySeconds: number;
  status: TrafficStatus;
  isLiveTraffic: boolean;
  source: string;
  congestionLevel: CongestionLevel;
  assessment: TrafficAssessment;
  metadata: {
    calculatedAt: string;
    isTrafficAware: boolean;
    departureTimeIso: string;
    etaIso: string;
    [key: string]: unknown;
  };
}

// ── Carbon Impact Domain Contracts ──────────────────────────────────────────

export interface VehicleEmissionFactorDTO {
  id?: string;
  factorId?: string;
  category: string;
  subCategory: string;
  factorValue: number;
  unit: string;
  co2eUnit: string;
  sourceSet: string;
  version: number;
}

export interface VehicleCarbonResult {
  vehicleId?: string;
  vehicleTypeId?: string;
  vehicleCategory?: string;
  fuelType?: string;
  distanceKm: number;
  cargoWeightKg: number;
  activityValue: number;
  activityUnit: string;
  scope: string;
  co2e: number;
  co2eUnit: string;
  emissionFactor: VehicleEmissionFactorDTO;
  calculationMethod: string;
  formulaUsed: string;
}

export interface LogisticsCarbonProvenance {
  engineVersion: string;
  strategyUsed: string;
  factorSources: string[];
  calculatedAt: string;
}

export interface LogisticsCarbonImpactResult {
  organizationId: string;
  shipmentId: string;
  optimizationRunId?: string;
  scenarioName?: string;
  vehicles: VehicleCarbonResult[];
  totalCo2e: number;
  co2eUnit: string;
  totalDistanceKm: number;
  totalCargoWeightKg: number;
  totalTonneKm: number;
  vehicleCount: number;
  calculatedAt: string;
  calculationStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  provenance: LogisticsCarbonProvenance;
}

// ── Scenario Comparison & What-If Contracts ─────────────────────────────────

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
  percentageDelta: number | null;
  direction: EvaluationDirection;
  higherIsBetter: boolean | null;
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

export interface CreateScenarioRequest {
  scenarioName: string;
  vehicleIds?: string[];
  vehicleTypeIds?: string[];
  options?: {
    maxVehiclesToConsider?: number;
    maxCandidateSolutions?: number;
    maxExecutionTimeMs?: number;
    allowMultiVehicleFallback?: boolean;
  };
}

export interface CompareScenariosRequest {
  baselineScenarioId: string;
  targetScenarioIds: string[];
}


