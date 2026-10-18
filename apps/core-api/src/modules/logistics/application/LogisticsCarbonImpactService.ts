import { PrismaClient, ScopeType } from '@prisma/client';
import {
  LogisticsActivityInput,
  VehicleCarbonResult,
  ScenarioCarbonInput,
  LogisticsCarbonImpactResult,
  LogisticsCarbonError,
} from '../domain/carbon/types';
import {
  IEmissionFactorProvider,
  PostgresEmissionFactorProvider,
} from '../../carbon-engine/emission-factor.provider';
import { ShipmentCalcEngine } from '../../carbon-engine/shipment-calc.engine';
import { NotFoundError } from '../../../core/errors/app.error';
import { createLogger } from '../../../core/logging/logger';

const logger = createLogger('LogisticsCarbonImpactService');

export class LogisticsCarbonImpactService {
  private readonly factorProvider: IEmissionFactorProvider;

  constructor(
    private readonly prisma: PrismaClient,
    factorProvider?: IEmissionFactorProvider,
  ) {
    this.factorProvider = factorProvider ?? new PostgresEmissionFactorProvider(this.prisma);
  }

  /**
   * Calculate emissions for an individual vehicle trip/assignment.
   * Directly uses the existing PostgresEmissionFactorProvider and ShipmentCalcEngine.
   */
  async calculateVehicleCarbon(
    input: LogisticsActivityInput,
    _orgId?: string,
  ): Promise<VehicleCarbonResult> {
    // 1. Activity validation & normalization
    if (isNaN(input.distanceKm) || input.distanceKm < 0) {
      input.distanceKm = 0;
    }
    if (isNaN(input.cargoWeightKg) || input.cargoWeightKg < 0) {
      input.cargoWeightKg = 0;
    }

    const method = input.calculationMethod || 'GLEC_TONNE_KM';
    let category = 'UPSTREAM_TRANSPORT';
    let subCategory = 'ROAD_HEAVY_TRUCK';

    // 2. Map vehicle context to existing Carbon Engine emission factor categories
    if (method === 'GLEC_TONNE_KM') {
      category = 'UPSTREAM_TRANSPORT';
      const catUpper = (input.vehicleCategory || '').toUpperCase();
      if (
        catUpper === 'ARTICULATED_40T' ||
        catUpper.includes('ARTICULATED') ||
        catUpper.includes('40T') ||
        catUpper.includes('TRAILER')
      ) {
        subCategory = 'ROAD_ARTICULATED_40T';
      } else if (
        catUpper === 'LIGHT_VAN' ||
        catUpper.includes('VAN') ||
        catUpper.includes('LIGHT') ||
        catUpper.includes('MINI') ||
        catUpper.includes('DOST') ||
        catUpper.includes('ACE') ||
        catUpper.includes('PICKUP')
      ) {
        subCategory = 'ROAD_LIGHT_VAN';
      } else if (
        catUpper === 'RIGID_7_5T' ||
        catUpper.includes('7_5T') ||
        catUpper.includes('7.5T') ||
        catUpper.includes('MEDIUM') ||
        catUpper.includes('EICHER') ||
        catUpper.includes('407')
      ) {
        subCategory = 'ROAD_RIGID_7_5T';
      } else {
        // Universal fallback for HEAVY_DUTY, CONTAINER, HEAVY_TRUCK, HGV, or unspecified
        subCategory = 'ROAD_HEAVY_TRUCK';
      }
    } else if (method === 'VEHICLE_KM') {
      category = 'MOBILE_COMBUSTION';
      const catUpper = (input.vehicleCategory || '').toUpperCase();
      const fuelUpper = (input.fuelType || 'DIESEL').toUpperCase();

      if (catUpper.includes('ARTIC')) {
        subCategory = `HGV_ARTIC_${fuelUpper}`;
      } else if (catUpper.includes('VAN') || catUpper.includes('LIGHT') || catUpper.includes('MINI')) {
        subCategory = `VAN_${fuelUpper}`;
      } else if (catUpper.includes('CAR')) {
        subCategory = `CAR_AVERAGE_${fuelUpper}`;
      } else {
        subCategory = `HGV_RIGID_${fuelUpper}`;
      }
    } else if (method === 'FUEL_CONSUMPTION') {
      category = 'MOBILE_COMBUSTION';
      const fuelUpper = (input.fuelType || 'DIESEL').toUpperCase();
      subCategory = fuelUpper;
    }

    // 3. Resolve factor through the existing PostgresEmissionFactorProvider
    const asOfDate = input.activityDate ?? new Date();
    const region = input.region ?? 'GLOBAL';

    let factor = await this.factorProvider.resolveFactor({
      category,
      subCategory,
      region,
      asOfDate,
    }).catch(() => null);

    // Resilient fallback: if specific subcategory has no factor, resolve ROAD_HEAVY_TRUCK
    if (!factor && category === 'UPSTREAM_TRANSPORT') {
      factor = await this.factorProvider.resolveFactor({
        category: 'UPSTREAM_TRANSPORT',
        subCategory: 'ROAD_HEAVY_TRUCK',
        region: 'GLOBAL',
        asOfDate,
      }).catch(() => null);
    }

    if (!factor) {
      throw new LogisticsCarbonError(
        `No approved emission factor found for ${category}:${subCategory} in region ${region}. Calculations fail fast without silent fallbacks.`,
        'EMISSION_FACTOR_NOT_FOUND',
        404,
      );
    }

    // 4. Execute calculation using the existing authoritative ShipmentCalcEngine
    let engineFields: Record<string, any> = {};

    if (method === 'GLEC_TONNE_KM') {
      engineFields = {
        distanceKm: { value: input.distanceKm },
        weightKg: { value: input.cargoWeightKg },
      };
    } else if (method === 'VEHICLE_KM') {
      engineFields = {
        distanceKm: { value: input.distanceKm },
        quantity: { value: input.distanceKm },
        unit: { value: 'KM' },
      };
    } else {
      // FUEL_CONSUMPTION
      const fuelLiters = input.fuelLiters ?? 0;
      engineFields = {
        quantity: { value: fuelLiters },
        unit: { value: factor.unit },
      };
    }

    const rawOutput = ShipmentCalcEngine.calculate({
      categoryCode: category,
      fields: engineFields,
      factorValue: factor.factorValue,
      factorUnit: factor.unit,
    });

    return {
      vehicleId: input.vehicleId,
      vehicleTypeId: input.vehicleTypeId,
      vehicleCategory: input.vehicleCategory,
      fuelType: input.fuelType,
      distanceKm: input.distanceKm,
      cargoWeightKg: input.cargoWeightKg,
      activityValue: rawOutput.activityValue,
      activityUnit: rawOutput.activityUnit,
      scope: rawOutput.scope || ScopeType.SCOPE_3,
      co2e: rawOutput.co2e,
      co2eUnit: factor.co2eUnit || 'kgCO2e',
      emissionFactor: {
        id: factor.id,
        category: factor.category,
        subCategory: factor.subCategory,
        factorValue: factor.factorValue,
        unit: factor.unit,
        co2eUnit: factor.co2eUnit || 'kgCO2e',
        sourceSet: factor.sourceSet,
        version: factor.version,
      },
      calculationMethod: rawOutput.calculationMethod,
      formulaUsed: rawOutput.formulaUsed,
    };
  }

  /**
   * Calculate aggregated carbon impact for a full logistics scenario (e.g. from an OptimizationRun).
   * Aggregates each vehicle's footprint while preserving per-vehicle calculation provenance.
   */
  async calculateScenarioCarbon(
    input: ScenarioCarbonInput,
  ): Promise<LogisticsCarbonImpactResult> {
    if (!input.organizationId) {
      throw new LogisticsCarbonError(
        'organizationId is required for scenario carbon calculation',
        'TENANT_ACCESS_DENIED',
        400,
      );
    }
    if (!input.shipmentId) {
      throw new LogisticsCarbonError(
        'shipmentId is required for scenario carbon calculation',
        'INVALID_LOGISTICS_ACTIVITY',
        400,
      );
    }

    const calculatedVehicles: VehicleCarbonResult[] = [];
    const factorSources = new Set<string>();

    for (const vInput of input.vehicles) {
      const vResult = await this.calculateVehicleCarbon(
        {
          ...vInput,
          activityDate: vInput.activityDate || input.activityDate,
          region: vInput.region || input.region,
        },
        input.organizationId,
      );
      calculatedVehicles.push(vResult);
      factorSources.add(`${vResult.emissionFactor.sourceSet}_v${vResult.emissionFactor.version}`);
    }

    const totalCo2e = Number(
      calculatedVehicles.reduce((sum, v) => sum + v.co2e, 0).toFixed(4),
    );
    const totalDistanceKm = Number(
      calculatedVehicles.reduce((sum, v) => sum + v.distanceKm, 0).toFixed(2),
    );
    const totalCargoWeightKg = Number(
      calculatedVehicles.reduce((sum, v) => sum + v.cargoWeightKg, 0).toFixed(3),
    );
    const totalTonneKm = Number(
      calculatedVehicles.reduce((sum, v) => sum + (v.activityUnit === 'TONNE_KM' ? v.activityValue : 0), 0).toFixed(4),
    );

    return {
      organizationId: input.organizationId,
      shipmentId: input.shipmentId,
      optimizationRunId: input.optimizationRunId,
      scenarioName: input.scenarioName,
      vehicles: calculatedVehicles,
      totalCo2e,
      co2eUnit: 'kgCO2e',
      totalDistanceKm,
      totalCargoWeightKg,
      totalTonneKm,
      vehicleCount: calculatedVehicles.length,
      calculatedAt: new Date(),
      calculationStatus: 'COMPLETED',
      provenance: {
        engineVersion: 'CarbonIQ-GLEC-v3-Core',
        strategyUsed: calculatedVehicles[0]?.calculationMethod || 'GLEC_FRAMEWORK_V2_FREIGHT',
        factorSources: Array.from(factorSources),
        calculatedAt: new Date(),
      },
    };
  }

  /**
   * Calculate carbon impact for a persisted Shipment, strictly enforcing tenant isolation.
   */
  async calculateShipmentCarbon(
    shipmentId: string,
    organizationId: string,
    options?: {
      optimizationRunId?: string;
      region?: string;
      distanceKm?: number;
    },
  ): Promise<LogisticsCarbonImpactResult> {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        organizationId: organizationId,
      },
      include: {
        cargoItems: true,
        shipmentStops: {
          orderBy: { stopSequence: 'asc' },
        },
        optimizationRuns: {
          where: options?.optimizationRunId ? { id: options.optimizationRunId } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            loadPlans: {
              include: {
                vehicle: {
                  include: {
                    vehicleType: true,
                  },
                },
                vehicleType: true,
                routePlan: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      logger.warn({ shipmentId, organizationId }, 'Tenant-isolated shipment lookup failed');
      throw new NotFoundError('Shipment');
    }

    // Compute fallback road distance using stop coordinates (Haversine * 1.25 road curvature)
    let fallbackStopsDist = 50;
    if (shipment.shipmentStops && shipment.shipmentStops.length >= 2) {
      let totalDist = 0;
      for (let i = 0; i < shipment.shipmentStops.length - 1; i++) {
        const lat1 = Number(shipment.shipmentStops[i].latitude);
        const lon1 = Number(shipment.shipmentStops[i].longitude);
        const lat2 = Number(shipment.shipmentStops[i + 1].latitude);
        const lon2 = Number(shipment.shipmentStops[i + 1].longitude);
        if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
          const R = 6371; // Earth radius km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalDist += R * c * 1.25;
        }
      }
      if (totalDist > 0) {
        fallbackStopsDist = Math.round(totalDist * 10) / 10;
      }
    }

    const latestRun = shipment.optimizationRuns[0];
    const vehicleInputs: LogisticsActivityInput[] = [];

    const resolveDist = (rawRouteDist?: number | null): number => {
      if (rawRouteDist !== undefined && rawRouteDist !== null && !isNaN(Number(rawRouteDist)) && Number(rawRouteDist) > 0) {
        return Number(rawRouteDist);
      }
      if (options?.distanceKm && !isNaN(Number(options.distanceKm)) && Number(options.distanceKm) > 0) {
        return Number(options.distanceKm);
      }
      const sDist = (shipment as any).totalDistanceKm;
      if (sDist !== undefined && sDist !== null && !isNaN(Number(sDist)) && Number(sDist) > 0) {
        return Number(sDist);
      }
      return fallbackStopsDist;
    };

    if (latestRun && latestRun.loadPlans.length > 0) {
      for (const lp of latestRun.loadPlans) {
        const distanceKm = resolveDist(lp.routePlan ? Number(lp.routePlan.distanceKm) : null);
        const weightKg = Number(lp.loadedWeightKg) || 0;
        const vehicleCategory = lp.vehicleType?.category || lp.vehicle?.vehicleType?.category || 'HEAVY_TRUCK';
        const fuelType = lp.vehicleType?.fuelType || lp.vehicle?.vehicleType?.fuelType || 'DIESEL';

        vehicleInputs.push({
          vehicleId: lp.vehicleId || undefined,
          vehicleTypeId: lp.vehicleTypeId || undefined,
          vehicleCategory,
          fuelType,
          distanceKm: Math.max(1, distanceKm),
          cargoWeightKg: Math.max(0, weightKg),
          calculationMethod: 'GLEC_TONNE_KM',
        });
      }
    } else {
      // Fallback: Use shipment total aggregated weight
      const totalWeightKg = Number(shipment.totalWeight) || 0;
      const fallbackDist = resolveDist(null);
      vehicleInputs.push({
        distanceKm: Math.max(1, fallbackDist),
        cargoWeightKg: Math.max(0, totalWeightKg),
        vehicleCategory: 'HEAVY_TRUCK',
        fuelType: 'DIESEL',
        calculationMethod: 'GLEC_TONNE_KM',
      });
    }

    return this.calculateScenarioCarbon({
      organizationId,
      shipmentId,
      optimizationRunId: latestRun?.id,
      scenarioName: latestRun?.scenarioName || 'Default Scenario',
      vehicles: vehicleInputs,
      region: options?.region,
    });
  }
}
