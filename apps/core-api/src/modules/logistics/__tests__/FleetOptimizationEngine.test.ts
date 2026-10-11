import fs from 'fs';
import path from 'path';
import {
  DimensionUnit,
  OptimizationStatus,
  Prisma,
  WeightUnit,
} from '@prisma/client';
import { FleetOptimizationEngine } from '../domain/optimization/FleetOptimizationEngine';
import { FleetOptimizationInput } from '../domain/optimization/types';
import { FleetVehicleCandidate } from '../domain/allocation/types';
import { CargoItemInput } from '../domain/packing/types';
import { FleetOptimizationService } from '../application/FleetOptimizationService';
import { NotFoundError } from '../../../core/errors/app.error';

describe('Phase 3B — Fleet Optimization Engine', () => {
  const orgAlpha = 'org-tenant-alpha-001';
  const orgBeta = 'org-tenant-beta-002';

  // Synthetic standard 24ft truck candidate (useful capacity: 10,000 kg, 41.47 m3)
  const truck24ftAlpha: FleetVehicleCandidate = {
    candidateId: 'cand-truck-alpha-24ft',
    vehicleId: 'veh-alpha-01',
    vehicleTypeId: 'vt-standard-24ft',
    registrationNumber: 'MH-12-AB-1234',
    name: 'Alpha Fleet 24ft Box Truck',
    lengthMm: 7200,
    widthMm: 2400,
    heightMm: 2400,
    volumeMm3: 7200 * 2400 * 2400, // ~41.47 m3
    maxPayloadGrams: 10000000,     // 10,000 kg
    status: 'AVAILABLE',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isPackingCompatible: true,
  };

  // Synthetic second 24ft truck candidate
  const truck24ftAlpha2: FleetVehicleCandidate = {
    candidateId: 'cand-truck-alpha-24ft-2',
    vehicleId: 'veh-alpha-02',
    vehicleTypeId: 'vt-standard-24ft',
    registrationNumber: 'MH-12-CD-5678',
    name: 'Alpha Fleet 24ft Box Truck #2',
    lengthMm: 7200,
    widthMm: 2400,
    heightMm: 2400,
    volumeMm3: 7200 * 2400 * 2400,
    maxPayloadGrams: 10000000,
    status: 'AVAILABLE',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isPackingCompatible: true,
  };

  // Synthetic large 32ft multi-axle truck candidate (useful capacity: 18,500 kg, 61.6 m3)
  const truck32ftAlpha: FleetVehicleCandidate = {
    candidateId: 'cand-truck-alpha-32ft',
    vehicleId: 'veh-alpha-03',
    vehicleTypeId: 'vt-standard-32ft',
    registrationNumber: 'MH-12-EF-9012',
    name: 'Alpha Fleet 32ft Multi-Axle Container',
    lengthMm: 9750,
    widthMm: 2440,
    heightMm: 2590,
    volumeMm3: 9750 * 2440 * 2590, // ~61.6 m3
    maxPayloadGrams: 18500000,     // 18,500 kg
    status: 'AVAILABLE',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isPackingCompatible: true,
  };

  // Synthetic small 14ft city truck candidate (useful capacity: 4,000 kg, 18.4 m3)
  const truck14ftAlpha: FleetVehicleCandidate = {
    candidateId: 'cand-truck-alpha-14ft',
    vehicleId: 'veh-alpha-04',
    vehicleTypeId: 'vt-standard-14ft',
    registrationNumber: 'MH-12-GH-3456',
    name: 'Alpha Fleet 14ft City Truck',
    lengthMm: 4200,
    widthMm: 2100,
    heightMm: 2100,
    volumeMm3: 4200 * 2100 * 2100,
    maxPayloadGrams: 4000000, // 4,000 kg
    status: 'AVAILABLE',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isPackingCompatible: true,
  };

  let optimizer: FleetOptimizationEngine;

  beforeEach(() => {
    optimizer = new FleetOptimizationEngine();
  });

  // ===========================================================================
  // TEST 1: Baseline solution is produced
  // ===========================================================================
  it('TEST 1: Baseline solution is produced', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-1',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1200,
        weightGrams: 1000000, // 1t
        quantity: 2,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-baseline',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = optimizer.optimize(input);

    expect(result.baseline).toBeDefined();
    expect(result.baseline.success).toBe(true);
    expect(result.bestSolution).toBeDefined();
    expect(result.success).toBe(true);
  });

  // ===========================================================================
  // TEST 2: Optimizer finds a 1-vehicle solution when one exists
  // ===========================================================================
  it('TEST 2: Optimizer finds a 1-vehicle solution when one exists', () => {
    // 12,000 kg total cargo
    // truck24ftAlpha is 10,000 kg (too small)
    // truck32ftAlpha is 18,500 kg (fits all in 1 truck)
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-heavy-batch',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1200,
        weightGrams: 2000000, // 2t each
        quantity: 6,          // 12t total
      },
    ];

    // Give the optimizer a pool with multiple 24ft trucks and one 32ft truck
    const input: FleetOptimizationInput = {
      shipmentId: 'shp-single-fit',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2, truck32ftAlpha],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    expect(result.bestSolution).not.toBeNull();
    // Must find a 1-vehicle solution using the 32ft truck
    expect(result.bestSolution!.metrics.vehicleCount).toBe(1);
    expect(result.bestSolution!.selectedVehicleIds).toEqual(['veh-alpha-03']);
  });

  // ===========================================================================
  // TEST 3: Optimizer prefers 1 vehicle over 2 even when 2-vehicle has better utilization
  // ===========================================================================
  it('TEST 3: Optimizer prefers 1 vehicle over 2 even when the 2-vehicle solution has better utilization', () => {
    // Total weight = 7,000 kg
    // If placed in truck32ft (18,500 kg), payload utilization = 7,000 / 18,500 = 37.8% (1 truck)
    // If placed in two smaller 4,000 kg trucks (truck14ftAlpha + twin 4t truck):
    // 4,000kg in truck1 (100%) + 3,000kg in truck2 (75%) = 7,000 / 8,000 = 87.5% (2 trucks)
    // Lexicographic hierarchy mandates: 1 vehicle ALWAYS beats 2 vehicles!
    const twin14ft: FleetVehicleCandidate = {
      ...truck14ftAlpha,
      candidateId: 'cand-truck-14ft-2',
      vehicleId: 'veh-alpha-05',
    };

    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 3500000, // 3.5t each
        quantity: 2,          // 7.0t total
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-lexicographic-priority',
      cargoItems,
      vehicles: [truck14ftAlpha, twin14ft, truck32ftAlpha],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    expect(result.bestSolution!.metrics.vehicleCount).toBe(1);
    expect(result.bestSolution!.selectedVehicleIds).toEqual(['veh-alpha-03']);
  });

  // ===========================================================================
  // TEST 4: Optimizer finds a better 2-vehicle configuration than greedy baseline
  // ===========================================================================
  it('TEST 4: Optimizer finds a better 2-vehicle configuration than the greedy baseline when such a configuration exists', () => {
    // Total cargo: 14,000 kg (7 boxes of 2,000 kg)
    // Vehicle pool:
    // Truck A1: 10,000 kg
    // Truck A2: 10,000 kg
    // Truck B1: 8,000 kg
    // Truck B2: 8,000 kg
    // No single vehicle can fit 14,000 kg (max single vehicle is 10,000 kg).
    // Greedy baseline sorts by payload descending -> picks [Truck A1, Truck A2]
    // Baseline payload capacity = 20,000 kg (70% utilization, 6,000 kg unused payload).
    // Optimizer evaluates subsets of size k=2 and finds [Truck B1, Truck B2]
    // Optimized payload capacity = 16,000 kg (87.5% utilization, 2,000 kg unused payload).
    // Optimizer picks [Truck B1, Truck B2] because 87.5% > 70.0%!
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-tight',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 2000000, // 2t each
        quantity: 7,          // 14t total
      },
    ];

    const truck8tAlpha1: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-truck-8t-1',
      vehicleId: 'veh-alpha-8t-1',
      maxPayloadGrams: 8000000,
    };

    const truck8tAlpha2: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-truck-8t-2',
      vehicleId: 'veh-alpha-8t-2',
      maxPayloadGrams: 8000000,
    };

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-better-2-veh',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2, truck8tAlpha1, truck8tAlpha2],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    expect(result.bestSolution!.metrics.vehicleCount).toBe(2);
    // Should select the two 8-tonne trucks achieving 87.5% payload utilization vs 70.0% for baseline
    expect(result.bestSolution!.metrics.payloadUtilizationPct).toBe(87.5);
    expect(result.bestSolution!.metrics.unusedPayloadCapacityGrams).toBe(2000000);
    expect(result.bestSolution!.selectedVehicleIds).toEqual(['veh-alpha-8t-1', 'veh-alpha-8t-2']);
    expect(result.baseline.metrics.payloadUtilizationPct).toBe(70.0);
    expect(result.baseline.metrics.unusedPayloadCapacityGrams).toBe(6000000);
  });

  // ===========================================================================
  // TEST 5: Optimizer never creates vehicles that do not exist
  // ===========================================================================
  it('TEST 5: Optimizer never creates vehicles that do not exist', () => {
    // 30,000 kg cargo, but only one 10,000 kg vehicle exists
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-massive',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 10000000, // 10t each
        quantity: 3,           // 30t total
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-insufficient-fleet',
      cargoItems,
      vehicles: [truck24ftAlpha], // Only 1 truck exists in physical fleet
    };

    const result = optimizer.optimize(input);

    // Cannot magically create trucks: allocation must fail
    expect(result.success).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('NO_FEASIBLE_FLEET');
    expect(result.baseline.unallocatedCargo.length).toBeGreaterThan(0);
  });

  // ===========================================================================
  // TEST 6: Optimizer cannot use another tenant's vehicle
  // ===========================================================================
  it("TEST 6: Optimizer cannot use another tenant's vehicle", async () => {
    const mockDbShipments: any[] = [
      {
        id: 'shp-alpha-tenant-check',
        organizationId: orgAlpha,
        shipmentNumber: 'SHP-ALPHA-CHECK',
        cargoItems: [
          {
            id: 'item-1',
            organizationId: orgAlpha,
            shipmentId: 'shp-alpha-tenant-check',
            description: 'Alpha Cargo',
            length: new Prisma.Decimal('100.00'),
            width: new Prisma.Decimal('100.00'),
            height: new Prisma.Decimal('100.00'),
            dimensionUnit: DimensionUnit.CM,
            unitWeight: new Prisma.Decimal('500.000'),
            totalWeight: new Prisma.Decimal('500.000'),
            weightUnit: WeightUnit.KG,
            quantity: 1,
            isStackable: true,
            isFragile: false,
            allowRotationHorizontal: true,
            allowRotationVertical: false,
            loadingPriority: 1,
            unloadingSequence: 1,
          },
        ],
        stops: [],
      },
    ];

    const mockDbVehicles: any[] = [
      {
        id: 'veh-beta-foreign',
        organizationId: orgBeta, // Belongs to Tenant Beta!
        registrationNumber: 'KA-01-BETA-888',
        status: 'ACTIVE',
        vehicleType: {
          id: 'vt-std',
          organizationId: null,
          name: 'Standard Box',
          internalLength: new Prisma.Decimal('600.00'),
          internalWidth: new Prisma.Decimal('240.00'),
          internalHeight: new Prisma.Decimal('240.00'),
          dimensionUnit: DimensionUnit.CM,
          maxPayload: new Prisma.Decimal('10000.000'),
          weightUnit: WeightUnit.KG,
          verificationStatus: 'VERIFIED',
        },
      },
    ];

    const mockPrisma: any = {
      shipment: {
        findFirst: jest.fn(async ({ where }: any) => {
          return mockDbShipments.find((s) => s.id === where.id && s.organizationId === where.organizationId) || null;
        }),
      },
      vehicle: {
        findFirst: jest.fn(async ({ where }: any) => {
          return mockDbVehicles.find((v) => v.id === where.id && v.organizationId === where.organizationId) || null;
        }),
      },
    };

    const serviceAlpha = new FleetOptimizationService(mockPrisma, orgAlpha);

    await expect(
      serviceAlpha.optimizeFleetForShipment({
        shipmentId: 'shp-alpha-tenant-check',
        vehicleIds: ['veh-beta-foreign'],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // ===========================================================================
  // TEST 7: Unavailable vehicles are excluded
  // ===========================================================================
  it('TEST 7: Unavailable vehicles are excluded', () => {
    const maintTruck: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-maint',
      status: 'MAINTENANCE',
      isAvailable: false,
    };

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-maint',
      cargoItems: [
        {
          cargoId: 'c1',
          lengthMm: 1000,
          widthMm: 1000,
          heightMm: 1000,
          weightGrams: 500000,
          quantity: 1,
        },
      ],
      vehicles: [maintTruck],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('NO_FEASIBLE_FLEET');
  });

  // ===========================================================================
  // TEST 8: DEPRECATED VehicleTypes are excluded
  // ===========================================================================
  it('TEST 8: DEPRECATED VehicleTypes are excluded', () => {
    const deprecatedTruck: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-depr',
      verificationStatus: 'DEPRECATED',
    };

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-depr',
      cargoItems: [
        {
          cargoId: 'c1',
          lengthMm: 1000,
          widthMm: 1000,
          heightMm: 1000,
          weightGrams: 500000,
          quantity: 1,
        },
      ],
      vehicles: [deprecatedTruck],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('NO_FEASIBLE_FLEET');
  });

  // ===========================================================================
  // TEST 9: Incomplete VehicleTypes are excluded
  // ===========================================================================
  it('TEST 9: Incomplete VehicleTypes are excluded', () => {
    const incompleteTruck: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-incomp',
      lengthMm: 0,
      widthMm: 0,
      heightMm: 0,
      isPackingCompatible: false,
    };

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-incomp',
      cargoItems: [
        {
          cargoId: 'c1',
          lengthMm: 1000,
          widthMm: 1000,
          heightMm: 1000,
          weightGrams: 500000,
          quantity: 1,
        },
      ],
      vehicles: [incompleteTruck],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('NO_FEASIBLE_FLEET');
  });

  // ===========================================================================
  // TEST 10: Physical packing feasibility is always validated
  // ===========================================================================
  it('TEST 10: Physical packing feasibility is always validated', () => {
    // 8m long box does not fit in 7.2m truck despite sufficient volume
    const longBox: CargoItemInput[] = [
      {
        cargoId: 'c-long',
        lengthMm: 8000,
        widthMm: 500,
        heightMm: 500,
        weightGrams: 500000,
        quantity: 1,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-geo-check',
      cargoItems: longBox,
      vehicles: [truck24ftAlpha], // 7.2m long
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('NO_FEASIBLE_FLEET');
  });

  // ===========================================================================
  // TEST 11: Payload capacity is respected
  // ===========================================================================
  it('TEST 11: Payload capacity is respected', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-payload',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 6000000, // 6t each
        quantity: 2,          // 12t total
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-payload',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2], // 10t each
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    for (const assignment of result.bestSolution!.vehicleAssignments) {
      expect(assignment.assignedCargoWeightGrams).toBeLessThanOrEqual(assignment.payloadCapacityGrams);
    }
  });

  // ===========================================================================
  // TEST 12: Physical cargo instances are never split
  // ===========================================================================
  it('TEST 12: Physical cargo instances are never split', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-indivisible',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 2000000,
        quantity: 5,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-atomic',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    const instanceIds = new Set<string>();

    for (const assignment of result.bestSolution!.vehicleAssignments) {
      for (const inst of assignment.assignedInstances) {
        expect(instanceIds.has(inst.instanceId)).toBe(false);
        instanceIds.add(inst.instanceId);
      }
    }

    expect(instanceIds.size).toBe(5);
  });

  // ===========================================================================
  // TEST 13: Rotation constraints remain intact
  // ===========================================================================
  it('TEST 13: Rotation constraints remain intact', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-upright',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1200,
        weightGrams: 500000,
        quantity: 1,
        allowRotationHorizontal: false,
        allowRotationVertical: false,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-rot',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    const placement = result.bestSolution!.vehicleAssignments[0].packingResult.placements[0];
    expect(placement.orientation).toBe('UPRIGHT_DEFAULT');
  });

  // ===========================================================================
  // TEST 14: Fragility/stackability constraints remain intact
  // ===========================================================================
  it('TEST 14: Fragility/stackability constraints remain intact', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-fragile',
        lengthMm: 1200,
        widthMm: 1200,
        heightMm: 1000,
        weightGrams: 300000,
        quantity: 1,
        isStackable: false,
        isFragile: true,
      },
      {
        cargoId: 'c-top-heavy',
        lengthMm: 1200,
        widthMm: 1200,
        heightMm: 1000,
        weightGrams: 800000,
        quantity: 1,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-fragile',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    const placements = result.bestSolution!.vehicleAssignments[0].packingResult.placements;
    const fragile = placements.find((p) => p.cargoId.includes('fragile'))!;
    const other = placements.find((p) => p.cargoId.includes('top-heavy'))!;

    // Fragile item on floor; other item not above fragile
    expect(fragile.zMm).toBe(0);
    const isAbove = other.zMm >= fragile.zMm + fragile.heightMm &&
      other.xMm < fragile.xMm + fragile.lengthMm &&
      other.yMm < fragile.yMm + fragile.widthMm;
    expect(isAbove).toBe(false);
  });

  // ===========================================================================
  // TEST 15: Same input produces exactly the same optimized result (Determinism)
  // ===========================================================================
  it('TEST 15: Same input produces exactly the same optimized result (Determinism)', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 1500000,
        quantity: 3,
      },
      {
        cargoId: 'c2',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 800,
        weightGrams: 800000,
        quantity: 4,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-det-opt',
      cargoItems,
      vehicles: [truck24ftAlpha, truck32ftAlpha, truck14ftAlpha],
    };

    const run1 = optimizer.optimize(input);
    const run2 = optimizer.optimize(input);

    expect(run1.success).toBe(run2.success);
    expect(run1.bestSolution!.selectedVehicleIds).toEqual(run2.bestSolution!.selectedVehicleIds);
    expect(run1.bestSolution!.metrics).toEqual(run2.bestSolution!.metrics);
    expect(run1.improvement).toEqual(run2.improvement);
  });

  // ===========================================================================
  // TEST 16: Lexicographic objective ordering works correctly
  // ===========================================================================
  it('TEST 16: Lexicographic objective ordering works correctly', () => {
    // Direct unit test of isBetter method
    const mockSol1Truck = {
      success: true,
      selectedVehicleIds: ['v1'],
      metrics: {
        vehicleCount: 1,
        payloadUtilizationPct: 50.0,
        volumeUtilizationPct: 40.0,
        unusedPayloadCapacityGrams: 5000000,
        unusedVolumeCapacityMm3: 20000000000,
      },
    } as any;

    const mockSol2Trucks = {
      success: true,
      selectedVehicleIds: ['v2', 'v3'],
      metrics: {
        vehicleCount: 2,
        payloadUtilizationPct: 95.0, // High utilization!
        volumeUtilizationPct: 90.0,
        unusedPayloadCapacityGrams: 500000,
        unusedVolumeCapacityMm3: 2000000000,
      },
    } as any;

    // 1 truck must beat 2 trucks strictly!
    expect(optimizer.isBetter(mockSol1Truck, mockSol2Trucks)).toBe(true);
    expect(optimizer.isBetter(mockSol2Trucks, mockSol1Truck)).toBe(false);

    // If both have 2 trucks, higher payload utilization wins
    const mockSol2TrucksB = {
      ...mockSol2Trucks,
      selectedVehicleIds: ['v4', 'v5'],
      metrics: {
        ...mockSol2Trucks.metrics,
        payloadUtilizationPct: 98.0,
      },
    };
    expect(optimizer.isBetter(mockSol2TrucksB, mockSol2Trucks)).toBe(true);
  });

  // ===========================================================================
  // TEST 17: Bounded search stops according to configured limits
  // ===========================================================================
  it('TEST 17: Bounded search stops according to configured limits', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 1000000,
        quantity: 2,
      },
    ];

    // Set a strict candidate solution limit of 1
    const input: FleetOptimizationInput = {
      shipmentId: 'shp-bounded',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2, truck32ftAlpha],
      options: {
        maxCandidateSolutions: 1,
      },
    };

    const result = optimizer.optimize(input);

    expect(result.searchStatistics.configurationsEvaluated).toBeLessThanOrEqual(2);
    expect(result.searchStatistics.terminationReason).toBe('CANDIDATE_LIMIT_EXCEEDED');
  });

  // ===========================================================================
  // TEST 18: When search is incomplete, result explicitly reports searchComplete=false
  // ===========================================================================
  it('TEST 18: When search is incomplete, result explicitly reports searchComplete=false', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 1000000,
        quantity: 2,
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-incomplete-search',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2, truck32ftAlpha],
      options: {
        maxExecutionTimeMs: 0, // Force instant timeout
      },
    };

    const result = optimizer.optimize(input);

    expect(result.searchStatistics.searchComplete).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('TIME_LIMIT_EXCEEDED');
    expect(result.optimalityGuarantee).toBe('BOUNDED_SEARCH_ONLY');
  });

  // ===========================================================================
  // TEST 19: When no feasible fleet exists, success=false and unallocated cargo is reported
  // ===========================================================================
  it('TEST 19: When no feasible fleet exists, success=false and unallocated cargo is reported', () => {
    // 50 tonnes of cargo, available fleet is only 10t
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-overload',
        description: 'Excess Steel',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 5000000, // 5t each
        quantity: 10,         // 50t total
      },
    ];

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-no-feasible',
      cargoItems,
      vehicles: [truck24ftAlpha], // 10t total capacity
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(false);
    expect(result.searchStatistics.terminationReason).toBe('NO_FEASIBLE_FLEET');
    expect(result.baseline.unallocatedCargo.length).toBeGreaterThan(0);
  });

  // ===========================================================================
  // TEST 20: Improvement metrics are mathematically correct
  // ===========================================================================
  it('TEST 20: Improvement metrics are mathematically correct', () => {
    // Total cargo: 14,000 kg across 7 boxes
    // Baseline: chooses [Truck A1 (10t), Truck A2 (10t)] -> 70.0% payload utilization, 6,000 kg unused payload
    // Optimized: chooses [Truck B1 (8t), Truck B2 (8t)] -> 87.5% payload utilization, 2,000 kg unused payload
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 2000000, // 2t each
        quantity: 7,          // 14t total
      },
    ];

    const truck8tAlpha1: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-truck-8t-1',
      vehicleId: 'veh-alpha-8t-1',
      maxPayloadGrams: 8000000,
    };

    const truck8tAlpha2: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-truck-8t-2',
      vehicleId: 'veh-alpha-8t-2',
      maxPayloadGrams: 8000000,
    };

    const input: FleetOptimizationInput = {
      shipmentId: 'shp-improvement',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2, truck8tAlpha1, truck8tAlpha2],
    };

    const result = optimizer.optimize(input);

    expect(result.success).toBe(true);
    expect(result.bestSolution).not.toBeNull();
    expect(result.bestSolution!.metrics.vehicleCount).toBe(2);
    expect(result.baseline.metrics.vehicleCount).toBe(2);

    // Improvements must match exact mathematical differences
    expect(result.improvement.vehiclesSaved).toBe(0);
    expect(result.improvement.payloadUtilizationDeltaPct).toBe(17.5); // 87.5 - 70.0 = 17.5
    expect(result.improvement.unusedPayloadReductionGrams).toBe(4000000); // 6,000,000 - 2,000,000 = 4,000,000g
    expect(result.improvement.unusedPayloadReductionGrams).toBe(
      result.baseline.metrics.unusedPayloadCapacityGrams - result.bestSolution!.metrics.unusedPayloadCapacityGrams,
    );
    expect(result.improvement.volumeUtilizationDeltaPct).toBe(
      Math.round(
        (result.bestSolution!.metrics.volumeUtilizationPct - result.baseline.metrics.volumeUtilizationPct) * 100,
      ) / 100,
    );
    expect(result.improvement.unusedVolumeReductionMm3).toBe(
      result.baseline.metrics.unusedVolumeCapacityMm3 - result.bestSolution!.metrics.unusedVolumeCapacityMm3,
    );
  });

  // ===========================================================================
  // TEST 21: Persistence uses existing OptimizationRun/LoadPlan structures correctly
  // ===========================================================================
  it('TEST 21: Persistence uses existing OptimizationRun/LoadPlan structures correctly', async () => {
    const mockDbShipments: any[] = [
      {
        id: 'shp-alpha-persist',
        organizationId: orgAlpha,
        shipmentNumber: 'SHP-ALPHA-PERSIST',
        cargoItems: [
          {
            id: 'cargo-p1',
            organizationId: orgAlpha,
            shipmentId: 'shp-alpha-persist',
            description: 'Pallet P1',
            length: new Prisma.Decimal('120.00'),
            width: new Prisma.Decimal('80.00'),
            height: new Prisma.Decimal('100.00'),
            dimensionUnit: DimensionUnit.CM,
            unitWeight: new Prisma.Decimal('500.000'),
            totalWeight: new Prisma.Decimal('500.000'),
            weightUnit: WeightUnit.KG,
            quantity: 1,
            isStackable: true,
            isFragile: false,
            allowRotationHorizontal: true,
            allowRotationVertical: false,
            loadingPriority: 1,
            unloadingSequence: 1,
          },
        ],
        stops: [],
      },
    ];

    let createdRun: any = null;

    const mockPrisma: any = {
      shipment: {
        findFirst: jest.fn(async ({ where }: any) => {
          return mockDbShipments.find((s) => s.id === where.id && s.organizationId === where.organizationId) || null;
        }),
      },
      vehicleType: {
        findFirst: jest.fn(async ({ where }: any) => {
          return {
            id: 'vt-std',
            organizationId: null,
            name: 'Standard Box',
            internalLength: new Prisma.Decimal('600.00'),
            internalWidth: new Prisma.Decimal('240.00'),
            internalHeight: new Prisma.Decimal('240.00'),
            dimensionUnit: DimensionUnit.CM,
            maxPayload: new Prisma.Decimal('10000.000'),
            weightUnit: WeightUnit.KG,
            verificationStatus: 'VERIFIED',
          };
        }),
      },
      optimizationRun: {
        create: jest.fn(async ({ data }: any) => {
          createdRun = {
            id: 'opt-run-123',
            ...data,
            loadPlans: data.loadPlans.create.map((lp: any, idx: number) => ({
              id: `lp-${idx + 1}`,
              optimizationRunId: 'opt-run-123',
              ...lp,
            })),
          };
          return createdRun;
        }),
      },
    };

    const serviceAlpha = new FleetOptimizationService(mockPrisma, orgAlpha);

    const response = await serviceAlpha.optimizeFleetForShipment({
      shipmentId: 'shp-alpha-persist',
      vehicleTypeIds: ['vt-std'],
      persistOptimizationRun: true,
      scenarioName: 'Production Test Scenario',
    });

    expect(response.success).toBe(true);
    expect(response.optimizationRunId).toBe('opt-run-123');
    expect(createdRun).not.toBeNull();
    expect(createdRun.scenarioName).toBe('Production Test Scenario');
    expect(createdRun.status).toBe(OptimizationStatus.COMPLETED);
    expect(createdRun.loadPlans).toHaveLength(1);
  });

  // ===========================================================================
  // TEST 22: No production hardcoded vehicle data exists
  // ===========================================================================
  it('TEST 22: No production hardcoded vehicle data exists', () => {
    const forbiddenPatterns = [
      /\bTata\s+Motors\b/i,
      /\bAshok\s+Leyland\b/i,
      /\bBharatBenz\b/i,
      /\bEicher\b/i,
      /\bMahindra\s+Bolero\b/i,
      /\bTata\s+Ace\b/i,
      /\bSigna\s+4825\b/i,
      /\bEcomet\s+1615\b/i,
    ];

    const productionFiles = [
      path.resolve(__dirname, '../domain/optimization/FleetOptimizationEngine.ts'),
      path.resolve(__dirname, '../domain/optimization/types.ts'),
      path.resolve(__dirname, '../application/FleetOptimizationService.ts'),
      path.resolve(__dirname, '../domain/allocation/FleetAllocationEngine.ts'),
      path.resolve(__dirname, '../application/FleetAllocationService.ts'),
      path.resolve(__dirname, '../application/VehicleMasterService.ts'),
      path.resolve(__dirname, '../infrastructure/logistics.repository.ts'),
    ];

    for (const filePath of productionFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Strip comments
        const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(codeWithoutComments)).toBe(false);
        }
      }
    }
  });
});
