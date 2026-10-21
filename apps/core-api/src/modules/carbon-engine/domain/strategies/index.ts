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
  StrategyRegistry.register(new QuantityFactorStrategy(), ['QUANTITY_FACTOR', 'QTY_FACTOR', 'QUANTITY_X_FACTOR']);
  StrategyRegistry.register(new DistanceFactorStrategy(), ['DISTANCE_FACTOR', 'DISTANCE']);
  StrategyRegistry.register(new WeightDistanceStrategy(), ['WEIGHT_DISTANCE_FACTOR', 'WEIGHT_DISTANCE']);
  StrategyRegistry.register(new FugitiveGwpStrategy(), ['FUGITIVE_GWP', 'REFRIGERANT_GWP']);
  StrategyRegistry.register(new LocationElectricityStrategy(), ['ELEC_LOCATION', 'LOCATION_ELECTRICITY']);
  StrategyRegistry.register(new MarketElectricityStrategy(), ['ELEC_MARKET', 'MARKET_ELECTRICITY']);

  // Production strategies (Scope 3 + advanced)
  StrategyRegistry.register(new SpendBasedStrategy(), ['SPEND_BASED', 'SPEND_BASED_EEIO']);
  StrategyRegistry.register(new EmployeeCommuteStrategy(), ['EMPLOYEE_COMMUTE']);
  StrategyRegistry.register(new WellToWheelStrategy(), ['WELL_TO_WHEEL']);
  StrategyRegistry.register(new HotelNightsStrategy(), ['HOTEL_NIGHTS']);
  StrategyRegistry.register(new IntensityMetricStrategy(), ['INTENSITY_METRIC']);

  // Test
  StrategyRegistry.register(new MockTestStrategy());
}
