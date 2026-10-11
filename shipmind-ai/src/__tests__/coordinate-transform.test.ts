import { describe, it, expect } from 'vitest';
import {
  mmToMetres,
  gramsToKg,
  validatePlacement,
  validateTruckDimensions,
  transformPlacementTo3D,
  extractTruckDimensions,
  getDeterministicCargoColor,
} from '../utils/coordinate-transform';
import type { Placement3D, LoadPlanItem } from '../types/logistics';

describe('Phase 7D: Coordinate & Geometry Transformation Engine', () => {
  // =========================================================================
  // 1. Basic Unit Conversions
  // =========================================================================
  describe('Unit Conversion Precision', () => {
    it('TEST 1: Converts millimetres to metres accurately', () => {
      expect(mmToMetres(1000)).toBe(1.0);
      expect(mmToMetres(2500)).toBe(2.5);
      expect(mmToMetres(450)).toBe(0.45);
      expect(mmToMetres(0)).toBe(0);
    });

    it('TEST 2: Converts grams to kilograms accurately', () => {
      expect(gramsToKg(1000)).toBe(1.0);
      expect(gramsToKg(50000)).toBe(50.0);
      expect(gramsToKg(250)).toBe(0.25);
      expect(gramsToKg(0)).toBe(0);
    });
  });

  // =========================================================================
  // 2. Coordinate Transformation (Lower-Corner to Center)
  // =========================================================================
  describe('Coordinate Origin & Box Center Transformation', () => {
    it('TEST 3: Transforms lower-corner (x, y, z) into 3D box center without axis distortion', () => {
      // Test sample matching the prompt example:
      // x = 2500 mm, y = 1200 mm, z = 1000 mm
      // Box size: length = 1000 mm, width = 800 mm, height = 600 mm
      const placement: Placement3D = {
        instanceId: 'pkg-001#1',
        cargoId: 'pkg-001',
        description: 'Electronic Modules',
        xMm: 2500,
        yMm: 1200,
        zMm: 1000,
        lengthMm: 1000,
        widthMm: 800,
        heightMm: 600,
        weightGrams: 45000,
        orientation: 'UPRIGHT_DEFAULT',
        loadingSequence: 1,
      };

      const truck = {
        lengthMm: 6000,
        widthMm: 2400,
        heightMm: 2400,
      };

      const transformed = transformPlacementTo3D(placement, truck);

      expect(transformed).not.toBeNull();
      // centerX = (2500 + 1000/2) / 1000 = 3000 / 1000 = 3.0 m
      expect(transformed!.centerX).toBeCloseTo(3.0);
      // centerY = (1200 + 800/2) / 1000 = 1600 / 1000 = 1.6 m
      expect(transformed!.centerY).toBeCloseTo(1.6);
      // centerZ = (1000 + 600/2) / 1000 = 1300 / 1000 = 1.3 m
      expect(transformed!.centerZ).toBeCloseTo(1.3);

      // Dimensions in metres
      expect(transformed!.lengthM).toBeCloseTo(1.0);
      expect(transformed!.widthM).toBeCloseTo(0.8);
      expect(transformed!.heightM).toBeCloseTo(0.6);

      // Weight in kg
      expect(transformed!.weightKg).toBeCloseTo(45.0);
    });

    it('TEST 4: Correctly transforms origin placement (0, 0, 0)', () => {
      const placement: Placement3D = {
        instanceId: 'origin-item#1',
        cargoId: 'origin-item',
        xMm: 0,
        yMm: 0,
        zMm: 0,
        lengthMm: 500,
        widthMm: 400,
        heightMm: 300,
        weightGrams: 10000,
        orientation: 'UPRIGHT_DEFAULT',
      };

      const transformed = transformPlacementTo3D(placement);

      expect(transformed).not.toBeNull();
      expect(transformed!.centerX).toBeCloseTo(0.25);
      expect(transformed!.centerY).toBeCloseTo(0.2);
      expect(transformed!.centerZ).toBeCloseTo(0.15);
    });
  });

  // =========================================================================
  // 3. Validation & Safe Rejection of Malformed Placements
  // =========================================================================
  describe('Validation & Malformed Data Handling', () => {
    it('TEST 5: Safely validates correct placements and detects invalid attributes', () => {
      const validPlacement = {
        cargoId: 'item-1',
        xMm: 100,
        yMm: 200,
        zMm: 0,
        lengthMm: 500,
        widthMm: 400,
        heightMm: 300,
      };
      expect(validatePlacement(validPlacement)).toBe(true);

      // Negative coordinates
      expect(validatePlacement({ ...validPlacement, xMm: -5 })).toBe(false);

      // Zero or negative dimensions
      expect(validatePlacement({ ...validPlacement, lengthMm: 0 })).toBe(false);
      expect(validatePlacement({ ...validPlacement, heightMm: -10 })).toBe(false);

      // Missing or non-numeric coordinates
      expect(validatePlacement({ ...validPlacement, xMm: NaN })).toBe(false);
      expect(validatePlacement(null)).toBe(false);
    });

    it('TEST 6: Rejects malformed placements without fabricating replacements', () => {
      const malformed: any = {
        cargoId: 'broken-box',
        xMm: -100,
        yMm: 50,
        zMm: 0,
        lengthMm: 0,
        widthMm: 200,
        heightMm: 200,
      };

      const result = transformPlacementTo3D(malformed);
      expect(result).toBeNull();
    });

    it('TEST 7: Validates truck dimension constraints', () => {
      expect(validateTruckDimensions({ lengthMm: 6000, widthMm: 2400, heightMm: 2400 })).toBe(true);
      expect(validateTruckDimensions({ lengthMm: 0, widthMm: 2400, heightMm: 2400 })).toBe(false);
      expect(validateTruckDimensions({ lengthMm: -1000, widthMm: 2400, heightMm: 2400 })).toBe(false);
    });
  });

  // =========================================================================
  // 4. Vehicle Specification & Dimension Extraction
  // =========================================================================
  describe('Truck Dimension Extraction', () => {
    it('TEST 8: Extracts truck dimensions from embedded placementsJson snapshot', () => {
      const plan: LoadPlanItem = {
        id: 'lp-01',
        vehicleSequence: 1,
        loadedWeightKg: 1200,
        loadedVolumeM3: 5.4,
        weightUtilizationPct: 80,
        volumeUtilizationPct: 75,
        placementsJson: {
          vehicleDimensions: {
            lengthMm: 4500,
            widthMm: 2100,
            heightMm: 2200,
            maxPayloadGrams: 3500000,
            name: 'Tata 407 (MH-12-AB-1234)',
          },
          placements: [],
        },
      };

      const dims = extractTruckDimensions(plan);
      expect(dims).not.toBeNull();
      expect(dims!.lengthMm).toBe(4500);
      expect(dims!.widthMm).toBe(2100);
      expect(dims!.heightMm).toBe(2200);
      expect(dims!.lengthM).toBeCloseTo(4.5);
      expect(dims!.widthM).toBeCloseTo(2.1);
      expect(dims!.heightM).toBeCloseTo(2.2);
      expect(dims!.maxPayloadKg).toBeCloseTo(3500);
      expect(dims!.name).toContain('Tata 407');
    });

    it('TEST 9: Extracts truck dimensions from relational vehicleType with CM unit conversion', () => {
      const plan: LoadPlanItem = {
        id: 'lp-02',
        vehicleSequence: 2,
        loadedWeightKg: 2000,
        loadedVolumeM3: 8.0,
        weightUtilizationPct: 85,
        volumeUtilizationPct: 80,
        vehicleType: {
          id: 'vt-bolero',
          name: 'Mahindra Bolero Maxi Truck',
          internalLength: 250, // CM
          internalWidth: 170,  // CM
          internalHeight: 180, // CM
          dimensionUnit: 'CM',
          maxPayload: 1700,
          weightUnit: 'KG',
        },
      };

      const dims = extractTruckDimensions(plan);
      expect(dims).not.toBeNull();
      // 250 cm * 10 = 2500 mm = 2.5 m
      expect(dims!.lengthMm).toBe(2500);
      expect(dims!.widthMm).toBe(1700);
      expect(dims!.heightMm).toBe(1800);
      expect(dims!.lengthM).toBeCloseTo(2.5);
      expect(dims!.widthM).toBeCloseTo(1.7);
      expect(dims!.heightM).toBeCloseTo(1.8);
      expect(dims!.maxPayloadKg).toBe(1700);
    });
  });

  // =========================================================================
  // 5. Deterministic Color Hashing
  // =========================================================================
  describe('Deterministic Color Palette', () => {
    it('TEST 10: Produces identical color for identical cargoId and varies across different items', () => {
      const color1 = getDeterministicCargoColor('SKU-MUMBAI-01');
      const color2 = getDeterministicCargoColor('SKU-MUMBAI-01');
      const color3 = getDeterministicCargoColor('SKU-DELHI-99');

      expect(color1).toBe(color2); // Determinism
      expect(typeof color1).toBe('string');
      expect(color1.startsWith('#')).toBe(true);
      expect(color1).not.toBe(color3); // Different SKU yields different palette color
    });
  });
});
