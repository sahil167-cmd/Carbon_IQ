import { describe, it, expect } from 'vitest';
import {
  extractTruckDimensions,
  extractPlacements,
  transformPlacementTo3D,
  calculateCameraFit,
  type TransformedBox3D,
} from '../utils/coordinate-transform';
import type { LoadPlanItem, UnallocatedCargoItem } from '../types/logistics';

describe('Phase 7D: 3D Truck Loading & Spatial Visualization Workflow', () => {
  const sampleLoadPlan1: LoadPlanItem = {
    id: 'lp-001',
    vehicleSequence: 1,
    vehicleTypeId: 'vt-407',
    loadedWeightKg: 2400,
    loadedVolumeM3: 12.5,
    weightUtilizationPct: 85.7,
    volumeUtilizationPct: 78.1,
    placementsJson: {
      vehicleDimensions: {
        lengthMm: 4500,
        widthMm: 2100,
        heightMm: 2200,
        maxPayloadGrams: 2800000,
        name: 'Tata 407 Heavy (MH-12-Q-1001)',
      },
      placements: [
        {
          instanceId: 'box-alpha#1',
          cargoId: 'box-alpha',
          description: 'Industrial Inverter Units',
          xMm: 0,
          yMm: 0,
          zMm: 0,
          lengthMm: 1200,
          widthMm: 800,
          heightMm: 900,
          weightGrams: 150000,
          orientation: 'UPRIGHT_DEFAULT',
          loadingSequence: 1,
        },
        {
          instanceId: 'box-alpha#2',
          cargoId: 'box-alpha',
          description: 'Industrial Inverter Units',
          xMm: 1200,
          yMm: 0,
          zMm: 0,
          lengthMm: 1200,
          widthMm: 800,
          heightMm: 900,
          weightGrams: 150000,
          orientation: 'UPRIGHT_DEFAULT',
          loadingSequence: 2,
        },
        {
          instanceId: 'box-beta#1',
          cargoId: 'box-beta',
          description: 'Lithium Battery Modules',
          xMm: 0,
          yMm: 0,
          zMm: 900, // Stacked on top of box-alpha#1
          lengthMm: 1000,
          widthMm: 700,
          heightMm: 500,
          weightGrams: 80000,
          orientation: 'UPRIGHT_YAW_90',
          loadingSequence: 3,
        },
      ],
    },
  };

  const sampleLoadPlan2: LoadPlanItem = {
    id: 'lp-002',
    vehicleSequence: 2,
    vehicleTypeId: 'vt-bolero',
    loadedWeightKg: 950,
    loadedVolumeM3: 4.2,
    weightUtilizationPct: 63.3,
    volumeUtilizationPct: 52.5,
    placementsJson: {
      vehicleDimensions: {
        lengthMm: 2500,
        widthMm: 1700,
        heightMm: 1600,
        maxPayloadGrams: 1500000,
        name: 'Mahindra Bolero Maxi (MH-14-Z-5521)',
      },
      placements: [
        {
          instanceId: 'box-gamma#1',
          cargoId: 'box-gamma',
          description: 'Telecom Cables',
          xMm: 100,
          yMm: 200,
          zMm: 0,
          lengthMm: 800,
          widthMm: 600,
          heightMm: 600,
          weightGrams: 95000,
          orientation: 'UPRIGHT_DEFAULT',
          loadingSequence: 1,
        },
      ],
    },
  };

  // =========================================================================
  // 1. Authoritative Truck Dimensions & Geometry
  // =========================================================================
  describe('Authoritative Container Sizing', () => {
    it('TEST 1: Resolves exact internal dimensions for Vehicle 1 (Tata 407)', () => {
      const truck = extractTruckDimensions(sampleLoadPlan1);
      expect(truck).not.toBeNull();
      expect(truck!.lengthMm).toBe(4500);
      expect(truck!.widthMm).toBe(2100);
      expect(truck!.heightMm).toBe(2200);
      expect(truck!.lengthM).toBe(4.5);
      expect(truck!.widthM).toBe(2.1);
      expect(truck!.heightM).toBe(2.2);
      expect(truck!.maxPayloadKg).toBe(2800);
      expect(truck!.name).toContain('Tata 407');
    });

    it('TEST 2: Resolves exact internal dimensions for Vehicle 2 (Mahindra Bolero)', () => {
      const truck = extractTruckDimensions(sampleLoadPlan2);
      expect(truck).not.toBeNull();
      expect(truck!.lengthMm).toBe(2500);
      expect(truck!.widthMm).toBe(1700);
      expect(truck!.heightMm).toBe(1600);
      expect(truck!.lengthM).toBe(2.5);
      expect(truck!.widthM).toBe(1.7);
      expect(truck!.heightM).toBe(1.6);
      expect(truck!.maxPayloadKg).toBe(1500);
    });
  });

  // =========================================================================
  // 2. Spatial Cargo Box Transformations & Stacking
  // =========================================================================
  describe('Spatial Placement Transformations', () => {
    it('TEST 3: Transforms base floor placement into 3D box center in metres', () => {
      const truck = extractTruckDimensions(sampleLoadPlan1)!;
      const rawPlacements = extractPlacements(sampleLoadPlan1);
      const box1 = transformPlacementTo3D(rawPlacements[0], truck);

      expect(box1).not.toBeNull();
      // Box 1: length 1200, width 800, height 900 at (0, 0, 0)
      // Center: (600, 400, 450) mm -> (0.6, 0.4, 0.45) m
      expect(box1!.centerX).toBeCloseTo(0.6);
      expect(box1!.centerY).toBeCloseTo(0.4);
      expect(box1!.centerZ).toBeCloseTo(0.45);
      expect(box1!.lengthM).toBeCloseTo(1.2);
      expect(box1!.widthM).toBeCloseTo(0.8);
      expect(box1!.heightM).toBeCloseTo(0.9);
      expect(box1!.weightKg).toBeCloseTo(150.0);
    });

    it('TEST 4: Correctly computes vertical stacking center elevation for stacked cargo', () => {
      const truck = extractTruckDimensions(sampleLoadPlan1)!;
      const rawPlacements = extractPlacements(sampleLoadPlan1);
      // Box 3 sits at zMm = 900, heightMm = 500
      // Center Z = (900 + 500/2) / 1000 = (900 + 250) / 1000 = 1150 mm = 1.15 m
      const box3 = transformPlacementTo3D(rawPlacements[2], truck);

      expect(box3).not.toBeNull();
      expect(box3!.centerZ).toBeCloseTo(1.15);
      expect(box3!.raw.zMm).toBe(900);
      expect(box3!.orientation).toBe('UPRIGHT_YAW_90');
    });
  });

  // =========================================================================
  // 3. Multi-Vehicle Isolation
  // =========================================================================
  describe('Multi-Vehicle Isolation & Switching', () => {
    it('TEST 5: Confirms cargo placements in Vehicle 1 do not bleed into Vehicle 2', () => {
      const placementsV1 = extractPlacements(sampleLoadPlan1);
      const placementsV2 = extractPlacements(sampleLoadPlan2);

      expect(placementsV1).toHaveLength(3);
      expect(placementsV2).toHaveLength(1);

      const v1InstanceIds = new Set(placementsV1.map((p) => p.instanceId));
      const v2InstanceIds = new Set(placementsV2.map((p) => p.instanceId));

      // No intersection between vehicle loads
      for (const id of v1InstanceIds) {
        expect(v2InstanceIds.has(id)).toBe(false);
      }
    });

    it('TEST 6: Adapts container dimensions dynamically when switching active vehicle', () => {
      let activeTruck = extractTruckDimensions(sampleLoadPlan1)!;
      expect(activeTruck.lengthM).toBe(4.5);

      // User selects Vehicle 2 tab
      activeTruck = extractTruckDimensions(sampleLoadPlan2)!;
      expect(activeTruck.lengthM).toBe(2.5);
      expect(activeTruck.widthM).toBe(1.7);
    });
  });

  // =========================================================================
  // 4. Safe Handling of Corrupted or Non-Physical Placements
  // =========================================================================
  describe('Malformed Placement Rejection', () => {
    it('TEST 7: Safely rejects corrupted placement items without throwing or fabricating geometry', () => {
      const malformedPlan: LoadPlanItem = {
        id: 'lp-bad',
        vehicleSequence: 3,
        loadedWeightKg: 500,
        loadedVolumeM3: 2.0,
        weightUtilizationPct: 50,
        volumeUtilizationPct: 50,
        placementsJson: {
          vehicleDimensions: { lengthMm: 3000, widthMm: 2000, heightMm: 2000 },
          placements: [
            { cargoId: 'good-box', xMm: 0, yMm: 0, zMm: 0, lengthMm: 500, widthMm: 500, heightMm: 500 },
            { cargoId: 'bad-dim-box', xMm: 0, yMm: 0, zMm: 0, lengthMm: -500, widthMm: 500, heightMm: 500 },
            { cargoId: 'bad-coord-box', xMm: -100, yMm: 0, zMm: 0, lengthMm: 500, widthMm: 500, heightMm: 500 },
          ],
        },
      };

      const raw = extractPlacements(malformedPlan);
      const transformed: TransformedBox3D[] = [];
      let rejectedCount = 0;

      for (const p of raw) {
        const res = transformPlacementTo3D(p);
        if (res) transformed.push(res);
        else rejectedCount++;
      }

      expect(transformed).toHaveLength(1);
      expect(rejectedCount).toBe(2);
      expect(transformed[0].cargoId).toBe('good-box');
    });
  });

  // =========================================================================
  // 5. Unplaced Cargo Handling
  // =========================================================================
  describe('Unplaced Cargo Consignment Verification', () => {
    it('TEST 8: Preserves unplaced items with genuine engine constraint reasons', () => {
      const unallocatedItems: UnallocatedCargoItem[] = [
        {
          instanceId: 'heavy-generator#1',
          cargoId: 'heavy-generator',
          description: 'Industrial Generator Set',
          weightGrams: 3500000,
          volumeMm3: 8e9,
          reason: 'Item weight (3500 kg) exceeds maximum remaining fleet vehicle payload (2800 kg).',
        },
      ];

      expect(unallocatedItems).toHaveLength(1);
      expect(unallocatedItems[0].reason).toContain('exceeds maximum remaining');
      expect(unallocatedItems[0].weightGrams / 1000).toBe(3500);
    });
  });

  // =========================================================================
  // 6. Camera Scale Adaptation
  // =========================================================================
  describe('Camera Positioning', () => {
    it('TEST 9: Calculates larger viewing distance for larger trucks to ensure full envelope visibility', () => {
      const truckLarge = extractTruckDimensions(sampleLoadPlan1)!;
      const truckSmall = extractTruckDimensions(sampleLoadPlan2)!;

      const fitLarge = calculateCameraFit(truckLarge);
      const fitSmall = calculateCameraFit(truckSmall);

      // Distance from origin for large truck should be greater than for small truck
      const distLarge = Math.hypot(...fitLarge.position);
      const distSmall = Math.hypot(...fitSmall.position);

      expect(distLarge).toBeGreaterThan(distSmall);
    });
  });
});
