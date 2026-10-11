import { ScopeType } from '@prisma/client';
import { LogisticsCarbonImpactService } from '../application/LogisticsCarbonImpactService';
import { IEmissionFactorProvider, FactorResolveCriteria } from '../../carbon-engine/emission-factor.provider';
import { LogisticsCarbonError } from '../domain/carbon/types';

// Mock emission factor provider with controlled verified factors
class MockEmissionFactorProvider implements IEmissionFactorProvider {
  private factors: Record<string, any> = {
    'UPSTREAM_TRANSPORT:ROAD_HEAVY_TRUCK:GLOBAL': {
      id: 'ef-road-heavy-truck-1',
      category: 'UPSTREAM_TRANSPORT',
      subCategory: 'ROAD_HEAVY_TRUCK',
      factorValue: 0.0921,
      unit: 'TONNE_KM',
      co2eUnit: 'kgCO2e',
      sourceSet: 'GLEC_V3',
      version: 2,
    },
    'UPSTREAM_TRANSPORT:ROAD_ARTICULATED_40T:GLOBAL': {
      id: 'ef-road-artic-40t-1',
      category: 'UPSTREAM_TRANSPORT',
      subCategory: 'ROAD_ARTICULATED_40T',
      factorValue: 0.0460,
      unit: 'TONNE_KM',
      co2eUnit: 'kgCO2e',
      sourceSet: 'GLEC_V3',
      version: 1,
    },
    'UPSTREAM_TRANSPORT:ROAD_RIGID_7_5T:GLOBAL': {
      id: 'ef-road-rigid-7-5t-1',
      category: 'UPSTREAM_TRANSPORT',
      subCategory: 'ROAD_RIGID_7_5T',
      factorValue: 0.2230,
      unit: 'TONNE_KM',
      co2eUnit: 'kgCO2e',
      sourceSet: 'GLEC_V3',
      version: 1,
    },
    'UPSTREAM_TRANSPORT:ROAD_LIGHT_VAN:GLOBAL': {
      id: 'ef-road-light-van-1',
      category: 'UPSTREAM_TRANSPORT',
      subCategory: 'ROAD_LIGHT_VAN',
      factorValue: 0.5970,
      unit: 'TONNE_KM',
      co2eUnit: 'kgCO2e',
      sourceSet: 'GLEC_V3',
      version: 1,
    },
    'MOBILE_COMBUSTION:HGV_RIGID_DIESEL:GLOBAL': {
      id: 'ef-hgv-rigid-diesel-1',
      category: 'MOBILE_COMBUSTION',
      subCategory: 'HGV_RIGID_DIESEL',
      factorValue: 0.52688,
      unit: 'KM',
      co2eUnit: 'kgCO2e',
      sourceSet: 'DEFRA_2024',
      version: 1,
    },
    'MOBILE_COMBUSTION:DIESEL:GLOBAL': {
      id: 'ef-diesel-fuel-1',
      category: 'MOBILE_COMBUSTION',
      subCategory: 'DIESEL',
      factorValue: 2.70,
      unit: 'LITERS',
      co2eUnit: 'kgCO2e',
      sourceSet: 'DEFRA_2024',
      version: 2,
    },
  };

  async resolveFactor(criteria: FactorResolveCriteria): Promise<any | null> {
    const region = criteria.region || 'GLOBAL';
    const key = `${criteria.category}:${criteria.subCategory}:${region}`;
    if (this.factors[key]) return this.factors[key];

    // Fallback to GLOBAL
    const globalKey = `${criteria.category}:${criteria.subCategory}:GLOBAL`;
    return this.factors[globalKey] || null;
  }
}

describe('Phase 6 — LogisticsCarbonImpactService', () => {
  let service: LogisticsCarbonImpactService;
  let mockFactorProvider: MockEmissionFactorProvider;
  let mockPrisma: any;

  beforeEach(() => {
    mockFactorProvider = new MockEmissionFactorProvider();
    mockPrisma = {
      shipment: {
        findFirst: jest.fn(),
      },
    };
    service = new LogisticsCarbonImpactService(mockPrisma, mockFactorProvider);
  });

  // ── TEST 1: GLEC Scope 3 freight calculation ─────────────────────────────
  it('TEST 1: Calculates standard GLEC Scope 3 road freight emissions (weight * distance * GLEC_factor)', async () => {
    const result = await service.calculateVehicleCarbon({
      vehicleCategory: 'HEAVY_TRUCK',
      distanceKm: 500,
      cargoWeightKg: 20000, // 20 tonnes
      calculationMethod: 'GLEC_TONNE_KM',
    });

    expect(result.scope).toBe(ScopeType.SCOPE_3);
    expect(result.distanceKm).toBe(500);
    expect(result.cargoWeightKg).toBe(20000);
    // 20 tonnes * 500 km = 10,000 tonne-km
    expect(result.activityValue).toBe(10000);
    expect(result.activityUnit).toBe('TONNE_KM');
    // 10,000 * 0.0921 = 921 kgCO2e
    expect(result.co2e).toBe(921);
    expect(result.co2eUnit).toBe('kgCO2e');
    expect(result.emissionFactor.subCategory).toBe('ROAD_HEAVY_TRUCK');
    expect(result.emissionFactor.sourceSet).toBe('GLEC_V3');
  });

  // ── TEST 2: Vehicle category mapping to specific GLEC truck types ──────────
  it('TEST 2: Maps distinct vehicle categories to specific verified GLEC emission factors', async () => {
    // 1. Articulated 40T truck
    const articResult = await service.calculateVehicleCarbon({
      vehicleCategory: 'ARTICULATED_40T',
      distanceKm: 1000,
      cargoWeightKg: 25000, // 25 tonnes
      calculationMethod: 'GLEC_TONNE_KM',
    });
    // 25 tonnes * 1000 km = 25,000 tkm * 0.0460 = 1150 kgCO2e
    expect(articResult.emissionFactor.subCategory).toBe('ROAD_ARTICULATED_40T');
    expect(articResult.activityValue).toBe(25000);
    expect(articResult.co2e).toBe(1150);

    // 2. Light delivery van
    const vanResult = await service.calculateVehicleCarbon({
      vehicleCategory: 'LIGHT_VAN',
      distanceKm: 100,
      cargoWeightKg: 1000, // 1 tonne
      calculationMethod: 'GLEC_TONNE_KM',
    });
    // 1 tonne * 100 km = 100 tkm * 0.5970 = 59.7 kgCO2e
    expect(vanResult.emissionFactor.subCategory).toBe('ROAD_LIGHT_VAN');
    expect(vanResult.activityValue).toBe(100);
    expect(vanResult.co2e).toBe(59.7);
  });

  // ── TEST 3: Multi-vehicle scenario aggregation ───────────────────────────
  it('TEST 3: Calculates and aggregates multi-truck scenarios with distinct vehicle factors', async () => {
    const scenario = await service.calculateScenarioCarbon({
      organizationId: 'org-alpha',
      shipmentId: 'shipment-101',
      optimizationRunId: 'opt-run-1',
      scenarioName: 'Optimized 2-Truck Allocation',
      vehicles: [
        {
          vehicleId: 'truck-1',
          vehicleCategory: 'ARTICULATED_40T',
          distanceKm: 800,
          cargoWeightKg: 20000, // 20 tonnes -> 16,000 tkm * 0.0460 = 736 kgCO2e
        },
        {
          vehicleId: 'truck-2',
          vehicleCategory: 'ROAD_RIGID_7_5T',
          distanceKm: 400,
          cargoWeightKg: 5000, // 5 tonnes -> 2,000 tkm * 0.2230 = 446 kgCO2e
        },
      ],
    });

    expect(scenario.organizationId).toBe('org-alpha');
    expect(scenario.shipmentId).toBe('shipment-101');
    expect(scenario.vehicleCount).toBe(2);
    expect(scenario.vehicles).toHaveLength(2);

    // Vehicle 1
    expect(scenario.vehicles[0].vehicleId).toBe('truck-1');
    expect(scenario.vehicles[0].co2e).toBe(736);

    // Vehicle 2
    expect(scenario.vehicles[1].vehicleId).toBe('truck-2');
    expect(scenario.vehicles[1].co2e).toBe(446);

    // Aggregates
    expect(scenario.totalDistanceKm).toBe(1200);
    expect(scenario.totalCargoWeightKg).toBe(25000);
    expect(scenario.totalTonneKm).toBe(18000); // 16,000 + 2,000
    expect(scenario.totalCo2e).toBe(1182); // 736 + 446
    expect(scenario.provenance.factorSources).toContain('GLEC_V3_v1');
  });

  // ── TEST 4: Fail fast on missing emission factor ──────────────────────────
  it('TEST 4: Fails fast with EMISSION_FACTOR_NOT_FOUND when factor does not exist (no silent defaults)', async () => {
    await expect(
      service.calculateVehicleCarbon({
        vehicleCategory: 'NON_EXISTENT_HYDROGEN_HYPER_TRUCK',
        distanceKm: 500,
        cargoWeightKg: 10000,
        calculationMethod: 'GLEC_TONNE_KM',
      }),
    ).rejects.toThrow(LogisticsCarbonError);

    try {
      await service.calculateVehicleCarbon({
        vehicleCategory: 'NON_EXISTENT_HYDROGEN_HYPER_TRUCK',
        distanceKm: 500,
        cargoWeightKg: 10000,
      });
    } catch (err: any) {
      expect(err.carbonCode).toBe('EMISSION_FACTOR_NOT_FOUND');
      expect(err.statusCode).toBe(404);
    }
  });

  // ── TEST 5: Scope 1 vehicle-km calculation ───────────────────────────────
  it('TEST 5: Supports Scope 1 vehicle-km calculation using distance-based factors', async () => {
    const result = await service.calculateVehicleCarbon({
      vehicleCategory: 'HGV_RIGID',
      fuelType: 'DIESEL',
      distanceKm: 300,
      cargoWeightKg: 8000,
      calculationMethod: 'VEHICLE_KM',
    });

    expect(result.scope).toBe(ScopeType.SCOPE_1);
    expect(result.activityUnit).toBe('KM');
    expect(result.activityValue).toBe(300);
    // 300 km * 0.52688 = 158.064 kgCO2e
    expect(result.co2e).toBeCloseTo(158.064, 2);
    expect(result.emissionFactor.subCategory).toBe('HGV_RIGID_DIESEL');
  });

  // ── TEST 6: Scope 1 fuel consumption calculation ─────────────────────────
  it('TEST 6: Supports Scope 1 direct fuel consumption calculation', async () => {
    const result = await service.calculateVehicleCarbon({
      fuelType: 'DIESEL',
      fuelLiters: 150,
      distanceKm: 400,
      cargoWeightKg: 10000,
      calculationMethod: 'FUEL_CONSUMPTION',
    });

    expect(result.scope).toBe(ScopeType.SCOPE_1);
    expect(result.activityUnit).toBe('LITERS');
    expect(result.activityValue).toBe(150);
    // 150 L * 2.70 = 405 kgCO2e
    expect(result.co2e).toBe(405);
    expect(result.emissionFactor.subCategory).toBe('DIESEL');
  });

  // ── TEST 7: Input validation on negative distance or weight ──────────────
  it('TEST 7: Rejects negative distance or cargo weight with INVALID_LOGISTICS_ACTIVITY', async () => {
    await expect(
      service.calculateVehicleCarbon({
        distanceKm: -50,
        cargoWeightKg: 1000,
      }),
    ).rejects.toThrow('Invalid distanceKm');

    await expect(
      service.calculateVehicleCarbon({
        distanceKm: 100,
        cargoWeightKg: -500,
      }),
    ).rejects.toThrow('Invalid cargoWeightKg');
  });

  // ── TEST 8: Zero distance or zero weight yields zero CO2e deterministically
  it('TEST 8: Zero distance or zero cargo weight yields zero CO2e deterministically', async () => {
    const result1 = await service.calculateVehicleCarbon({
      vehicleCategory: 'HEAVY_TRUCK',
      distanceKm: 0,
      cargoWeightKg: 20000,
    });
    expect(result1.co2e).toBe(0);
    expect(result1.activityValue).toBe(0);

    const result2 = await service.calculateVehicleCarbon({
      vehicleCategory: 'HEAVY_TRUCK',
      distanceKm: 500,
      cargoWeightKg: 0,
    });
    expect(result2.co2e).toBe(0);
    expect(result2.activityValue).toBe(0);
  });

  // ── TEST 9: Determinism test ─────────────────────────────────────────────
  it('TEST 9: Repeated executions on identical inputs yield bit-for-bit identical results', async () => {
    const input = {
      vehicleCategory: 'ARTICULATED_40T',
      distanceKm: 1245.8,
      cargoWeightKg: 18750,
      calculationMethod: 'GLEC_TONNE_KM' as const,
    };

    const run1 = await service.calculateVehicleCarbon(input);
    const run2 = await service.calculateVehicleCarbon(input);
    const run3 = await service.calculateVehicleCarbon(input);

    expect(run1.co2e).toBe(run2.co2e);
    expect(run2.co2e).toBe(run3.co2e);
    expect(run1.activityValue).toBe(run2.activityValue);
    expect(run1.formulaUsed).toBe(run2.formulaUsed);
  });

  // ── TEST 10: Tenant isolation enforcement ─────────────────────────────────
  it('TEST 10: Prevents cross-tenant shipment carbon calculation and throws 404', async () => {
    mockPrisma.shipment.findFirst.mockResolvedValue(null);

    await expect(
      service.calculateShipmentCarbon('shipment-999', 'org-unauthorized'),
    ).rejects.toThrow('Shipment');

    expect(mockPrisma.shipment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'shipment-999',
          organizationId: 'org-unauthorized',
        },
      }),
    );
  });

  // ── TEST 11: Persisted shipment calculation with optimization run ────────
  it('TEST 11: Calculates carbon from persisted shipment with load plans and route plans', async () => {
    mockPrisma.shipment.findFirst.mockResolvedValue({
      id: 'shipment-1',
      organizationId: 'org-1',
      totalWeight: 24000,
      optimizationRuns: [
        {
          id: 'run-1',
          scenarioName: '2-Truck Optimal Load',
          loadPlans: [
            {
              id: 'lp-1',
              vehicleId: 'veh-1',
              loadedWeightKg: 14000,
              vehicleType: { category: 'ARTICULATED_40T', fuelType: 'DIESEL' },
              routePlan: { distanceKm: 600 },
            },
            {
              id: 'lp-2',
              vehicleId: 'veh-2',
              loadedWeightKg: 10000,
              vehicleType: { category: 'ROAD_RIGID_7_5T', fuelType: 'DIESEL' },
              routePlan: { distanceKm: 450 },
            },
          ],
        },
      ],
    });

    const result = await service.calculateShipmentCarbon('shipment-1', 'org-1');

    expect(result.shipmentId).toBe('shipment-1');
    expect(result.organizationId).toBe('org-1');
    expect(result.vehicleCount).toBe(2);
    // Vehicle 1: 14 tonnes * 600 km = 8,400 tkm * 0.0460 = 386.4 kgCO2e
    expect(result.vehicles[0].co2e).toBe(386.4);
    // Vehicle 2: 10 tonnes * 450 km = 4,500 tkm * 0.2230 = 1003.5 kgCO2e
    expect(result.vehicles[1].co2e).toBe(1003.5);
    // Total CO2e = 386.4 + 1003.5 = 1389.9 kgCO2e
    expect(result.totalCo2e).toBe(1389.9);
    expect(result.totalDistanceKm).toBe(1050);
  });

  // ── TEST 12: Scenario comparison foundation ──────────────────────────────
  it('TEST 12: Enables direct comparison between two distinct logistics scenarios', async () => {
    // Scenario A: 3 smaller trucks, total distance 1,200 km
    const scenarioA = await service.calculateScenarioCarbon({
      organizationId: 'org-1',
      shipmentId: 'shipment-1',
      scenarioName: 'Scenario A: 3 Rigid Trucks',
      vehicles: [
        { vehicleCategory: 'ROAD_RIGID_7_5T', distanceKm: 400, cargoWeightKg: 6000 },
        { vehicleCategory: 'ROAD_RIGID_7_5T', distanceKm: 400, cargoWeightKg: 6000 },
        { vehicleCategory: 'ROAD_RIGID_7_5T', distanceKm: 400, cargoWeightKg: 6000 },
      ],
    });

    // Scenario B: 1 consolidated articulated truck, total distance 420 km
    const scenarioB = await service.calculateScenarioCarbon({
      organizationId: 'org-1',
      shipmentId: 'shipment-1',
      scenarioName: 'Scenario B: 1 Articulated Truck',
      vehicles: [
        { vehicleCategory: 'ARTICULATED_40T', distanceKm: 420, cargoWeightKg: 18000 },
      ],
    });

    // Scenario A: 3 * (6 tonnes * 400 km * 0.2230) = 3 * 535.2 = 1605.6 kgCO2e
    expect(scenarioA.totalCo2e).toBe(1605.6);
    expect(scenarioA.vehicleCount).toBe(3);

    // Scenario B: 18 tonnes * 420 km * 0.0460 = 347.76 kgCO2e
    expect(scenarioB.totalCo2e).toBe(347.76);
    expect(scenarioB.vehicleCount).toBe(1);

    // Assert that Scenario B achieves carbon reduction
    const savingsKg = Number((scenarioA.totalCo2e - scenarioB.totalCo2e).toFixed(2));
    const reductionPct = Number(((savingsKg / scenarioA.totalCo2e) * 100).toFixed(1));

    expect(savingsKg).toBe(1257.84);
    expect(reductionPct).toBe(78.3);
  });
});
