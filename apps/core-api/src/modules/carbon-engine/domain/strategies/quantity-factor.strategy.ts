import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

export class QuantityFactorStrategy implements ICalculationStrategy {
  readonly strategyKey = 'QTY_X_FACTOR';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    // co2e = quantity * factorValue
    return input.value.mul(factorValue);
  }
}
