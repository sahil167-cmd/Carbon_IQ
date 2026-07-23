import { ValidationIssue } from './validation.types';
import { ValidationLayer } from '@prisma/client';

export class Layer1Validator {
  /** Synchronous deterministic basic validation pass (FWS §7.2) */
  validate(categoryCode: string, fields: Record<string, any>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Check required fields per category
    if (categoryCode.includes('ELECTRICITY') || categoryCode.includes('RENEWABLE')) {
      if (fields.kwhConsumed?.value === undefined || fields.kwhConsumed?.value === null) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'kwhConsumed',
          message: 'Electricity bills must specify a kWh consumption value.',
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_1,
        });
      } else if (typeof fields.kwhConsumed.value !== 'number' || isNaN(fields.kwhConsumed.value)) {
        issues.push({
          code: 'INVALID_NUMERIC_FORMAT',
          field: 'kwhConsumed',
          message: 'kWh consumed value must be a valid numeric quantity.',
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_1,
        });
      }
    } else if (categoryCode.includes('STATIONARY') || categoryCode.includes('MOBILE')) {
      if (fields.fuelType?.value === undefined || !fields.fuelType?.value) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'fuelType',
          message: 'Fuel bills must specify a fuel type (e.g. DIESEL, LPG, DIESEL_GENERATOR).',
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_1,
        });
      }

      if (fields.quantity?.value === undefined || fields.quantity?.value === null) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'quantity',
          message: 'Fuel bills must specify a quantity value.',
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_1,
        });
      } else if (typeof fields.quantity.value !== 'number' || isNaN(fields.quantity.value)) {
        issues.push({
          code: 'INVALID_NUMERIC_FORMAT',
          field: 'quantity',
          message: 'Fuel quantity must be a valid numeric value.',
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_1,
        });
      }
    } else if (categoryCode.includes('TRANSPORT')) {
      if (fields.distanceKm?.value === undefined && fields.weightKg?.value === undefined) {
        issues.push({
          code: 'MISSING_REQUIRED_FIELD',
          field: 'distanceKm',
          message: 'Transport records must specify either distance (km) or cargo weight (kg).',
          severity: 'HARD_BLOCK',
          layer: ValidationLayer.LAYER_1,
        });
      }
    }

    return issues;
  }
}
