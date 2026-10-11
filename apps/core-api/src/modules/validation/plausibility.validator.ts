import { createLogger } from '../../core/logging/logger';

const logger = createLogger('PlausibilityValidator');

export interface PlausibilityCheckInput {
  category: string;
  subCategory?: string;
  activityValue: number;
  activityUnit: string;
  co2eKg: number;
}

export interface PlausibilityIssue {
  code: string;
  severity: 'WARNING' | 'REVIEW_RECOMMENDED';
  message: string;
  field?: string;
}

export class PlausibilityValidator {
  /**
   * Evaluate plausibility as risk/review signals.
   * Large industrial emissions are NOT automatically declared invalid.
   */
  public validatePlausibility(input: PlausibilityCheckInput): PlausibilityIssue[] {
    const issues: PlausibilityIssue[] = [];
    const val = input.activityValue;
    const unit = (input.activityUnit || '').toUpperCase();
    const co2e = input.co2eKg;

    // 1. Carbon intensity ratio check (kg CO2e per unit of activity)
    if (val > 0) {
      const intensity = co2e / val;

      if (unit === 'KWH') {
        // Expected grid intensity: ~0.05 to 1.5 kgCO2e/kWh
        if (intensity > 3.0) {
          issues.push({
            code: 'HIGH_ELECTRICITY_INTENSITY',
            severity: 'REVIEW_RECOMMENDED',
            message: `Electricity carbon intensity (${intensity.toFixed(2)} kgCO2e/kWh) exceeds typical grid ranges (0.05-1.5 kgCO2e/kWh).`,
            field: 'kwhConsumed',
          });
        }
      } else if (unit === 'LITERS') {
        // Expected fuel intensity: ~2.0 to 4.0 kgCO2e/Liter
        if (intensity > 10.0) {
          issues.push({
            code: 'HIGH_FUEL_INTENSITY',
            severity: 'REVIEW_RECOMMENDED',
            message: `Fuel carbon intensity (${intensity.toFixed(2)} kgCO2e/Liter) exceeds physical fuel limits (2.0-4.0 kgCO2e/Liter). Check fuel type or units.`,
            field: 'quantity',
          });
        }
      }
    }

    // 2. Magnitude shift detection (possible milliliter vs liter or kWh vs MWh mismatch)
    if (unit === 'LITERS' && val > 10000000) {
      issues.push({
        code: 'LARGE_FUEL_VOLUME_SIGNAL',
        severity: 'WARNING',
        message: `Extremely large fuel volume (${val.toLocaleString()} Liters). Flagged for industrial facility review.`,
        field: 'quantity',
      });
    }

    if (unit === 'KWH' && val > 50000000) {
      issues.push({
        code: 'LARGE_POWER_USAGE_SIGNAL',
        severity: 'WARNING',
        message: `High electricity consumption (${val.toLocaleString()} kWh). Flagged for manufacturing/datacenter review.`,
        field: 'kwhConsumed',
      });
    }

    return issues;
  }
}
