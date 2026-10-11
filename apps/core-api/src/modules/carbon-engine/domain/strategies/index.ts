import { StrategyRegistry } from '../StrategyRegistry';
import { QuantityFactorStrategy } from './quantity-factor.strategy';
import { DistanceFactorStrategy } from './distance-factor.strategy';
import { WeightDistanceStrategy } from './weight-distance.strategy';
import { FugitiveGwpStrategy } from './fugitive-gwp.strategy';
import { LocationElectricityStrategy } from './location-electricity.strategy';
import { MarketElectricityStrategy } from './market-electricity.strategy';
import { MockTestStrategy } from './mock-test.strategy';
import { SpendBasedStrategy } from './spend-based.strategy';
import { EmployeeCommuteStrategy } from './employee-commute.strategy';
import { WellToWheelStrategy } from './well-to-wheel.strategy';
import { HotelNightsStrategy } from './hotel-nights.strategy';
import { IntensityMetricStrategy } from './intensity-metric.strategy';

// Register all strategies with StrategyRegistry composition root
export function registerAllStrategies(): void {
  // Core GHG Protocol strategies
  StrategyRegistry.register(new QuantityFactorStrategy());
  StrategyRegistry.register(new DistanceFactorStrategy());
  StrategyRegistry.register(new WeightDistanceStrategy());
  StrategyRegistry.register(new FugitiveGwpStrategy());
  StrategyRegistry.register(new LocationElectricityStrategy());
  StrategyRegistry.register(new MarketElectricityStrategy());

  // Production strategies (Scope 3 + advanced)
  StrategyRegistry.register(new SpendBasedStrategy());
  StrategyRegistry.register(new EmployeeCommuteStrategy());
  StrategyRegistry.register(new WellToWheelStrategy());
  StrategyRegistry.register(new HotelNightsStrategy());
  StrategyRegistry.register(new IntensityMetricStrategy());

  // Test
  StrategyRegistry.register(new MockTestStrategy());
}
