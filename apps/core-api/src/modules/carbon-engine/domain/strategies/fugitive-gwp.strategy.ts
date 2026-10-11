import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

export class FugitiveGwpStrategy implements ICalculationStrategy {
  readonly strategyKey = 'REFRIGERANT_GWP';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    return input.value.mul(factorValue);
  }
}
