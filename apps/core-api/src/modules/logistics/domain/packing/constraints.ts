import { BoundingBox3D } from './collision';
import { PhysicalCargoInstance, Placement, TruckCargoSpace } from './types';

export interface StackingValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Checks if adding the candidate item respects the vehicle payload capacity.
 */
export function validatePayloadCapacity(
  currentPlacedWeightGrams: number,
  itemWeightGrams: number,
  truck: TruckCargoSpace,
): boolean {
  return currentPlacedWeightGrams + itemWeightGrams <= truck.maxPayloadGrams;
}

/**
 * Validates physical support and stacking rules for a candidate item placed at (x, y, z).
 *
 * Rules:
 * 1. If z == 0, the item rests directly on the vehicle floor (fully supported).
 * 2. If z > 0, the item must be physically supported from below by one or more placed items.
 * 3. Non-stackable items (isStackable === false) can NEVER support another item on top.
 * 4. Fragile items (isFragile === true) can NEVER support another item on top.
 * 5. If a supporting item specifies maxStackWeightGrams, the cumulative weight placed on top
 *    must not exceed that limit.
 * 6. Minimum support area threshold (at least 70% of base area supported by top surfaces).
 */
export function validateSupportAndStacking(
  candidate: BoundingBox3D,
  candidateItem: PhysicalCargoInstance,
  placements: Placement[],
  instanceMap: Map<string, PhysicalCargoInstance>,
  minSupportRatio: number = 0.70,
): StackingValidationResult {
  // Ground floor placement is unconditionally supported by the truck bed
  if (candidate.zMm === 0) {
    return { isValid: true };
  }

  const candidateBaseArea = candidate.lengthMm * candidate.widthMm;
  let supportedArea = 0;
  const supportingPlacements: Placement[] = [];

  // Find all items directly underneath candidate (top face at z == candidate.zMm)
  for (const existing of placements) {
    const existingTopZ = existing.zMm + existing.heightMm;

    if (existingTopZ === candidate.zMm) {
      // Check 2D footprint overlap in XY plane
      const overlapX = Math.max(0, Math.min(candidate.xMm + candidate.lengthMm, existing.xMm + existing.lengthMm) - Math.max(candidate.xMm, existing.xMm));
      const overlapY = Math.max(0, Math.min(candidate.yMm + candidate.widthMm, existing.yMm + existing.widthMm) - Math.max(candidate.yMm, existing.yMm));
      const overlapArea = overlapX * overlapY;

      if (overlapArea > 0) {
        supportedArea += overlapArea;
        supportingPlacements.push(existing);
      }
    }
  }

  // Must have physical support underneath
  if (supportingPlacements.length === 0 || supportedArea < candidateBaseArea * minSupportRatio) {
    return {
      isValid: false,
      reason: `Insufficient physical support underneath (supported ${Math.round((supportedArea / candidateBaseArea) * 100)}%, required ${Math.round(minSupportRatio * 100)}%)`,
    };
  }

  // Check each supporting item's constraints
  for (const sup of supportingPlacements) {
    const supInstance = instanceMap.get(sup.instanceId);
    if (!supInstance) continue;

    // Rule 3: Non-stackable items cannot support anything above them
    if (!supInstance.isStackable) {
      return {
        isValid: false,
        reason: `Supporting cargo ${sup.instanceId} is marked non-stackable`,
      };
    }

    // Rule 4: Fragile items cannot support other cargo
    if (supInstance.isFragile) {
      return {
        isValid: false,
        reason: `Supporting cargo ${sup.instanceId} is marked fragile`,
      };
    }

    // Rule 5: Check maxStackWeightGrams on supporting items
    if (supInstance.maxStackWeightGrams !== undefined && supInstance.maxStackWeightGrams !== null) {
      // Calculate current weight already resting on top of sup
      let existingSupportedWeight = 0;
      for (const p of placements) {
        if (p.zMm >= sup.zMm + sup.heightMm) {
          // Check if p is in the column above sup
          const colX = Math.max(0, Math.min(p.xMm + p.lengthMm, sup.xMm + sup.lengthMm) - Math.max(p.xMm, sup.xMm));
          const colY = Math.max(0, Math.min(p.yMm + p.widthMm, sup.yMm + sup.widthMm) - Math.max(p.yMm, sup.yMm));
          if (colX > 0 && colY > 0) {
            existingSupportedWeight += p.weightGrams;
          }
        }
      }

      if (existingSupportedWeight + candidateItem.weightGrams > supInstance.maxStackWeightGrams) {
        return {
          isValid: false,
          reason: `Exceeds max stack weight of supporting item ${sup.instanceId} (${existingSupportedWeight + candidateItem.weightGrams}g > ${supInstance.maxStackWeightGrams}g)`,
        };
      }
    }

    // Rule 6: Check maxStackTiers (identical items stacked in vertical column)
    if (supInstance.maxStackTiers !== undefined && supInstance.maxStackTiers !== null) {
      let currentTiers = 1;
      for (const p of placements) {
        if (p.cargoId === supInstance.cargoId && p.zMm >= sup.zMm + sup.heightMm) {
          currentTiers++;
        }
      }

      if (currentTiers >= supInstance.maxStackTiers) {
        return {
          isValid: false,
          reason: `Exceeds max stack tiers of ${supInstance.maxStackTiers} for cargo ${sup.cargoId}`,
        };
      }
    }
  }

  return { isValid: true };
}
