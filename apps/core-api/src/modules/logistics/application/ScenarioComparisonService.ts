import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/app.error';
import { createLogger } from '../../../core/logging/logger';
import { LogisticsRepository, LoadPlanWithVehicleAndRoute } from '../infrastructure/logistics.repository';
import { FleetOptimizationService } from './FleetOptimizationService';
import { LogisticsCarbonImpactService } from './LogisticsCarbonImpactService';
import { RoutingService } from './RoutingService';
import { ScenarioComparisonEngine } from '../domain/comparison/ScenarioComparisonEngine';
import {
  EvaluatedScenarioSummary,
  ScenarioComparisonResult,
} from '../domain/comparison/types';

const logger = createLogger('ScenarioComparisonService');

export interface CreateScenarioInput {
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

export interface CompareScenariosInput {
  baselineScenarioId: string;
  targetScenarioIds: string[];
}

export class ScenarioComparisonService {
  private readonly repository: LogisticsRepository;
  private readonly fleetOptimizationService: FleetOptimizationService;
  private readonly carbonService: LogisticsCarbonImpactService;
  private readonly routingService: RoutingService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly organizationId: string,
    repository?: LogisticsRepository,
    fleetOptimizationService?: FleetOptimizationService,
    carbonService?: LogisticsCarbonImpactService,
    routingService?: RoutingService,
  ) {
    this.repository = repository ?? new LogisticsRepository(prisma, organizationId);
    this.fleetOptimizationService = fleetOptimizationService ?? new FleetOptimizationService(this.repository, organizationId);
    this.carbonService = carbonService ?? new LogisticsCarbonImpactService(prisma);
    this.routingService = routingService ?? new RoutingService(prisma, organizationId);
  }

  /**
   * Retrieves all saved optimization scenario runs for a shipment under strict tenant isolation.
   */
  public async listScenariosForShipment(shipmentId: string): Promise<EvaluatedScenarioSummary[]> {
    if (!shipmentId) {
      throw new ValidationError('shipmentId is required');
    }

    // Tenant isolation verification: throws NotFoundError if shipment not found or not in org
    await this.repository.findShipmentWithCargo(shipmentId);

    const runs = await this.repository.listOptimizationRunsByShipmentId(shipmentId);
    if (!runs || runs.length === 0) {
      return [];
    }

    const summaries: EvaluatedScenarioSummary[] = [];
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      // By default the oldest or first run is considered baseline if runNumber === 1
      const isBaseline = run.runNumber === 1 || i === runs.length - 1 || run.scenarioName.toLowerCase().includes('baseline');
      const summary = await this.mapRunToEvaluatedSummary(run, isBaseline);
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Executes what-if fleet optimization with custom bounded parameters and persists as a named scenario.
   */
  public async executeScenario(shipmentId: string, input: CreateScenarioInput): Promise<EvaluatedScenarioSummary> {
    if (!shipmentId) {
      throw new ValidationError('shipmentId is required');
    }
    if (!input.scenarioName || input.scenarioName.trim().length === 0) {
      throw new ValidationError('scenarioName is required');
    }

    // Validate shipment exists and belongs to this tenant
    await this.repository.findShipmentWithCargo(shipmentId);

    // Execute fleet optimization via authoritative FleetOptimizationService
    const optResult = await this.fleetOptimizationService.optimizeFleetForShipment({
      shipmentId,
      scenarioName: input.scenarioName.trim(),
      vehicleIds: input.vehicleIds,
      vehicleTypeIds: input.vehicleTypeIds,
      options: input.options,
      persistOptimizationRun: true,
    });

    if (!optResult.optimizationRunId) {
      throw new Error('Failed to persist optimization run scenario');
    }

    // Fetch the newly created run with associated load plans and relations
    const savedRun = await this.repository.findOptimizationRunById(optResult.optimizationRunId);

    return this.mapRunToEvaluatedSummary(savedRun, false);
  }

  /**
   * Performs structured multi-dimensional comparison between a baseline scenario and one or more target scenarios.
   */
  public async compareScenarios(
    shipmentId: string,
    input: CompareScenariosInput,
  ): Promise<ScenarioComparisonResult> {
    if (!shipmentId) {
      throw new ValidationError('shipmentId is required');
    }
    if (!input.baselineScenarioId) {
      throw new ValidationError('baselineScenarioId is required');
    }
    if (!input.targetScenarioIds || !Array.isArray(input.targetScenarioIds) || input.targetScenarioIds.length === 0) {
      throw new ValidationError('targetScenarioIds must be a non-empty array of scenario IDs');
    }

    // List all scenarios for this shipment (strictly tenant-isolated)
    const allSummaries = await this.listScenariosForShipment(shipmentId);
    const summaryMap = new Map<string, EvaluatedScenarioSummary>();
    for (const s of allSummaries) {
      summaryMap.set(s.id, s);
    }

    const baseline = summaryMap.get(input.baselineScenarioId);
    if (!baseline) {
      throw new NotFoundError(`Baseline scenario '${input.baselineScenarioId}' not found for shipment '${shipmentId}'`);
    }

    const targets: EvaluatedScenarioSummary[] = [];
    for (const targetId of input.targetScenarioIds) {
      const target = summaryMap.get(targetId);
      if (!target) {
        throw new NotFoundError(`Target scenario '${targetId}' not found for shipment '${shipmentId}'`);
      }
      targets.push(target);
    }

    return ScenarioComparisonEngine.compare(baseline, targets);
  }

  /**
   * Transforms a database OptimizationRun and its LoadPlans into an authoritative EvaluatedScenarioSummary.
   */
  private async mapRunToEvaluatedSummary(
    run: any,
    isBaseline: boolean,
  ): Promise<EvaluatedScenarioSummary> {
    const loadPlans: LoadPlanWithVehicleAndRoute[] = run.loadPlans ?? [];
    const vehicleCount = run.optimizedTruckCount ?? loadPlans.length;
    const totalLoadedWeightKg = Number(run.totalLoadedWeightKg ?? 0);
    const totalLoadedVolumeM3 = Number(run.totalLoadedVolumeM3 ?? 0);
    const overallPayloadUtilizationPct = Number(run.overallWeightUtilizationPct ?? 0);
    const overallVolumeUtilizationPct = Number(run.overallVolumeUtilizationPct ?? 0);
    const unassignedCargoCount = run.unassignedItemsCount ?? 0;

    // Headroom calculation
    let unusedPayloadKg = 0;
    let unusedVolumeM3 = 0;

    for (const lp of loadPlans) {
      const vt = lp.vehicleType || lp.vehicle?.vehicleType;
      if (vt) {
        const maxPayload = Number(vt.maxPayload ?? 0);
        const usableVolume = Number(vt.volumetricCapacity ?? 0);
        const loadedWeight = Number(lp.loadedWeightKg ?? 0);
        const loadedVolume = Number(lp.loadedVolumeM3 ?? 0);

        if (maxPayload > loadedWeight) {
          unusedPayloadKg += maxPayload - loadedWeight;
        }
        if (usableVolume > loadedVolume) {
          unusedVolumeM3 += usableVolume - loadedVolume;
        }
      }
    }

    // Round headroom values
    unusedPayloadKg = Number(unusedPayloadKg.toFixed(2));
    unusedVolumeM3 = Number(unusedVolumeM3.toFixed(3));

    // Routing metrics from LoadPlans or Shipment
    let routeDistanceKm: number | null = null;
    let routeDurationMinutes: number | null = null;

    if (run.optimizedDistanceKm) {
      routeDistanceKm = Number(run.optimizedDistanceKm);
    }
    if (run.optimizedDurationMins) {
      routeDurationMinutes = Number(run.optimizedDurationMins);
    }

    // If not stored on run, inspect load plans
    if (routeDistanceKm === null) {
      let sumDistance = 0;
      let sumDuration = 0;
      let hasRoute = false;

      for (const lp of loadPlans) {
        if (lp.routePlan) {
          hasRoute = true;
          sumDistance += Number(lp.routePlan.distanceKm);
          sumDuration += Number(lp.routePlan.durationMinutes);
        }
      }

      if (hasRoute) {
        routeDistanceKm = Number(sumDistance.toFixed(2));
        routeDurationMinutes = Number(sumDuration.toFixed(2));
      }
    }

    // If still null, try computing route distance from shipment stops
    if (routeDistanceKm === null) {
      try {
        const routeResult = await this.routingService.calculateRouteForShipment({
          shipmentId: run.shipmentId,
        });
        if (routeResult) {
          routeDistanceKm = Number((routeResult.distanceMeters / 1000).toFixed(2));
          routeDurationMinutes = Number((routeResult.durationSeconds / 60).toFixed(2));
        }
      } catch {
        // Route not computable (e.g. fewer than 2 stops or invalid coords) - keep null
        routeDistanceKm = null;
        routeDurationMinutes = null;
      }
    }

    const routeFeasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN' =
      routeDistanceKm !== null ? 'FEASIBLE' : 'UNKNOWN';

    // Authoritative Scope 3 Carbon Calculation
    let totalCo2eKg: number | null = null;
    let tonneKm: number | null = null;
    let emissionsIntensityGPerTonneKm: number | null = null;
    let carbonMethodology = 'GLEC_FRAMEWORK_V2_FREIGHT';

    try {
      const carbonResult = await this.carbonService.calculateShipmentCarbon(
        run.shipmentId,
        this.organizationId,
        { optimizationRunId: run.id },
      );

      if (carbonResult) {
        totalCo2eKg = carbonResult.totalCo2e;
        tonneKm = carbonResult.totalTonneKm;
        carbonMethodology = carbonResult.provenance?.strategyUsed || carbonMethodology;

        if (tonneKm && tonneKm > 0 && totalCo2eKg !== null) {
          emissionsIntensityGPerTonneKm = Number(((totalCo2eKg * 1000) / tonneKm).toFixed(2));
        }
      }
    } catch (err: any) {
      logger.debug(
        { runId: run.id, error: err?.message },
        'Authoritative carbon calculation for scenario skipped or failed',
      );
    }

    // Computational & Search Diagnostics
    const violationsJson = run.violationsJson as Record<string, any> | null;
    const searchStats = violationsJson?.searchStatistics;
    const executionTimeMs = run.executionTimeMs ?? searchStats?.executionDurationMs ?? 0;
    const candidateSolutionsEvaluated = searchStats?.candidateSolutionsEvaluated ?? 1;
    const searchTerminationReason = searchStats?.terminationReason || 'SEARCH_COMPLETED';
    const optimalityGuarantee =
      searchTerminationReason === 'OPTIMAL_FOUND' ? 'EXHAUSTIVE_OPTIMAL' : 'HEURISTIC_BOUNDED';

    const parameters = (run.parametersJson as Record<string, unknown>) ?? {};

    return {
      id: run.id,
      shipmentId: run.shipmentId,
      scenarioName: run.scenarioName || `Scenario ${run.runNumber ?? 1}`,
      notes: null,
      isBaseline,
      status: run.status,
      createdAt: run.createdAt instanceof Date ? run.createdAt.toISOString() : new Date(run.createdAt).toISOString(),
      vehicleCount,
      totalLoadedWeightKg,
      totalLoadedVolumeM3,
      overallPayloadUtilizationPct,
      overallVolumeUtilizationPct,
      unusedPayloadKg,
      unusedVolumeM3,
      unassignedCargoCount,
      routeDistanceKm,
      routeDurationMinutes,
      routeFeasibility,
      totalCo2eKg,
      emissionsIntensityGPerTonneKm,
      tonneKm,
      carbonMethodology,
      executionTimeMs,
      candidateSolutionsEvaluated,
      optimalityGuarantee,
      searchTerminationReason,
      parameters,
    };
  }
}
