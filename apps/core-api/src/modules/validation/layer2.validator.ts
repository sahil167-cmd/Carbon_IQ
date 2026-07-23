import { ValidationIssue } from './validation.types';
import { ValidationLayer } from '@prisma/client';

export class Layer2Validator {
  /** Synchronous deterministic business domain validation pass (FWS §7.3) */
  validate(categoryCode: string, fields: Record<string, any>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Date logic check (delivery_date < pickup_date) -> HARD_BLOCK
    if (fields.pickupDate?.value && fields.deliveryDate?.value) {
      const pickup = new Date(fields.pickupDate.value);
      const delivery = new Date(fields.deliveryDate.value);

      if (delivery < pickup) {
        issues.push({
          code: 'INVALID_DATE_LOGIC',
          field: 'deliveryDate',
          message: `Delivery date (${fields.deliveryDate.value}) cannot precede pickup date (${fields.pickupDate.value}).`,
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_2,
        });
      }
    }

    // 2. Impossible geography (origin === destination but distance_km > 0) -> WARNING
    if (fields.origin?.value && fields.destination?.value) {
      const origin = String(fields.origin.value).trim().toLowerCase();
      const destination = String(fields.destination.value).trim().toLowerCase();
      const distance = fields.distanceKm?.value ?? 0;

      if (origin === destination && distance > 50) {
        issues.push({
          code: 'IMPOSSIBLE_GEOGRAPHY',
          field: 'distanceKm',
          message: `Origin and destination are identical (${fields.origin.value}), but recorded distance is ${distance} km.`,
          severity: 'WARNING',
          layer: ValidationLayer.LAYER_2,
        });
      }
    }

    // 3. Fuel-vehicle mismatch -> WARNING
    if (fields.vehicleType?.value && fields.fuelType?.value) {
      const vehicle = String(fields.vehicleType.value).toLowerCase();
      const fuel = String(fields.fuelType.value).toLowerCase();

      if (vehicle.includes('electric') && fuel.includes('diesel')) {
        issues.push({
          code: 'FUEL_VEHICLE_MISMATCH',
          field: 'fuelType',
          message: `Vehicle type "${fields.vehicleType.value}" is electric, but fuel type is recorded as "${fields.fuelType.value}".`,
          severity: 'WARNING',
          layer: ValidationLayer.LAYER_2,
        });
      }
    }

    // 4. Sanity range outlier checks (e.g. 500,000 kWh on single utility bill) -> WARNING
    if (fields.kwhConsumed?.value && typeof fields.kwhConsumed.value === 'number') {
      if (fields.kwhConsumed.value > 1000000) {
        issues.push({
          code: 'UNIT_OUTLIER_RANGE',
          field: 'kwhConsumed',
          message: `kWh consumption (${fields.kwhConsumed.value.toLocaleString()} kWh) is unusually high for a single billing period.`,
          severity: 'WARNING',
          layer: ValidationLayer.LAYER_2,
        });
      }
    }

    return issues;
  }
}
