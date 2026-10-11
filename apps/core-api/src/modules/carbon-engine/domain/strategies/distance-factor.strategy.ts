import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

export class DistanceFactorStrategy implements ICalculationStrategy {
  readonly strategyKey = 'DISTANCE_FACTOR';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    return input.value.mul(factorValue);
  }
}
