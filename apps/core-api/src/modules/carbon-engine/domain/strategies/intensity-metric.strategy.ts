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

/**
 * Intensity Metric Strategy
 *
 * Computes carbon intensity ratios:
 *   - CO₂e per unit of revenue (tCO₂e / $M revenue)
 *   - CO₂e per FTE (tCO₂e / employee)
 *   - CO₂e per square meter (kgCO₂e / m²)
 *   - CO₂e per unit of production (kgCO₂e / unit)
 *
 * Source: GHG Protocol Corporate Standard, SBTi intensity targets
 * Use case: Benchmarking, target-setting, intensity-based SBTi commitments
 *
 * NOTE: This strategy is different from emission calculation strategies.
 * It takes total_co2e as input and divides by a normalizing denominator.
 * The result is an intensity ratio, not an emission quantity.
 */
export class IntensityMetricStrategy implements ICalculationStrategy {
  readonly strategyKey = 'INTENSITY_METRIC';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    const fields = input.fields || {};

    // input.value = total CO₂e (kg) that we want to normalize
    const totalCo2eKg = input.value;

    // factorValue is used as the denominator (revenue in $M, FTE count, sqm, etc.)
    // If factorValue is provided and > 0, compute intensity = totalCo2e / denominator
    if (factorValue.greaterThan(0)) {
      return totalCo2eKg.div(factorValue);
    }

    // Fallback: try to extract denominator from fields
    const revenue = extractNumeric(fields, [
      'revenue', 'annualRevenue', 'revenueUSD', 'turnover',
    ]);
    const fte = extractNumeric(fields, [
      'fte', 'fteCount', 'employees', 'headcount',
    ]);
    const area = extractNumeric(fields, [
      'areaSqm', 'floorArea', 'squareMeters', 'sqm',
    ]);
    const units = extractNumeric(fields, [
      'productionUnits', 'unitsProduced', 'output',
    ]);

    // Priority: revenue > FTE > area > units
    if (revenue > 0) {
      // Convert to tCO₂e per $M revenue
      const tCo2e = totalCo2eKg.div(1000);
      const revenueMillions = new Decimal(revenue).div(1_000_000);
      return revenueMillions.greaterThan(0) ? tCo2e.div(revenueMillions) : tCo2e;
    }
    if (fte > 0) {
      return totalCo2eKg.div(1000).div(fte); // tCO₂e per FTE
    }
    if (area > 0) {
      return totalCo2eKg.div(area); // kgCO₂e per m²
    }
    if (units > 0) {
      return totalCo2eKg.div(units); // kgCO₂e per unit
    }

    // No denominator available — return total as-is
    return totalCo2eKg;
  }
}
