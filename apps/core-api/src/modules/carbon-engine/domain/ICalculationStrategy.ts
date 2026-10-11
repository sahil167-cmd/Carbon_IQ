import { Decimal } from 'decimal.js';

export interface NormalizedActivityInput {
  value: Decimal;
  unit: string;
  fields: Record<string, any>;
}

export interface ICalculationStrategy {
  strategyKey: string;
  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal;
}
