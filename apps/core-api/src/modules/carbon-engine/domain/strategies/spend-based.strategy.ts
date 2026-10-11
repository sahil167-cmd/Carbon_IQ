import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

/**
 * Spend-Based EEIO Strategy
 * 
 * Formula: CO₂e = spend_amount × EEIO_factor (kgCO₂e/USD)
 * 
 * Source: EXIOBASE v3 / EPA USEEIO v2.0
 * Use case: GHG Protocol Scope 3, Category 1 (Purchased Goods & Services)
 *           and Category 2 (Capital Goods) when activity-based data is unavailable.
 * 
 * This is a screening-level methodology per GHG Protocol Scope 3 Standard.
 * Activity-based methods should be preferred when specific data is available.
 */
export class SpendBasedStrategy implements ICalculationStrategy {
  readonly strategyKey = 'SPEND_BASED_EEIO';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    // input.value = spend in currency (e.g., USD)
    // factorValue = kgCO₂e per unit of currency
    return input.value.mul(factorValue);
  }
}
