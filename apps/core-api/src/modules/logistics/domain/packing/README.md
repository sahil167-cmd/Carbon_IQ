# CarbonIQ 3D Cargo Packing Engine (Pure Domain Module)

## 1. Purpose
The CarbonIQ 3D Cargo Packing Engine is a pure, deterministic domain component that computes physically valid 3D packing arrangements of rectangular cargo packages inside a vehicle's cargo envelope.

It is completely decoupled from databases (PostgreSQL/Prisma), network protocols (HTTP/REST), message queues, frontend state, and the Carbon Accounting Engine.

---

## 2. Coordinate System & Unit Normalization
- **Units**:
  - **Spatial Dimensions**: Integer millimetres (`mm`). No floating-point representation.
  - **Mass**: Integer grams (`g`). $1\text{ kg} = 1,000\text{ g}$.
- **Axes Convention**:
  - Origin `(0, 0, 0)` is located at the front-left bottom corner of the vehicle cargo bay.
  - **X-axis**: Length direction (from front bulkhead to rear loading doors: $0 \le x \le \text{internalLength}$).
  - **Y-axis**: Width direction (from left side wall to right side wall: $0 \le y \le \text{internalWidth}$).
  - **Z-axis**: Height direction (from floor bed to ceiling roof: $0 \le z \le \text{internalHeight}$).
  - Gravity acts in the $-Z$ direction (downward toward the floor at $z = 0$).

---

## 3. Input Contract
The engine accepts an input object matching:
```typescript
interface PackingInput {
  truck: {
    lengthMm: number;        // Integer mm > 0
    widthMm: number;         // Integer mm > 0
    heightMm: number;        // Integer mm > 0
    maxPayloadGrams: number; // Integer grams > 0
    name?: string;
  };
  cargo: Array<{
    cargoId: string;
    description?: string;
    lengthMm: number;        // Integer mm > 0
    widthMm: number;         // Integer mm > 0
    heightMm: number;        // Integer mm > 0
    weightGrams: number;     // Integer grams > 0
    quantity: number;        // Integer >= 0

    isStackable?: boolean;             // Default: true
    maxStackWeightGrams?: number;      // Supported weight limit
    maxStackTiers?: number;            // Vertical tier limit
    isFragile?: boolean;               // Default: false

    allowRotationHorizontal?: boolean; // Default: true (yaw around Z)
    allowRotationVertical?: boolean;   // Default: false (lay on side)
    allowedOrientations?: OrientationType[];

    loadingPriority?: number;          // Default: 1 (higher = packed earlier)
    unloadingSequence?: number;        // Default: 1 (LIFO stop index)
  }>;
}
```

---

## 4. Output Contract
The engine returns a comprehensive, immutable result structure:
- `success`: boolean (`true` if all requested items were successfully placed).
- `placements`: Array of placed cargo items, each with exact coordinates (`xMm, yMm, zMm`), dimensions, orientation, and loading sequence.
- `unplacedItems`: Array of physical instances that could not fit, including explicit failure reasons.
- `totalRequestedCount`, `placedCount`, `unplacedCount`.
- `maxPayloadGrams`, `placedWeightGrams`, `payloadUtilizationPct`.
- `totalCargoSpaceVolumeMm3`, `placedVolumeMm3`, `volumeUtilizationPct`.
- `centerOfMassMm`: `{ xMm, yMm, zMm }` weighted center of gravity.
- `violations`: Diagnostic validation messages.

---

## 5. Orientation Handling
A box with dimensions $(L, W, H)$ can have up to 6 axis-aligned orientations:
1. `UPRIGHT_DEFAULT`: $(dx=L, dy=W, dz=H)$
2. `UPRIGHT_YAW_90`: $(dx=W, dy=L, dz=H)$ (rotated 90° about vertical Z axis)
3. `SIDE_LENGTH_PITCH_90`: $(dx=H, dy=W, dz=L)$
4. `SIDE_LENGTH_ROLL_90`: $(dx=L, dy=H, dz=W)$
5. `SIDE_WIDTH_PITCH_90`: $(dx=W, dy=H, dz=L)$
6. `SIDE_WIDTH_ROLL_90`: $(dx=H, dy=L, dz=W)$

**Rules**:
- Non-rotatable items (`allowRotationHorizontal: false, allowRotationVertical: false`) are restricted to `UPRIGHT_DEFAULT`.
- Upright-only items (`allowRotationVertical: false`) evaluate only yaw orientations (`UPRIGHT_DEFAULT` and `UPRIGHT_YAW_90`).
- Redundant orientations (e.g. cubic items or equal width/length) are automatically deduplicated to prevent unnecessary search states.

---

## 6. Collision & Boundary Rules
- Two axis-aligned 3D boxes $A$ and $B$ collide if and only if their intersection volume is strictly positive:
  $$\max(x_A, x_B) < \min(x_A + dx_A, x_B + dx_B) \quad \land \quad \max(y_A, y_B) < \min(y_A + dy_A, y_B + dy_B) \quad \land \quad \max(z_A, z_B) < \min(z_A + dz_A, z_B + dz_B)$$
- **Boundary Touching**: Items sharing a face ($A.x + dx_A == B.x$), edge, or corner do not overlap. Boundary touching is physically valid and accepted.

---

## 7. Stacking & Support Rules
- **Floor Support**: Any placement with $z = 0$ is unconditionally supported by the vehicle bed.
- **Elevated Support ($z > 0$)**: An item placed above the floor must have at least 70% of its base surface area supported by the top faces of placed items directly underneath ($p.z + dz == z_{\text{new}}$). Cantilevers in thin air are rejected.
- **Non-stackable Items**: Items with `isStackable: false` can never have another item placed on top of them.
- **Fragile Items**: Items with `isFragile: true` can never support other items.
- **Max Stack Weight**: The cumulative weight of all items resting on top of a supporting item must not exceed `maxStackWeightGrams`.
- **Max Stack Tiers**: The vertical tier count of identical items cannot exceed `maxStackTiers`.

---

## 8. Payload Handling
- Total placed weight is checked before placing every physical package:
  $$\text{currentPlacedWeight} + \text{itemWeight} \le \text{truck.maxPayloadGrams}$$
- If an item's weight would exceed remaining payload capacity, it is immediately routed to `unplacedItems` with an explicit reason.

---

## 9. Heuristic Strategy & Determinism
3D bin packing is NP-hard. The engine implements a deterministic constructive Extreme Point (EP) / Corner-Fit heuristic:
1. **Pre-sorting**: Cargo instances are ordered by:
   - `loadingPriority` descending (higher priority first)
   - `unloadingSequence` descending (LIFO: items for later delivery stops packed deeper against front wall)
   - Volume descending (Best-Fit Decreasing)
   - Weight descending (heavier items placed lower)
   - `instanceId` ascending (guaranteed deterministic tie-breaker)
2. **Candidate Generation**: Placements generate anchor corners at $(x+dx, y, z)$, $(x, y+dy, z)$, and $(x, y, z+dz)$.
3. **Deterministic Scoring**: Valid candidate positions are scored using:
   $$\text{Score} = (z \times 10^{12}) + (x \times 10^6) + (y \times 10^3) + (dx + dy + dz)$$
   Lowest score wins, ensuring bottom-first, front-to-back, left-to-right compact packing. Zero use of `Math.random()`.

---

## 10. Why This Is Not a Global Optimum Solver
Finding the globally optimal packing for arbitrary 3D shapes across multiple constraints in polynomial time is impossible ($P \neq NP$). The constructive heuristic guarantees:
- Fast, predictable $O(N^2 \cdot K)$ runtime (where $N$ is item count and $K$ is orientations $\le 6$).
- Complete physical validity and safety invariants.
- 100% reproducible byte-for-byte outcomes on every run.

---

## 11. Known Limitations & Intentionally Deferred Scope
- **Axle-load legality & distribution**: Calculating legal per-axle weight distribution across varying wheelbase chassis requires chassis-specific wheel/axle geometry, which belongs in a subsequent vehicle master phase.
- **Irregular / Non-cuboidal Shapes**: Only axis-aligned bounding boxes are modeled. Cylinders and irregular cargo are modeled by their outer bounding envelopes.
- **Fleet Allocation**: This engine solves packing for one vehicle cargo space. Fleet sizing and vehicle selection are handled by Fleet Optimizer in a later phase.
