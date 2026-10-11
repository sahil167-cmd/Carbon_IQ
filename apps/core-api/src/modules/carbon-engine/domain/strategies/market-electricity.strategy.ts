import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

export class MarketElectricityStrategy implements ICalculationStrategy {
  readonly strategyKey = 'ELEC_MARKET';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    return input.value.mul(factorValue);
  }
}
