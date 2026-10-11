/**
 * Pure Deterministic Coordinate and Geometry Transformation Utility
 * for CarbonIQ 3D Truck Loading Visualization (Phase 7D).
 *
 * All packing engine inputs/outputs represent:
 *   x = length (mm)
 *   y = width (mm)
 *   z = height (mm, vertical elevation)
 *
 * Packing engine positions (x, y, z) represent the MINIMUM CORNER of the box.
 * Three.js box geometries require CENTER coordinates.
 * This module converts mm -> metres and lower-corner -> center without axis distortion.
 */

import type { LoadPlanItem, Placement3D } from '../types/logistics';

export interface TruckDimensions {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  maxPayloadKg: number;
  name: string;
  registrationNumber?: string;
  lengthM: number;
  widthM: number;
  heightM: number;
}

export interface TransformedBox3D {
  // Center coordinates in metres (relative to truck origin 0,0,0)
  centerX: number;
  centerY: number;
  centerZ: number;

  // Oriented box dimensions in metres
  lengthM: number; // dx along X (length)
  widthM: number;  // dy along Y (width)
  heightM: number; // dz along Z (height)

  // Original metadata
  instanceId: string;
  cargoId: string;
  description: string;
  weightKg: number;
  orientation: string;
  loadingSequence: number;

  // Raw coordinates in mm for exact presentation in inspect panels
  raw: {
    xMm: number;
    yMm: number;
    zMm: number;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    weightGrams: number;
  };
}

/**
 * Converts millimetres to metres with floating-point hygiene.
 */
export function mmToMetres(mm: number): number {
  if (typeof mm !== 'number' || isNaN(mm)) return 0;
  return mm / 1000;
}

/**
 * Converts grams to kilograms.
 */
export function gramsToKg(grams: number): number {
  if (typeof grams !== 'number' || isNaN(grams)) return 0;
  return grams / 1000;
}

/**
 * Validates whether a raw placement object has valid non-negative coordinates
 * and positive dimensions.
 */
export function validatePlacement(p: any): boolean {
  if (!p || typeof p !== 'object') return false;
  if (!p.cargoId && !p.instanceId) return false;

  const x = Number(p.xMm);
  const y = Number(p.yMm);
  const z = Number(p.zMm);
  const length = Number(p.lengthMm);
  const width = Number(p.widthMm);
  const height = Number(p.heightMm);

  if (isNaN(x) || isNaN(y) || isNaN(z)) return false;
  if (isNaN(length) || isNaN(width) || isNaN(height)) return false;

  // Minimum corner coordinates must be non-negative
  if (x < 0 || y < 0 || z < 0) return false;

  // Dimensions must be strictly positive
  if (length <= 0 || width <= 0 || height <= 0) return false;

  return true;
}

/**
 * Validates whether truck dimensions are strictly positive and finite.
 */
export function validateTruckDimensions(truck: { lengthMm?: number; widthMm?: number; heightMm?: number }): boolean {
  if (!truck) return false;
  const l = Number(truck.lengthMm);
  const w = Number(truck.widthMm);
  const h = Number(truck.heightMm);
  return !isNaN(l) && !isNaN(w) && !isNaN(h) && l > 0 && w > 0 && h > 0;
}

/**
 * Pure transformation: converts a placement from engine integer mm and lower-corner origin
 * to 3D Three.js center position in metres.
 */
export function transformPlacementTo3D(
  p: Placement3D,
  truck?: { lengthMm: number; widthMm: number; heightMm: number },
): TransformedBox3D | null {
  if (!validatePlacement(p)) {
    return null;
  }

  const lengthMm = Number(p.lengthMm);
  const widthMm = Number(p.widthMm);
  const heightMm = Number(p.heightMm);

  const xMm = Number(p.xMm);
  const yMm = Number(p.yMm);
  const zMm = Number(p.zMm);

  // Lower-corner to center calculation (in metres)
  const centerX = mmToMetres(xMm + lengthMm / 2);
  const centerY = mmToMetres(yMm + widthMm / 2);
  const centerZ = mmToMetres(zMm + heightMm / 2);

  const lengthM = mmToMetres(lengthMm);
  const widthM = mmToMetres(widthMm);
  const heightM = mmToMetres(heightMm);

  // Optional tolerance check against truck envelope
  if (truck && validateTruckDimensions(truck)) {
    const toleranceMm = 1.0; // 1 mm boundary tolerance
    if (
      xMm + lengthMm > truck.lengthMm + toleranceMm ||
      yMm + widthMm > truck.widthMm + toleranceMm ||
      zMm + heightMm > truck.heightMm + toleranceMm
    ) {
      // Out of bounds placement warning, but still mathematically transformed
    }
  }

  return {
    centerX,
    centerY,
    centerZ,
    lengthM,
    widthM,
    heightM,
    instanceId: p.instanceId || p.cargoId,
    cargoId: p.cargoId,
    description: p.description || p.cargoId,
    weightKg: gramsToKg(Number(p.weightGrams) || 0),
    orientation: p.orientation || 'UPRIGHT_DEFAULT',
    loadingSequence: Number(p.loadingSequence) || 1,
    raw: {
      xMm,
      yMm,
      zMm,
      lengthMm,
      widthMm,
      heightMm,
      weightGrams: Number(p.weightGrams) || 0,
    },
  };
}

/**
 * Extracts and normalizes vehicle internal dimensions from a load plan item.
 * Supports:
 *   1. Embedded vehicleDimensions in placementsJson snapshot
 *   2. Relational vehicleType on loadPlan
 *   3. Relational vehicle.vehicleType on loadPlan
 */
export function extractTruckDimensions(plan: LoadPlanItem): TruckDimensions | null {
  if (!plan) return null;

  // Case 1: Direct snapshot in placementsJson (most authoritative)
  if (plan.placementsJson && typeof plan.placementsJson === 'object' && plan.placementsJson.vehicleDimensions) {
    const vd = plan.placementsJson.vehicleDimensions;
    if (validateTruckDimensions(vd)) {
      return {
        lengthMm: Number(vd.lengthMm),
        widthMm: Number(vd.widthMm),
        heightMm: Number(vd.heightMm),
        maxPayloadKg: (Number(vd.maxPayloadGrams) || 0) / 1000 || plan.loadedWeightKg * 1.2,
        name: vd.name || `Vehicle #${plan.vehicleSequence}`,
        registrationNumber: vd.registrationNumber,
        lengthM: mmToMetres(Number(vd.lengthMm)),
        widthM: mmToMetres(Number(vd.widthMm)),
        heightM: mmToMetres(Number(vd.heightMm)),
      };
    }
  }

  // Case 2: Relational vehicleType or vehicle.vehicleType
  const vt = plan.vehicleType || plan.vehicle?.vehicleType;
  if (vt) {
    const unit = (vt.dimensionUnit || 'CM').toUpperCase();
    let unitMultiplier = 10; // Default CM -> mm
    if (unit === 'MM') unitMultiplier = 1;
    if (unit === 'M') unitMultiplier = 1000;
    if (unit === 'INCH') unitMultiplier = 25.4;
    if (unit === 'FT') unitMultiplier = 304.8;

    const lengthMm = vt.internalLength != null ? Number(vt.internalLength) * unitMultiplier : 0;
    const widthMm = vt.internalWidth != null ? Number(vt.internalWidth) * unitMultiplier : 0;
    const heightMm = vt.internalHeight != null ? Number(vt.internalHeight) * unitMultiplier : 0;

    if (lengthMm > 0 && widthMm > 0 && heightMm > 0) {
      let maxPayloadKg = Number(vt.maxPayload) || 0;
      const wUnit = (vt.weightUnit || 'KG').toUpperCase();
      if (wUnit === 'TONNE') maxPayloadKg *= 1000;
      if (wUnit === 'GRAM') maxPayloadKg /= 1000;

      return {
        lengthMm,
        widthMm,
        heightMm,
        maxPayloadKg: maxPayloadKg || plan.loadedWeightKg,
        name: vt.name || `Vehicle #${plan.vehicleSequence}`,
        registrationNumber: plan.vehicle?.registrationNumber || undefined,
        lengthM: mmToMetres(lengthMm),
        widthM: mmToMetres(widthMm),
        heightM: mmToMetres(heightMm),
      };
    }
  }

  // Case 3: Infer from placements if strictly necessary (bounding envelope fallback)
  const placements = extractPlacements(plan);
  if (placements.length > 0) {
    let maxXMm = 0;
    let maxYMm = 0;
    let maxZMm = 0;
    for (const p of placements) {
      if (validatePlacement(p)) {
        maxXMm = Math.max(maxXMm, Number(p.xMm) + Number(p.lengthMm));
        maxYMm = Math.max(maxYMm, Number(p.yMm) + Number(p.widthMm));
        maxZMm = Math.max(maxZMm, Number(p.zMm) + Number(p.heightMm));
      }
    }
    if (maxXMm > 0 && maxYMm > 0 && maxZMm > 0) {
      // Pad by 5%
      const lengthMm = Math.ceil(maxXMm * 1.05);
      const widthMm = Math.ceil(maxYMm * 1.05);
      const heightMm = Math.ceil(maxZMm * 1.05);
      return {
        lengthMm,
        widthMm,
        heightMm,
        maxPayloadKg: plan.loadedWeightKg || 1000,
        name: `Vehicle #${plan.vehicleSequence} (Derived Bounding Envelope)`,
        lengthM: mmToMetres(lengthMm),
        widthM: mmToMetres(widthMm),
        heightM: mmToMetres(heightMm),
      };
    }
  }

  return null;
}

/**
 * Safely extracts array of Placement3D from load plan placementsJson.
 */
export function extractPlacements(plan: LoadPlanItem): Placement3D[] {
  if (!plan || !plan.placementsJson) return [];

  if (Array.isArray(plan.placementsJson)) {
    return plan.placementsJson;
  }

  if (typeof plan.placementsJson === 'object' && Array.isArray(plan.placementsJson.placements)) {
    return plan.placementsJson.placements;
  }

  return [];
}

/**
 * Calculates optimal camera distance and look-at target for OrbitControls
 * based on the truck's actual 3D bounding dimensions.
 */
export function calculateCameraFit(truck: TruckDimensions): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const maxDim = Math.max(truck.lengthM, truck.widthM, truck.heightM);
  const distance = Math.max(5, maxDim * 1.8);

  // Position camera at an elevated perspective viewing from rear-side
  return {
    position: [distance * 0.9, -distance * 0.9, distance * 0.7],
    target: [0, 0, 0], // Center of scene
  };
}

/**
 * Generates a deterministic, aesthetically pleasing color for a cargo item
 * based on its SKU/cargoId string.
 */
export function getDeterministicCargoColor(cargoId: string): string {
  const PALETTE = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
  ];

  let hash = 0;
  for (let i = 0; i < cargoId.length; i++) {
    hash = (hash << 5) - hash + cargoId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
