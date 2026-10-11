import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

function extractNumeric(fields: Record<string, any>, keys: string[]): number {
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null) {
      const v = fields[k]?.value ?? fields[k];
      const num = Number(String(v).replace(/,/g, '').trim());
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

function extractString(fields: Record<string, any>, keys: string[]): string {
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null) {
      const v = fields[k]?.value ?? fields[k];
      if (v) return String(v).trim().toUpperCase();
    }
  }
  return '';
}

export class WeightDistanceStrategy implements ICalculationStrategy {
  readonly strategyKey = 'WEIGHT_DISTANCE_FACTOR';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    // 1. Direct Tonne-Km activity input
    if ((input.unit === 'TONNE_KM' || input.unit === 'TKM') && input.value.gt(0)) {
      return input.value.mul(factorValue);
    }

    const fields = input.fields || {};
    const rawWeightNum = extractNumeric(fields, ['weightKg', 'weight', 'cargoWeight', 'totalWeight', 'weightTonnes', 'weightTons']);
    const rawDistanceNum = extractNumeric(fields, ['distanceKm', 'distance', 'distanceMiles', 'miles', 'km', 'totalDistance']);

    const weightUnit = extractString(fields, ['weightUnit']);
    const distanceUnit = extractString(fields, ['distanceUnit']);

    let weightTonnes = new Decimal(rawWeightNum || 0);
    const hasExplicitTonnes = fields.weightTonnes !== undefined || fields.weightTons !== undefined || weightUnit.includes('TON');
    const isKg = fields.weightKg !== undefined || weightUnit.includes('KG') || (!hasExplicitTonnes && !weightUnit.includes('LB'));
    
    // Unit normalization for weight (convert to metric tonnes)
    if (weightUnit.includes('LB')) {
      weightTonnes = weightTonnes.mul(0.000453592);
    } else if (isKg) {
      weightTonnes = weightTonnes.div(1000);
    }

    let distanceKm = new Decimal(rawDistanceNum || 0);
    if (distanceUnit.includes('MILE') || distanceUnit === 'MI') {
      distanceKm = distanceKm.mul(1.60934);
    }

    const tonneKm = weightTonnes.mul(distanceKm);
    return tonneKm.mul(factorValue);
  }
}
