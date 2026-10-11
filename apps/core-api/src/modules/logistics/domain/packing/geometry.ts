import {
  BoxDimensions,
  BoxOrientation,
  OrientationType,
  PhysicalCargoInstance,
  Placement,
  Point3D,
  TruckCargoSpace,
} from './types';

/**
 * Generates all valid, non-redundant orthogonal 3D orientations for a cargo instance.
 *
 * Rules:
 * 1. An item always has UPRIGHT_DEFAULT (dx=L, dy=W, dz=H).
 * 2. If allowRotationHorizontal is true, UPRIGHT_YAW_90 (dx=W, dy=L, dz=H) is generated.
 * 3. If allowRotationVertical is true, pitch and roll orientations are generated.
 * 4. If an explicit allowedOrientations array is provided, it acts as a strict whitelist.
 * 5. If dimensions are identical (e.g., cubic or square footprint), redundant identical
 *    (dx, dy, dz) orientations are deduplicated in a deterministic order.
 */
export function getValidOrientations(item: PhysicalCargoInstance): BoxOrientation[] {
  const L = item.lengthMm;
  const W = item.widthMm;
  const H = item.heightMm;

  const candidates: BoxOrientation[] = [
    { orientation: 'UPRIGHT_DEFAULT', dxMm: L, dyMm: W, dzMm: H },
  ];

  if (item.allowRotationHorizontal) {
    candidates.push({ orientation: 'UPRIGHT_YAW_90', dxMm: W, dyMm: L, dzMm: H });
  }

  if (item.allowRotationVertical) {
    candidates.push(
      { orientation: 'SIDE_LENGTH_PITCH_90', dxMm: H, dyMm: W, dzMm: L },
      { orientation: 'SIDE_LENGTH_ROLL_90', dxMm: L, dyMm: H, dzMm: W },
      { orientation: 'SIDE_WIDTH_PITCH_90', dxMm: W, dyMm: H, dzMm: L },
      { orientation: 'SIDE_WIDTH_ROLL_90', dxMm: H, dyMm: L, dzMm: W },
    );
  }

  // Filter against explicit whitelist if supplied
  const filtered = item.allowedOrientations && item.allowedOrientations.length > 0
    ? candidates.filter((c) => item.allowedOrientations!.includes(c.orientation))
    : candidates;

  // Deduplicate identical (dx, dy, dz) shapes preserving preferred order
  const uniqueOrientations: BoxOrientation[] = [];
  const seenKeys = new Set<string>();

  for (const c of filtered) {
    const key = `${c.dxMm}x${c.dyMm}x${c.dzMm}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueOrientations.push(c);
    }
  }

  return uniqueOrientations;
}

/**
 * Checks if a 3D box at (x, y, z) with dimensions (dx, dy, dz) completely fits
 * within the internal boundary envelope of the vehicle cargo space.
 */
export function fitsInsideCargoSpace(
  xMm: number,
  yMm: number,
  zMm: number,
  dxMm: number,
  dyMm: number,
  dzMm: number,
  truck: TruckCargoSpace,
): boolean {
  if (xMm < 0 || yMm < 0 || zMm < 0) return false;
  if (dxMm <= 0 || dyMm <= 0 || dzMm <= 0) return false;

  return (
    xMm + dxMm <= truck.lengthMm &&
    yMm + dyMm <= truck.widthMm &&
    zMm + dzMm <= truck.heightMm
  );
}

/**
 * Computes the geometric Center of Mass for a list of placed items.
 * If total weight is 0, defaults to (0, 0, 0).
 */
export function calculateCenterOfMass(placements: Placement[]): Point3D {
  if (placements.length === 0) {
    return { xMm: 0, yMm: 0, zMm: 0 };
  }

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightedZ = 0;

  for (const p of placements) {
    const weight = p.weightGrams;
    const centerX = p.xMm + p.lengthMm / 2;
    const centerY = p.yMm + p.widthMm / 2;
    const centerZ = p.zMm + p.heightMm / 2;

    totalWeight += weight;
    weightedX += centerX * weight;
    weightedY += centerY * weight;
    weightedZ += centerZ * weight;
  }

  if (totalWeight === 0) {
    return { xMm: 0, yMm: 0, zMm: 0 };
  }

  return {
    xMm: Math.round(weightedX / totalWeight),
    yMm: Math.round(weightedY / totalWeight),
    zMm: Math.round(weightedZ / totalWeight),
  };
}
