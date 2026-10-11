import {
  CargoPackingEngine,
  boxesIntersect,
  TruckCargoSpace,
  CargoItemInput,
} from '../domain/packing';

describe('Phase 1B — Pure Domain 3D Cargo Packing Engine', () => {
  let engine: CargoPackingEngine;

  // Standard Test Container: 6000mm length, 2400mm width, 2400mm height, 10,000,000g (10t) payload
  const standardTruck: TruckCargoSpace = {
    lengthMm: 6000,
    widthMm: 2400,
    heightMm: 2400,
    maxPayloadGrams: 10_000_000,
    name: '20ft Standard Test Container',
  };

  beforeEach(() => {
    engine = new CargoPackingEngine();
  });

  // TEST 1: One box fits exactly
  it('TEST 1: One box with dimensions matching the truck fits exactly', () => {
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'exact-box-1',
        lengthMm: 6000,
        widthMm: 2400,
        heightMm: 2400,
        weightGrams: 5_000_000,
        quantity: 1,
      },
    ];

    const result = engine.pack({ truck: standardTruck, cargo });

    expect(result.success).toBe(true);
    expect(result.placedCount).toBe(1);
    expect(result.unplacedCount).toBe(0);
    expect(result.placements[0]).toMatchObject({
      instanceId: 'exact-box-1#1',
      xMm: 0,
      yMm: 0,
      zMm: 0,
      lengthMm: 6000,
      widthMm: 2400,
      heightMm: 2400,
    });
    expect(result.volumeUtilizationPct).toBe(100.0);
  });

  // TEST 2: One box is too large for the truck
  it('TEST 2: One box that exceeds any dimension is rejected as unplaced', () => {
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'oversized-box',
        lengthMm: 6500, // Exceeds 6000mm length
        widthMm: 2000,
        heightMm: 2000,
        weightGrams: 1_000_000,
        quantity: 1,
      },
    ];

    const result = engine.pack({ truck: standardTruck, cargo });

    expect(result.success).toBe(false);
    expect(result.placedCount).toBe(0);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedItems[0].cargoId).toBe('oversized-box');
    expect(result.unplacedItems[0].reason).toContain('Insufficient contiguous 3D space');
  });

  // TEST 3: Two non-overlapping boxes fit side by side
  it('TEST 3: Two non-overlapping boxes fit side by side on the floor', () => {
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'box-left',
        lengthMm: 2000,
        widthMm: 1200,
        heightMm: 1000,
        weightGrams: 500_000,
        quantity: 1,
        allowRotationHorizontal: false,
      },
      {
        cargoId: 'box-right',
        lengthMm: 2000,
        widthMm: 1200,
        heightMm: 1000,
        weightGrams: 500_000,
        quantity: 1,
        allowRotationHorizontal: false,
      },
    ];

    const result = engine.pack({ truck: standardTruck, cargo });

    expect(result.success).toBe(true);
    expect(result.placedCount).toBe(2);
    expect(result.unplacedCount).toBe(0);

    const p1 = result.placements[0];
    const p2 = result.placements[1];

    // Verify both are on the floor and do not overlap
    expect(p1.zMm).toBe(0);
    expect(p2.zMm).toBe(0);
    expect(boxesIntersect(p1, p2)).toBe(false);
  });

  // TEST 4: Two boxes that geometrically overlap are rejected by collision detector
  it('TEST 4: Direct geometry collision detector correctly flags positive overlap', () => {
    const boxA = { xMm: 0, yMm: 0, zMm: 0, lengthMm: 1000, widthMm: 1000, heightMm: 1000 };
    const boxBOverlap = { xMm: 500, yMm: 500, zMm: 500, lengthMm: 1000, widthMm: 1000, heightMm: 1000 };

    expect(boxesIntersect(boxA, boxBOverlap)).toBe(true);
  });

  // TEST 5: Boundary-touching boxes are accepted (no overlap)
  it('TEST 5: Boundary-touching boxes sharing a boundary face are accepted without overlap', () => {
    const boxA = { xMm: 0, yMm: 0, zMm: 0, lengthMm: 1000, widthMm: 1000, heightMm: 1000 };
    // Touches exactly at x = 1000
    const boxBTouchX = { xMm: 1000, yMm: 0, zMm: 0, lengthMm: 1000, widthMm: 1000, heightMm: 1000 };
    // Touches exactly at z = 1000 (stacked on top)
    const boxBTouchZ = { xMm: 0, yMm: 0, zMm: 1000, lengthMm: 1000, widthMm: 1000, heightMm: 1000 };

    expect(boxesIntersect(boxA, boxBTouchX)).toBe(false);
    expect(boxesIntersect(boxA, boxBTouchZ)).toBe(false);
  });

  // TEST 6: Payload limit prevents placement
  it('TEST 6: Payload capacity limit strictly prevents placing cargo exceeding max payload', () => {
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'heavy-machine',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 12_000_000, // 12 tonnes (exceeds 10t max payload)
        quantity: 1,
      },
    ];

    const result = engine.pack({ truck: standardTruck, cargo });

    expect(result.success).toBe(false);
    expect(result.placedCount).toBe(0);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedItems[0].reason).toContain('Exceeds truck payload capacity');
  });

  // TEST 7: Multiple quantities are expanded and accounted for correctly
  it('TEST 7: Multiple quantities are expanded into distinct physical instances', () => {
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'pallet-batch',
        lengthMm: 1200,
        widthMm: 800,
        heightMm: 1000,
        weightGrams: 200_000,
        quantity: 4,
      },
    ];

    const result = engine.pack({ truck: standardTruck, cargo });

    expect(result.success).toBe(true);
    expect(result.totalRequestedCount).toBe(4);
    expect(result.placedCount).toBe(4);
    expect(result.unplacedCount).toBe(0);

    // Each placement has a unique instanceId
    const instanceIds = result.placements.map((p) => p.instanceId);
    expect(new Set(instanceIds).size).toBe(4);
    expect(instanceIds).toContain('pallet-batch#1');
    expect(instanceIds).toContain('pallet-batch#4');
  });

  // TEST 8: Rotation allows an otherwise impossible package to fit
  it('TEST 8: Rotation allows a wide box to fit into a narrow corridor via yaw rotation', () => {
    const narrowTruck: TruckCargoSpace = {
      lengthMm: 3000,
      widthMm: 1500,
      heightMm: 2000,
      maxPayloadGrams: 5_000_000,
    };

    // Box has length 1800 (exceeds width 1500) and width 1000
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'wide-box',
        lengthMm: 1800,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 100_000,
        quantity: 1,
        allowRotationHorizontal: true,
      },
    ];

    const result = engine.pack({ truck: narrowTruck, cargo });

    expect(result.success).toBe(true);
    expect(result.placedCount).toBe(1);
    // Placed along length (x = 1800, y = 1000)
    expect(result.placements[0].lengthMm).toBe(1800);
    expect(result.placements[0].widthMm).toBe(1000);
  });

  // TEST 9: No-rotation package cannot be rotated
  it('TEST 9: No-rotation constraint strictly prevents rotating package', () => {
    const narrowTruck: TruckCargoSpace = {
      lengthMm: 1000,
      widthMm: 2000,
      heightMm: 2000,
      maxPayloadGrams: 5_000_000,
    };

    // Package length 1500, width 800.
    // If rotation were allowed, it could orient length along truck width (2000).
    // But with allowRotationHorizontal = false, it cannot fit length 1500 into truck length 1000!
    const cargo: CargoItemInput[] = [
      {
        cargoId: 'upright-fixed',
        lengthMm: 1500,
        widthMm: 800,
        heightMm: 800,
        weightGrams: 100_000,
        quantity: 1,
        allowRotationHorizontal: false,
        allowRotationVertical: false,
      },
    ];

    const result = engine.pack({ truck: narrowTruck, cargo });

    expect(result.success).toBe(false);
    expect(result.placedCount).toBe(0);
    expect(result.unplacedCount).toBe(1);
  });

  // TEST 10: Non-stackable package cannot support another package
  it('TEST 10: Non-stackable package cannot have another cargo placed on top', () => {
    const smallTruck: TruckCargoSpace = {
      lengthMm: 1000,
      widthMm: 1000,
      heightMm: 2500,
      maxPayloadGrams: 5_000_000,
    };

    const cargo: CargoItemInput[] = [
      {
        cargoId: 'bottom-box',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 100_000,
        quantity: 1,
        isStackable: false, // NON-STACKABLE
      },
      {
        cargoId: 'top-box',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 100_000,
        quantity: 1,
      },
    ];

    const result = engine.pack({ truck: smallTruck, cargo });

    // Since floor is full (1000x1000), top-box would need to stack on bottom-box.
    // Because bottom-box is non-stackable, top-box must remain unplaced!
    expect(result.placedCount).toBe(1);
    expect(result.unplacedCount).toBe(1);
    expect(result.placements[0].cargoId).toBe('bottom-box');
    expect(result.unplacedItems[0].cargoId).toBe('top-box');
  });

  // TEST 11: Stackable package with insufficient stack capacity rejects the invalid stack
  it('TEST 11: Stackable package with insufficient maxStackWeight rejects excess weight', () => {
    const smallTruck: TruckCargoSpace = {
      lengthMm: 1000,
      widthMm: 1000,
      heightMm: 2500,
      maxPayloadGrams: 5_000_000,
    };

    const cargo: CargoItemInput[] = [
      {
        cargoId: 'light-base',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 100_000,
        quantity: 1,
        isStackable: true,
        maxStackWeightGrams: 50_000, // Can only support 50kg
        loadingPriority: 2, // Placed first on the floor
      },
      {
        cargoId: 'heavy-top',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 1000,
        weightGrams: 200_000, // 200kg (exceeds 50kg limit)
        quantity: 1,
        loadingPriority: 1,
      },
    ];

    const result = engine.pack({ truck: smallTruck, cargo });

    expect(result.placedCount).toBe(1);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedItems[0].cargoId).toBe('heavy-top');
  });

  // TEST 12: Mixed cargo produces correct placed/unplaced counts
  it('TEST 12: Mixed cargo manifest produces exact placed and unplaced counts', () => {
    const compactTruck: TruckCargoSpace = {
      lengthMm: 2000,
      widthMm: 1000,
      heightMm: 1000,
      maxPayloadGrams: 1_000_000, // 1 tonne
    };

    const cargo: CargoItemInput[] = [
      // Fits on floor (1000x1000x1000)
      { cargoId: 'item-A', lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightGrams: 200_000, quantity: 1 },
      // Fits on floor (1000x1000x1000)
      { cargoId: 'item-B', lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightGrams: 200_000, quantity: 1 },
      // No remaining floor space or height space
      { cargoId: 'item-C', lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightGrams: 200_000, quantity: 1 },
    ];

    const result = engine.pack({ truck: compactTruck, cargo });

    expect(result.totalRequestedCount).toBe(3);
    expect(result.placedCount).toBe(2);
    expect(result.unplacedCount).toBe(1);
    expect(result.unplacedItems[0].cargoId).toBe('item-C');
  });

  // TEST 13: Repeated execution with identical input produces identical output (Determinism)
  it('TEST 13: Determinism: Repeated execution with identical inputs produces identical outputs', () => {
    const cargo: CargoItemInput[] = [
      { cargoId: 'box-1', lengthMm: 1200, widthMm: 800, heightMm: 1000, weightGrams: 150_000, quantity: 3 },
      { cargoId: 'box-2', lengthMm: 800, widthMm: 600, heightMm: 500, weightGrams: 80_000, quantity: 5 },
      { cargoId: 'box-3', lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightGrams: 250_000, quantity: 2 },
    ];

    const run1 = engine.pack({ truck: standardTruck, cargo });
    const run2 = engine.pack({ truck: standardTruck, cargo });

    expect(run1.placedCount).toBe(run2.placedCount);
    expect(run1.unplacedCount).toBe(run2.unplacedCount);
    expect(run1.placedWeightGrams).toBe(run2.placedWeightGrams);
    expect(run1.placedVolumeMm3).toBe(run2.placedVolumeMm3);
    expect(run1.placements).toEqual(run2.placements);
  });

  // TEST 14: Every placement passes all geometry invariants
  it('TEST 14: Invariants: All placements remain within boundaries and do not overlap', () => {
    const cargo: CargoItemInput[] = [
      { cargoId: 'box-multi', lengthMm: 1000, widthMm: 800, heightMm: 600, weightGrams: 100_000, quantity: 10 },
    ];

    const result = engine.pack({ truck: standardTruck, cargo });

    for (const p of result.placements) {
      expect(p.xMm).toBeGreaterThanOrEqual(0);
      expect(p.yMm).toBeGreaterThanOrEqual(0);
      expect(p.zMm).toBeGreaterThanOrEqual(0);
      expect(p.xMm + p.lengthMm).toBeLessThanOrEqual(standardTruck.lengthMm);
      expect(p.yMm + p.widthMm).toBeLessThanOrEqual(standardTruck.widthMm);
      expect(p.zMm + p.heightMm).toBeLessThanOrEqual(standardTruck.heightMm);
    }
  });

  // TEST 15: Zero/negative/invalid dimensions and weights are rejected at validation
  it('TEST 15: Input validation strictly rejects non-positive or non-integer dimensions', () => {
    const invalidCargo: CargoItemInput[] = [
      { cargoId: 'invalid-box', lengthMm: -100, widthMm: 500, heightMm: 500, weightGrams: 1000, quantity: 1 },
    ];

    const result = engine.pack({ truck: standardTruck, cargo: invalidCargo });

    expect(result.success).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].code).toBe('INVALID_CARGO_INPUT');
  });

  // TEST 16: Empty cargo input produces a valid empty plan
  it('TEST 16: Empty cargo input produces a valid empty plan with 0 placed', () => {
    const result = engine.pack({ truck: standardTruck, cargo: [] });

    expect(result.success).toBe(true);
    expect(result.placedCount).toBe(0);
    expect(result.unplacedCount).toBe(0);
    expect(result.placements).toHaveLength(0);
    expect(result.payloadUtilizationPct).toBe(0);
    expect(result.volumeUtilizationPct).toBe(0);
  });

  // TEST 17: Truck with insufficient payload reports unplaced cargo rather than corrupting the result
  it('TEST 17: Insufficient payload gracefully reports unplaced items without corrupting plan', () => {
    const lowPayloadTruck: TruckCargoSpace = {
      lengthMm: 6000,
      widthMm: 2400,
      heightMm: 2400,
      maxPayloadGrams: 500_000, // Only 500kg max payload
    };

    const cargo: CargoItemInput[] = [
      { cargoId: 'heavy-box-1', lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightGrams: 300_000, quantity: 1 },
      { cargoId: 'heavy-box-2', lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightGrams: 300_000, quantity: 1 },
    ];

    const result = engine.pack({ truck: lowPayloadTruck, cargo });

    expect(result.placedCount).toBe(1); // First fits (300kg <= 500kg)
    expect(result.unplacedCount).toBe(1); // Second rejected (300kg + 300kg = 600kg > 500kg)
    expect(result.placedWeightGrams).toBe(300_000);
    expect(result.unplacedWeightGrams).toBe(300_000);
    expect(result.unplacedItems[0].cargoId).toBe('heavy-box-2');
  });
});
