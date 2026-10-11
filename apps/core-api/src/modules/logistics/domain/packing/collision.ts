import { Placement } from './types';

export interface BoundingBox3D {
  xMm: number;
  yMm: number;
  zMm: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

/**
 * Determines whether two 3D axis-aligned bounding boxes overlap.
 *
 * CRITICAL RULE:
 * Boundary touching (where A ends exactly where B begins, e.g. A.x + A.length == B.x)
 * is physically valid and is NOT an overlap.
 * Overlap occurs only if there is a positive 3D volume intersection (> 0 on all 3 axes).
 */
export function boxesIntersect(a: BoundingBox3D, b: BoundingBox3D): boolean {
  const overlapX = Math.max(a.xMm, b.xMm) < Math.min(a.xMm + a.lengthMm, b.xMm + b.lengthMm);
  const overlapY = Math.max(a.yMm, b.yMm) < Math.min(a.yMm + a.widthMm, b.yMm + b.widthMm);
  const overlapZ = Math.max(a.zMm, b.zMm) < Math.min(a.zMm + a.heightMm, b.zMm + b.heightMm);

  return overlapX && overlapY && overlapZ;
}

/**
 * Checks if a candidate placement collides with any already-placed item.
 */
export function hasCollisionWithPlacements(
  candidate: BoundingBox3D,
  placements: Placement[],
): boolean {
  for (const existing of placements) {
    if (boxesIntersect(candidate, existing)) {
      return true;
    }
  }
  return false;
}
