import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

export class LocationElectricityStrategy implements ICalculationStrategy {
  readonly strategyKey = 'ELEC_LOCATION';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    return input.value.mul(factorValue);
  }
}
