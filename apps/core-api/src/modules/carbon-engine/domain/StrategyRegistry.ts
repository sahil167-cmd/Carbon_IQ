import { ICalculationStrategy } from './ICalculationStrategy';

export class StrategyRegistry {
  private static strategies = new Map<string, ICalculationStrategy>();

  static register(strategy: ICalculationStrategy) {
    this.strategies.set(strategy.strategyKey, strategy);
  }

  static get(key: string): ICalculationStrategy {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      throw new Error(`[CARBON ENGINE] Strategy key "${key}" is not registered in the StrategyRegistry.`);
    }
    return strategy;
  }

  static has(key: string): boolean {
    return this.strategies.has(key);
  }

  static clear() {
    this.strategies.clear();
  }
}
