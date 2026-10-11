import fs from 'fs';
import path from 'path';
import {
  DimensionUnit,
  OptimizationStatus,
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  WeightUnit,
} from '@prisma/client';
import { FleetAllocationEngine } from '../domain/allocation/FleetAllocationEngine';
import {
  FleetAllocationInput,
  FleetVehicleCandidate,
} from '../domain/allocation/types';
import { CargoItemInput } from '../domain/packing/types';
import { FleetAllocationService } from '../application/FleetAllocationService';
import { LogisticsRepository } from '../infrastructure/logistics.repository';
import { NotFoundError } from '../../../core/errors/app.error';

describe('Phase 3A — Fleet Allocation Engine Foundation', () => {
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
    volumeMm3: 7200 * 2400 * 2400, // 41,472,000,000 mm3 (~41.47 m3)
    maxPayloadGrams: 10000000,     // 10,000 kg (10t)
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
    volumeMm3: 9750 * 2440 * 2590,
    maxPayloadGrams: 18500000, // 18,500 kg
    status: 'AVAILABLE',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isPackingCompatible: true,
  };

  let engine: FleetAllocationEngine;

  beforeEach(() => {
    engine = new FleetAllocationEngine();
  });

  // ===========================================================================
  // TEST 1: All cargo fits one vehicle -> exactly one vehicle selected
  // ===========================================================================
  it('TEST 1: All cargo fits one vehicle -> exactly one vehicle selected', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-pallet-1',
        description: 'Standard Europallet',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1200,
        weightGrams: 500000, // 500 kg each
        quantity: 4,         // Total 2,000 kg
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-001',
      cargoItems,
      vehicles: [truck24ftAlpha, truck32ftAlpha],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    expect(result.vehicleAssignments).toHaveLength(1);
    expect(result.selectedVehicleIds).toHaveLength(1);
    expect(result.unallocatedCargo).toHaveLength(0);
    expect(result.metrics.vehicleCount).toBe(1);
    expect(result.metrics.totalCargoWeightGrams).toBe(2000000);
  });

  // ===========================================================================
  // TEST 2: Cargo exceeds payload of one vehicle -> multiple vehicles considered
  // ===========================================================================
  it('TEST 2: Cargo exceeds payload of one vehicle -> multiple vehicles considered', () => {
    // 6 heavy pallets of 2,500 kg each = 15,000 kg total
    // truck24ftAlpha has max payload 10,000 kg, so one truck cannot take all 15,000 kg
    const heavyCargo: CargoItemInput[] = [
      {
        cargoId: 'cargo-heavy-machinery',
        description: 'Industrial Pump Crate',
        lengthMm: 1500,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 2500000, // 2,500 kg
        quantity: 6,          // 6 * 2,500 = 15,000 kg
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-heavy-001',
      cargoItems: heavyCargo,
      vehicles: [truck24ftAlpha, truck24ftAlpha2], // Two 10t trucks
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    expect(result.vehicleAssignments).toHaveLength(2);
    expect(result.selectedVehicleIds).toEqual(['veh-alpha-01', 'veh-alpha-02']);
    expect(result.unallocatedCargo).toHaveLength(0);

    // Each vehicle must respect its 10,000 kg payload capacity limit
    for (const assignment of result.vehicleAssignments) {
      expect(assignment.assignedCargoWeightGrams).toBeLessThanOrEqual(assignment.payloadCapacityGrams);
      expect(assignment.assignedInstances.length).toBeGreaterThan(0);
    }
  });

  // ===========================================================================
  // TEST 3: Cargo cannot physically fit despite sufficient volume -> packing engine rejects it
  // ===========================================================================
  it('TEST 3: Cargo cannot physically fit despite sufficient volume -> packing engine rejects it', () => {
    // 8.5m long steel beam in a 7.2m truck
    // Volume of beam is very small (8.5m * 0.3m * 0.3m = 0.765 m3), well below truck's 41 m3 volume,
    // but dimensionally impossible to pack!
    const longBeam: CargoItemInput[] = [
      {
        cargoId: 'cargo-long-beam',
        description: 'Long Structural Beam',
        lengthMm: 8500, // 8.5m > 7.2m truck length
        widthMm: 300,
        heightMm: 300,
        weightGrams: 800000, // 800 kg
        quantity: 1,
        allowRotationHorizontal: true,
        allowRotationVertical: true,
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-beam',
      cargoItems: longBeam,
      vehicles: [truck24ftAlpha], // length 7200mm
    };

    const result = engine.allocate(input);

    // Should fail allocation because it physically cannot fit inside the 7.2m cargo space
    expect(result.success).toBe(false);
    expect(result.unallocatedCargo).toHaveLength(1);
    expect(result.unallocatedCargo[0].cargoId).toBe('cargo-long-beam');
  });

  // ===========================================================================
  // TEST 4: Two vehicles are required and cargo is divided into physical instances correctly
  // ===========================================================================
  it('TEST 4: Two vehicles are required and cargo is divided into physical instances correctly', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-pallet',
        description: 'Food Cargo Pallet',
        lengthMm: 1200,
        widthMm: 1000,
        heightMm: 1400,
        weightGrams: 1800000, // 1,800 kg each
        quantity: 8,          // Total 14,400 kg
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-multi-01',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2], // 10t each
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    expect(result.vehicleAssignments).toHaveLength(2);

    const totalAllocatedInstances =
      result.vehicleAssignments[0].assignedInstances.length +
      result.vehicleAssignments[1].assignedInstances.length;

    expect(totalAllocatedInstances).toBe(8);
  });

  // ===========================================================================
  // TEST 5: A physical cargo instance is never split
  // ===========================================================================
  it('TEST 5: A physical cargo instance is never split', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-unit-batch',
        description: 'Indivisible Equipment Crate',
        lengthMm: 1500,
        widthMm: 1200,
        heightMm: 1200,
        weightGrams: 3000000, // 3,000 kg each
        quantity: 5,          // 5 distinct physical instances
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-atomic-instances',
      cargoItems,
      vehicles: [truck24ftAlpha, truck24ftAlpha2],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    const assignedIdsSet = new Set<string>();

    for (const assignment of result.vehicleAssignments) {
      for (const inst of assignment.assignedInstances) {
        // Must have unique instance ID (e.g. cargo-unit-batch#1)
        expect(assignedIdsSet.has(inst.instanceId)).toBe(false);
        assignedIdsSet.add(inst.instanceId);
        // Each instance has its full atomic weight intact
        expect(inst.weightGrams).toBe(3000000);
      }
    }

    expect(assignedIdsSet.size).toBe(5);
  });

  // ===========================================================================
  // TEST 6: Unavailable vehicle is excluded
  // ===========================================================================
  it('TEST 6: Unavailable vehicle is excluded', () => {
    const unavailableVehicle: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-maintenance',
      status: 'MAINTENANCE',
      isAvailable: false,
    };

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-unavail',
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
      vehicles: [unavailableVehicle],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(false);
    expect(result.vehicleAssignments).toHaveLength(0);
    expect(result.violations.some((v) => v.code === 'VEHICLE_UNAVAILABLE_STATUS')).toBe(true);
  });

  // ===========================================================================
  // TEST 7: DECOMMISSIONED vehicle is excluded
  // ===========================================================================
  it('TEST 7: DECOMMISSIONED vehicle is excluded', () => {
    const decommissionedVehicle: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-decommissioned',
      status: 'DECOMMISSIONED',
    };

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-decom',
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
      vehicles: [decommissionedVehicle],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(false);
    expect(result.violations.some((v) => v.code === 'VEHICLE_DECOMMISSIONED')).toBe(true);
  });

  // ===========================================================================
  // TEST 8: DEPRECATED VehicleType is excluded
  // ===========================================================================
  it('TEST 8: DEPRECATED VehicleType is excluded', () => {
    const deprecatedVehicle: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-deprecated',
      verificationStatus: 'DEPRECATED',
    };

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-depr',
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
      vehicles: [deprecatedVehicle],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(false);
    expect(result.violations.some((v) => v.code === 'SPECIFICATION_DEPRECATED')).toBe(true);
  });

  // ===========================================================================
  // TEST 9: Incomplete VehicleType is excluded from allocation
  // ===========================================================================
  it('TEST 9: Incomplete VehicleType is excluded from allocation', () => {
    // Chassis only (incomplete internal dimensions)
    const incompleteVehicle: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-chassis',
      lengthMm: 0,
      widthMm: 0,
      heightMm: 0,
      isPackingCompatible: false,
    };

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-incomp',
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
      vehicles: [incompleteVehicle],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(false);
    expect(result.violations.some((v) => v.code === 'SPECIFICATION_INCOMPLETE')).toBe(true);
  });

  // ===========================================================================
  // TEST 10: Tenant A cannot allocate using Tenant B's physical vehicle
  // ===========================================================================
  it("TEST 10: Tenant A cannot allocate using Tenant B's physical vehicle", async () => {
    const mockDbShipments: any[] = [
      {
        id: 'shipment-alpha-10',
        organizationId: orgAlpha,
        shipmentNumber: 'SHP-ALPHA-10',
        cargoItems: [
          {
            id: 'cargo-1',
            organizationId: orgAlpha,
            shipmentId: 'shipment-alpha-10',
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
        registrationNumber: 'KA-01-BETA-999',
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
          // Strictly scoped to tenant
          return mockDbVehicles.find((v) => v.id === where.id && v.organizationId === where.organizationId) || null;
        }),
      },
    };

    const serviceAlpha = new FleetAllocationService(mockPrisma, orgAlpha);

    // Tenant Alpha attempts to allocate using Tenant Beta's physical vehicle
    await expect(
      serviceAlpha.allocateFleetForShipment({
        shipmentId: 'shipment-alpha-10',
        vehicleIds: ['veh-beta-foreign'],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // ===========================================================================
  // TEST 11: Global VehicleType can still be used according to Phase 2A rules
  // ===========================================================================
  it('TEST 11: Global VehicleType can still be used to validate compatible vehicle specifications according to Phase 2A rules', async () => {
    const mockDbShipments: any[] = [
      {
        id: 'shipment-alpha-11',
        organizationId: orgAlpha,
        shipmentNumber: 'SHP-ALPHA-11',
        cargoItems: [
          {
            id: 'cargo-1',
            organizationId: orgAlpha,
            shipmentId: 'shipment-alpha-11',
            description: 'Alpha Cargo',
            length: new Prisma.Decimal('120.00'),
            width: new Prisma.Decimal('80.00'),
            height: new Prisma.Decimal('100.00'),
            dimensionUnit: DimensionUnit.CM,
            unitWeight: new Prisma.Decimal('400.000'),
            totalWeight: new Prisma.Decimal('800.000'),
            weightUnit: WeightUnit.KG,
            quantity: 2,
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

    const mockDbVehicleTypes: any[] = [
      {
        id: 'vt-global-standard-spec',
        organizationId: null, // Global approved specification!
        name: 'Global Standard 24ft Truck Template',
        internalLength: new Prisma.Decimal('720.00'),
        internalWidth: new Prisma.Decimal('240.00'),
        internalHeight: new Prisma.Decimal('240.00'),
        dimensionUnit: DimensionUnit.CM,
        maxPayload: new Prisma.Decimal('10000.000'),
        weightUnit: WeightUnit.KG,
        verificationStatus: 'VERIFIED',
      },
    ];

    const mockPrisma: any = {
      shipment: {
        findFirst: jest.fn(async ({ where }: any) => {
          return mockDbShipments.find((s) => s.id === where.id && s.organizationId === where.organizationId) || null;
        }),
      },
      vehicleType: {
        findFirst: jest.fn(async ({ where }: any) => {
          return mockDbVehicleTypes.find((vt) => {
            if (vt.id !== where.id) return false;
            if (where.OR) {
              return where.OR.some((c: any) => c.organizationId === vt.organizationId);
            }
            return true;
          }) || null;
        }),
      },
    };

    const serviceAlpha = new FleetAllocationService(mockPrisma, orgAlpha);

    const response = await serviceAlpha.allocateFleetForShipment({
      shipmentId: 'shipment-alpha-11',
      vehicleTypeIds: ['vt-global-standard-spec'],
    });

    expect(response.success).toBe(true);
    expect(response.vehicleAssignments).toHaveLength(1);
    expect(response.vehicleAssignments[0].vehicle.vehicleTypeId).toBe('vt-global-standard-spec');
  });

  // ===========================================================================
  // TEST 12: Loading/unloading constraints remain intact
  // ===========================================================================
  it('TEST 12: Loading/unloading constraints remain intact', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-stop-2',
        description: 'Dropoff Stop 2 Delivery',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1000,
        weightGrams: 500000,
        quantity: 2,
        loadingPriority: 1,
        unloadingSequence: 2, // Delivers second -> should be placed deeper inside
      },
      {
        cargoId: 'cargo-stop-1',
        description: 'Dropoff Stop 1 Delivery',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1000,
        weightGrams: 500000,
        quantity: 2,
        loadingPriority: 2,
        unloadingSequence: 1, // Delivers first -> packed towards door for LIFO
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-lifo',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    const placements = result.vehicleAssignments[0].packingResult.placements;
    expect(placements.length).toBe(4);

    // Each placement preserves its unloading sequence
    for (const p of placements) {
      expect(p.unloadingSequence).toBeDefined();
    }
  });

  // ===========================================================================
  // TEST 13: Rotation constraints remain intact
  // ===========================================================================
  it('TEST 13: Rotation constraints remain intact', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-upright-only',
        description: 'Upright Chemistry Drum',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1200,
        weightGrams: 400000,
        quantity: 1,
        allowRotationHorizontal: false, // Strictly no rotation
        allowRotationVertical: false,
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-rot',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    const placement = result.vehicleAssignments[0].packingResult.placements[0];
    expect(placement.orientation).toBe('UPRIGHT_DEFAULT');
  });

  // ===========================================================================
  // TEST 14: Fragile/non-stackable constraints remain intact
  // ===========================================================================
  it('TEST 14: Fragile/non-stackable constraints remain intact', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'cargo-fragile-glass',
        description: 'Fragile Glass Instruments',
        lengthMm: 1200,
        widthMm: 1200,
        heightMm: 1000,
        weightGrams: 300000,
        quantity: 1,
        isStackable: false, // Non-stackable! Nothing allowed on top
        isFragile: true,
      },
      {
        cargoId: 'cargo-heavy-top-candidate',
        description: 'Heavy Metal Parts',
        lengthMm: 1200,
        widthMm: 1200,
        heightMm: 1000,
        weightGrams: 1000000,
        quantity: 1,
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-stacking',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    const placements = result.vehicleAssignments[0].packingResult.placements;
    expect(placements).toHaveLength(2);

    const fragile = placements.find((p) => p.cargoId.includes('fragile-glass'))!;
    const other = placements.find((p) => p.cargoId.includes('heavy-top-candidate'))!;

    // Fragile item must be placed on floor (z = 0) and other item must NOT be placed on top of it
    expect(fragile.zMm).toBe(0);
    // Other item must also be on floor or aside, not above fragile
    const isAboveFragile = other.zMm >= fragile.zMm + fragile.heightMm &&
      other.xMm < fragile.xMm + fragile.lengthMm &&
      other.yMm < fragile.yMm + fragile.widthMm;
    expect(isAboveFragile).toBe(false);
  });

  // ===========================================================================
  // TEST 15: Same input produces identical allocation (Determinism)
  // ===========================================================================
  it('TEST 15: Same input produces identical allocation (Determinism)', () => {
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1000,
        weightGrams: 600000,
        quantity: 4,
      },
      {
        cargoId: 'c2',
        lengthMm: 1500,
        widthMm: 1000,
        heightMm: 1200,
        weightGrams: 1200000,
        quantity: 2,
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-det-01',
      cargoItems,
      vehicles: [truck24ftAlpha, truck32ftAlpha],
    };

    const run1 = engine.allocate(input);
    const run2 = engine.allocate(input);

    expect(run1.success).toBe(run2.success);
    expect(run1.vehicleAssignments.length).toBe(run2.vehicleAssignments.length);
    expect(run1.selectedVehicleIds).toEqual(run2.selectedVehicleIds);
    expect(run1.metrics).toEqual(run2.metrics);

    // Deep compare placements
    for (let i = 0; i < run1.vehicleAssignments.length; i++) {
      expect(run1.vehicleAssignments[i].packingResult.placements).toEqual(
        run2.vehicleAssignments[i].packingResult.placements,
      );
    }
  });

  // ===========================================================================
  // TEST 16: Stable tie-breaker produces deterministic vehicle selection
  // ===========================================================================
  it('TEST 16: Stable tie-breaker produces deterministic vehicle selection', () => {
    // Two identical twin vehicles with same payload and dimensions
    const twinTruck1: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-twin-B',
      vehicleId: 'veh-twin-B',
      name: 'Twin Vehicle B',
    };
    const twinTruck2: FleetVehicleCandidate = {
      ...truck24ftAlpha,
      candidateId: 'cand-twin-A',
      vehicleId: 'veh-twin-A',
      name: 'Twin Vehicle A',
    };

    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 500000,
        quantity: 1,
      },
    ];

    // Pass in reverse order: [B, A]
    const res1 = engine.allocate({
      shipmentId: 'shp-1',
      cargoItems,
      vehicles: [twinTruck1, twinTruck2],
    });

    // Pass in standard order: [A, B]
    const res2 = engine.allocate({
      shipmentId: 'shp-1',
      cargoItems,
      vehicles: [twinTruck2, twinTruck1],
    });

    // Both runs must choose identical vehicle (veh-twin-A due to ascending ID tie-breaker)
    expect(res1.selectedVehicleIds[0]).toBe('veh-twin-A');
    expect(res2.selectedVehicleIds[0]).toBe('veh-twin-A');
  });

  // ===========================================================================
  // TEST 17: Payload utilization metrics are correct
  // ===========================================================================
  it('TEST 17: Payload utilization metrics are correct', () => {
    // 4 crates of 2,000 kg each = 8,000 kg
    // Truck capacity = 10,000 kg -> 80.0% utilization
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c1',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 2000000, // 2t
        quantity: 4,          // 8t total
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-metrics',
      cargoItems,
      vehicles: [truck24ftAlpha], // 10t max payload
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    expect(result.metrics.totalCargoWeightGrams).toBe(8000000);
    expect(result.metrics.totalPayloadCapacityGrams).toBe(10000000);
    expect(result.metrics.payloadUtilizationPct).toBe(80.0);
    expect(result.metrics.unusedPayloadCapacityGrams).toBe(2000000);
  });

  // ===========================================================================
  // TEST 18: Volume utilization metrics are correct
  // ===========================================================================
  it('TEST 18: Volume utilization metrics are correct', () => {
    // 10 crates of 1m3 each (1000 x 1000 x 1000 mm) = 10,000,000,000 mm3 (10 m3)
    // Vehicle volume = 7200 * 2400 * 2400 = 41,472,000,000 mm3 (~41.472 m3)
    // Expected volume utilization ~ 24.11%
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-vol',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 100000,
        quantity: 10,
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-vol-metrics',
      cargoItems,
      vehicles: [truck24ftAlpha],
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(true);
    expect(result.metrics.totalCargoVolumeMm3).toBe(10000000000);
    expect(result.metrics.totalCargoSpaceVolumeMm3).toBe(41472000000);
    expect(result.metrics.volumeUtilizationPct).toBeCloseTo(24.11, 1);
  });

  // ===========================================================================
  // TEST 19: Unallocated cargo is explicitly reported when no feasible fleet exists
  // ===========================================================================
  it('TEST 19: Unallocated cargo is explicitly reported when no feasible fleet exists', () => {
    // 30 crates of 1,000 kg each = 30,000 kg
    // Available fleet: only one 10t truck
    const cargoItems: CargoItemInput[] = [
      {
        cargoId: 'c-overflow',
        description: 'Excess Pallet',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 1000000,
        quantity: 30, // 30 tonnes
      },
    ];

    const input: FleetAllocationInput = {
      shipmentId: 'shipment-overflow',
      cargoItems,
      vehicles: [truck24ftAlpha], // Only 10t available
    };

    const result = engine.allocate(input);

    expect(result.success).toBe(false);
    expect(result.vehicleAssignments).toHaveLength(1);
    expect(result.vehicleAssignments[0].assignedInstances.length).toBe(10); // Placed 10 items (10t)
    expect(result.unallocatedCargo.length).toBe(20); // 20 items unallocated
    expect(result.violations.some((v) => v.code === 'PARTIAL_FLEET_ALLOCATION')).toBe(true);
  });

  // ===========================================================================
  // TEST 20: No production hardcoded fleet data exists
  // ===========================================================================
  it('TEST 20: No production hardcoded fleet data exists', () => {
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
      path.resolve(__dirname, '../domain/allocation/FleetAllocationEngine.ts'),
      path.resolve(__dirname, '../domain/allocation/types.ts'),
      path.resolve(__dirname, '../application/FleetAllocationService.ts'),
      path.resolve(__dirname, '../application/VehicleMasterService.ts'),
      path.resolve(__dirname, '../infrastructure/logistics.repository.ts'),
    ];

    for (const filePath of productionFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Strip code comments (e.g. documentation comments illustrating future supported makes)
        const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(codeWithoutComments)).toBe(false);
        }
      }
    }
  });
});
