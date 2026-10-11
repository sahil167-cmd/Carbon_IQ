/**
 * Pure Domain Types for CarbonIQ 3D Cargo Packing Engine
 *
 * All internal geometry is strictly represented as integer millimetres (mm).
 * All internal mass is strictly represented as integer grams (g).
 * This eliminates floating-point rounding errors and ensures 100% deterministic geometry.
 */

export type OrientationType =
  | 'UPRIGHT_DEFAULT'        // dx = L, dy = W, dz = H
  | 'UPRIGHT_YAW_90'         // dx = W, dy = L, dz = H (90° rotation about Z-axis)
  | 'SIDE_LENGTH_PITCH_90'   // dx = H, dy = W, dz = L
  | 'SIDE_LENGTH_ROLL_90'    // dx = L, dy = H, dz = W
  | 'SIDE_WIDTH_PITCH_90'    // dx = W, dy = H, dz = L
  | 'SIDE_WIDTH_ROLL_90';    // dx = H, dy = L, dz = W

export interface BoxDimensions {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

export interface BoxOrientation {
  orientation: OrientationType;
  dxMm: number; // Dimension along X axis (length)
  dyMm: number; // Dimension along Y axis (width)
  dzMm: number; // Dimension along Z axis (height)
}

export interface TruckCargoSpace {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  maxPayloadGrams: number;
  name?: string;
}

export interface CargoItemInput {
  cargoId: string;
  description?: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightGrams: number;
  quantity: number;

  // Stacking & Fragility Constraints
  isStackable?: boolean;             // Default: true
  maxStackWeightGrams?: number;      // Maximum supported weight above this item
  maxStackTiers?: number;            // Maximum number of items above this item
  isFragile?: boolean;               // Default: false

  // Rotational Restrictions
  allowRotationHorizontal?: boolean; // Default: true (yaw around Z)
  allowRotationVertical?: boolean;   // Default: false (lay on side)
  allowedOrientations?: OrientationType[];

  // Priority & Sequencing
  loadingPriority?: number;          // Default: 1 (higher = packed earlier)
  unloadingSequence?: number;        // Default: 1 (stop index for LIFO delivery)
}

export interface PhysicalCargoInstance {
  instanceId: string; // e.g. `${cargoId}#1`, `${cargoId}#2`
  cargoId: string;
  description?: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightGrams: number;
  volumeMm3: number;

  isStackable: boolean;
  maxStackWeightGrams?: number;
  maxStackTiers?: number;
  isFragile: boolean;

  allowRotationHorizontal: boolean;
  allowRotationVertical: boolean;
  allowedOrientations?: OrientationType[];

  loadingPriority: number;
  unloadingSequence: number;
}

export interface Point3D {
  xMm: number;
  yMm: number;
  zMm: number;
}

export interface Placement {
  instanceId: string;
  cargoId: string;
  description?: string;
  xMm: number;
  yMm: number;
  zMm: number;
  lengthMm: number; // Effective dx
  widthMm: number;  // Effective dy
  heightMm: number; // Effective dz
  weightGrams: number;
  orientation: OrientationType;
  loadingSequence: number; // 1-based order in which it is packed into the vehicle
  unloadingSequence: number;
}

export interface UnplacedItem {
  instanceId: string;
  cargoId: string;
  description?: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightGrams: number;
  reason: string;
}

export interface PackingViolation {
  code: string;
  message: string;
  instanceId?: string;
  cargoId?: string;
}

export interface PackingResult {
  success: boolean;
  algorithmName: string;
  algorithmVersion: string;
  executionDurationMs: number;

  // Placements & Unplaced Manifests
  placements: Placement[];
  unplacedItems: UnplacedItem[];

  // Item Counts
  totalRequestedCount: number;
  placedCount: number;
  unplacedCount: number;

  // Weight Accounting (Grams)
  maxPayloadGrams: number;
  totalRequestedWeightGrams: number;
  placedWeightGrams: number;
  unplacedWeightGrams: number;
  payloadUtilizationPct: number; // 0.0 - 100.0

  // Volume Accounting (Cubic Millimetres)
  totalCargoSpaceVolumeMm3: number;
  totalRequestedVolumeMm3: number;
  placedVolumeMm3: number;
  unplacedVolumeMm3: number;
  volumeUtilizationPct: number; // 0.0 - 100.0

  // Center of Gravity (mm relative to origin 0,0,0)
  centerOfMassMm: Point3D;

  // Audit Violations (if any)
  violations: PackingViolation[];
}
