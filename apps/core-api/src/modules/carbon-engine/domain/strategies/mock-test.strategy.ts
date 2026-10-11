import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

export class MockTestStrategy implements ICalculationStrategy {
  readonly strategyKey = 'MOCK_TRIVIAL';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    // Return value * 2 to prove the extensibility worked example executes correctly
    return input.value.mul(2);
  }
}
