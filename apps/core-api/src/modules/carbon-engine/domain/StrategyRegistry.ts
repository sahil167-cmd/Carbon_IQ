import { ICalculationStrategy } from './ICalculationStrategy';

export class StrategyRegistry {
  private static strategies = new Map<string, ICalculationStrategy>();

  static register(strategy: ICalculationStrategy, aliases: string[] = []) {
    this.strategies.set(strategy.strategyKey, strategy);
    for (const alias of aliases) {
      this.strategies.set(alias, strategy);
    }
  }

  static get(key: string): ICalculationStrategy {
    const normalizedKey = key ? key.trim().toUpperCase() : '';
    const strategy = this.strategies.get(key) || this.strategies.get(normalizedKey);
    if (!strategy) {
      // Fallback for common aliases if not explicitly mapped
      if (normalizedKey === 'QUANTITY_FACTOR' || normalizedKey === 'QTY_X_FACTOR') {
        const fallback = this.strategies.get('QTY_X_FACTOR') || this.strategies.get('QUANTITY_FACTOR');
        if (fallback) return fallback;
      }
      if (normalizedKey === 'FUGITIVE_GWP' || normalizedKey === 'REFRIGERANT_GWP') {
        const fallback = this.strategies.get('REFRIGERANT_GWP') || this.strategies.get('FUGITIVE_GWP');
        if (fallback) return fallback;
      }
      if (normalizedKey === 'WEIGHT_DISTANCE_FACTOR' || normalizedKey === 'WEIGHT_DISTANCE') {
        const fallback = this.strategies.get('WEIGHT_DISTANCE_FACTOR') || this.strategies.get('WEIGHT_DISTANCE');
        if (fallback) return fallback;
      }
      throw new Error(`[CARBON ENGINE] Strategy key "${key}" is not registered in the StrategyRegistry.`);
    }
    return strategy;
  }

  static has(key: string): boolean {
    const normalizedKey = key ? key.trim().toUpperCase() : '';
    return this.strategies.has(key) || this.strategies.has(normalizedKey);
  }

  static clear() {
    this.strategies.clear();
  }
}
