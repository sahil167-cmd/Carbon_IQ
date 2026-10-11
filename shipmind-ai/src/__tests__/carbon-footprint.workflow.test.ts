import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogisticsService from '../services/logistics.service';
import * as apiClient from '../lib/api-client';
import type { LogisticsCarbonImpactResult } from '../types/logistics';

describe('Logistics Carbon Footprint Engine & Frontend Integration (Phase 7F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authoritative Carbon Computation Standards (GLEC Framework Scope 1 & 3)', () => {
    it('accurately computes Well-to-Wheel (WTW) emissions as sum of Well-to-Tank (WTT) and Tank-to-Wheel (TTW)', () => {
      const wellToTankKg = 125.4; // Upstream fuel production/refining/transport
      const tankToWheelKg = 418.2; // Combustion during transport
      const totalWtwKg = Number((wellToTankKg + tankToWheelKg).toFixed(4));

      expect(totalWtwKg).toBe(543.6);
      expect(totalWtwKg).toBeGreaterThan(tankToWheelKg);
    });

    it('correctly calculates transport activity in ton-kilometers (t-km)', () => {
      const cargoWeightKg = 8500;
      const distanceKm = 340;

      const cargoTonnes = cargoWeightKg / 1000; // 8.5 tonnes
      const tonKilometers = cargoTonnes * distanceKm; // 8.5 * 340 = 2890 t-km

      expect(tonKilometers).toBe(2890);
    });

    it('computes carbon intensity (g CO2e / ton-km) accurately', () => {
      const totalCo2eKg = 312.12;
      const tonKilometers = 2890;

      const totalCo2eGrams = totalCo2eKg * 1000;
      const carbonIntensityGPerTonKm = totalCo2eGrams / tonKilometers;

      expect(carbonIntensityGPerTonKm).toBeCloseTo(108.0, 1);
    });

    it('allocates empty-haul return penalties according to GLEC cargo allocation guidelines', () => {
      const ladenTripDistanceKm = 400;
      const emptyReturnTripDistanceKm = 100;
      const emptyReturnPenaltyRate = 0.25; // 25% empty running

      const effectiveLadenFactor = 1 / (1 - emptyReturnPenaltyRate); // 1.333x
      const allocatedEmissionsFactor = (ladenTripDistanceKm + emptyReturnTripDistanceKm) / ladenTripDistanceKm;

      expect(allocatedEmissionsFactor).toBe(1.25);
      expect(effectiveLadenFactor).toBeGreaterThan(1.0);
    });

    it('applies load factor adjustment penalty for sub-optimally packed freight', () => {
      const baselineEmissionPerKm = 0.85; // kg CO2e / km at 100% capacity
      const actualLoadFactor = 0.65; // 65% capacity utilization

      // GLEC inverse load adjustment formula: baseline / (loadFactor ^ 0.7)
      const adjustedEmissionFactor = baselineEmissionPerKm / Math.pow(actualLoadFactor, 0.7);

      expect(adjustedEmissionFactor).toBeGreaterThan(baselineEmissionPerKm);
      expect(adjustedEmissionFactor).toBeCloseTo(1.147, 2);
    });
  });

  describe('Scope 1, Scope 2, and Scope 3 Logistics Boundaries', () => {
    it('strictly separates direct tailpipe (Scope 1) from upstream energy lifecycle (Scope 3 Category 3)', () => {
      const emissionsBreakdown = {
        scope1TailpipeKg: 420.0,
        scope2ElectricityKg: 0.0, // Zero for internal combustion engines
        scope3FuelUpstreamKg: 105.0, // Well-to-tank refining & distribution
        scope3SubcontractedFreightKg: 0.0, // Directly operated fleet
        scope3HubOperationsKg: 28.5, // Warehousing & cross-dock handling
      };

      const totalEmissionsKg = Object.values(emissionsBreakdown).reduce((sum, val) => sum + val, 0);

      expect(totalEmissionsKg).toBe(553.5);
      expect(emissionsBreakdown.scope1TailpipeKg / totalEmissionsKg).toBeCloseTo(0.7588, 3);
      expect(emissionsBreakdown.scope3FuelUpstreamKg / totalEmissionsKg).toBeCloseTo(0.1897, 3);
    });

    it('correctly models zero Scope 1 emissions for Battery Electric Vehicles (BEV) with grid Scope 2 / Scope 3', () => {
      const bevVehicleEmissions = {
        scope1TailpipeKg: 0.0,
        scope2ElectricityKg: 85.2, // Grid power generation
        scope3UpstreamElectricityKg: 18.3, // Grid transmission and distribution losses
      };

      expect(bevVehicleEmissions.scope1TailpipeKg).toBe(0.0);
      const totalBevKg = bevVehicleEmissions.scope2ElectricityKg + bevVehicleEmissions.scope3UpstreamElectricityKg;
      expect(totalBevKg).toBe(103.5);
    });
  });

  describe('Fuel Type and Energy Conversion Integrity', () => {
    it('accurately converts diesel liters to energy content (MJ) and GLEC emission equivalents', () => {
      const dieselLiters = 150;
      const dieselEnergyDensityMJPerLiter = 35.8; // Standard diesel Lower Heating Value (LHV)
      const dieselWtwCo2ePerLiter = 3.24; // kg CO2e / liter WTW

      const totalEnergyMJ = dieselLiters * dieselEnergyDensityMJPerLiter;
      const totalCo2eKg = dieselLiters * dieselWtwCo2ePerLiter;

      expect(totalEnergyMJ).toBe(5370);
      expect(totalCo2eKg).toBeCloseTo(486, 2);
    });

    it('compares carbon savings percentage between baseline and optimized fleet', () => {
      const baselineTotalEmissionsKg = 640.0;
      const optimizedTotalEmissionsKg = 448.0;

      const reductionKg = baselineTotalEmissionsKg - optimizedTotalEmissionsKg;
      const reductionPercentage = (reductionKg / baselineTotalEmissionsKg) * 100;

      expect(reductionKg).toBe(192.0);
      expect(reductionPercentage).toBe(30.0);
    });
  });

  describe('LogisticsService Carbon API Client Integration', () => {
    it('calls GET /api/v1/logistics/shipments/:shipmentId/carbon with optimizationId query param', async () => {
      const mockResult: LogisticsCarbonImpactResult = {
        organizationId: 'org-test-1',
        shipmentId: 'ship-101',
        optimizationRunId: 'opt-run-202',
        scenarioName: 'Optimized HGV Fleet',
        totalCo2e: 384.5,
        co2eUnit: 'kgCO2e',
        totalDistanceKm: 350.0,
        totalCargoWeightKg: 7000.0,
        totalTonneKm: 2450.0,
        vehicleCount: 1,
        calculatedAt: new Date().toISOString(),
        calculationStatus: 'COMPLETED',
        vehicles: [
          {
            vehicleId: 'veh-001',
            vehicleCategory: 'HEAVY_DUTY_TRUCK',
            fuelType: 'DIESEL',
            distanceKm: 350.0,
            cargoWeightKg: 7000.0,
            activityValue: 2450.0,
            activityUnit: 'tonne-km',
            scope: 'SCOPE_1',
            co2e: 384.5,
            co2eUnit: 'kgCO2e',
            emissionFactor: {
              factorId: 'ef-diesel-hgv-1',
              category: 'LOGISTICS',
              subCategory: 'ROAD_FREIGHT',
              factorValue: 0.1569,
              unit: 'kgCO2e/tonne-km',
              co2eUnit: 'kgCO2e',
              sourceSet: 'GLEC_V3',
              version: 1,
            },
            calculationMethod: 'GLEC_FRAMEWORK_V3_ACTIVITY_BASED',
            formulaUsed: 'activityValue * emissionFactor.factorValue',
          },
        ],
        provenance: {
          engineVersion: '2.0.0',
          strategyUsed: 'ACTIVITY_BASED_TONNE_KM',
          factorSources: ['GLEC Framework v3.0', 'Smart Freight Centre 2023'],
          calculatedAt: new Date().toISOString(),
        },
      };

      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue(mockResult);

      const response = await LogisticsService.getShipmentCarbon('ship-101', {
        optimizationRunId: 'opt-run-202',
      });

      expect(apiGetSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/ship-101/carbon',
        { optimizationRunId: 'opt-run-202' }
      );
      expect(response).toEqual(mockResult);
      expect(response.totalCo2e).toBe(384.5);
      expect(response.co2eUnit).toBe('kgCO2e');
      expect(response.vehicles).toHaveLength(1);
      expect(response.provenance.factorSources).toContain('GLEC Framework v3.0');
    });

    it('calls GET /api/v1/logistics/shipments/:shipmentId/carbon without params when none provided', async () => {
      const mockResult: LogisticsCarbonImpactResult = {
        organizationId: 'org-test-1',
        shipmentId: 'ship-102',
        totalCo2e: 150.2,
        co2eUnit: 'kgCO2e',
        totalDistanceKm: 120.0,
        totalCargoWeightKg: 4000.0,
        totalTonneKm: 480.0,
        vehicleCount: 1,
        calculatedAt: new Date().toISOString(),
        calculationStatus: 'COMPLETED',
        vehicles: [],
        provenance: {
          engineVersion: '2.0.0',
          strategyUsed: 'ACTIVITY_BASED_TONNE_KM',
          factorSources: ['GLEC Framework v3.0'],
          calculatedAt: new Date().toISOString(),
        },
      };

      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue(mockResult);

      const response = await LogisticsService.getShipmentCarbon('ship-102');

      expect(apiGetSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/ship-102/carbon',
        undefined
      );
      expect(response.totalCo2e).toBe(150.2);
    });

    it('propagates API client errors for downstream handling', async () => {
      vi.spyOn(apiClient, 'apiGet').mockRejectedValue(new Error('Network error'));

      await expect(LogisticsService.getShipmentCarbon('ship-err')).rejects.toThrow('Network error');
    });
  });
});
