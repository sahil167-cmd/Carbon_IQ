import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

/**
 * Well-to-Wheel (WTW) Strategy
 * 
 * Formula: CO₂e_total = fuel_qty × (direct_combustion_EF + upstream_WTT_EF)
 * 
 * Source: GHG Protocol Scope 3 Standard, Category 3 (Fuel & Energy Related Activities)
 *         DEFRA 2024 Well-to-Tank conversion factors
 * 
 * This strategy combines:
 *   - Scope 1 direct combustion emissions (kgCO₂e from burning the fuel)
 *   - Scope 3 upstream emissions (kgCO₂e from extracting, refining, transporting the fuel)
 * 
 * The upstream (WTT) factor is typically 15-25% of the direct combustion factor.
 * Both factors should be provided via the fields or the factorValue already
 * includes the combined WTW total.
 */
export class WellToWheelStrategy implements ICalculationStrategy {
  readonly strategyKey = 'WELL_TO_WHEEL';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    const fields = input.fields || {};

    // factorValue is the combined WTW emission factor
    // If separate WTT factor is provided, add it to the combustion factor
    const wttFactor = fields.wttFactor?.value ?? fields.wttFactor ?? fields.upstreamFactor?.value ?? fields.upstreamFactor;
    
    if (wttFactor !== undefined && wttFactor !== null) {
      const wttDecimal = new Decimal(Number(wttFactor));
      const combinedFactor = factorValue.add(wttDecimal);
      return input.value.mul(combinedFactor);
    }

    // If no separate WTT factor, use the provided factor as-is (assumed to be combined WTW)
    return input.value.mul(factorValue);
  }
}
