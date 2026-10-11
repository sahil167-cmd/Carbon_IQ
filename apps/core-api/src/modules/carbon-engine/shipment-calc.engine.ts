import { ScopeType } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { StrategyRegistry } from './domain/StrategyRegistry';
import { registerAllStrategies } from './domain/strategies';

registerAllStrategies();

export interface RawEngineInput {
  categoryCode: string;
  fields: Record<string, any>;
  factorValue: number;
  factorUnit: string;
  marketFactorValue?: number | null;
}

export interface RawEngineOutput {
  scope: ScopeType;
  co2e: number;
  co2eLocation: number | null;
  co2eMarket: number | null;
  activityValue: number;
  activityUnit: string;
  calculationMethod: string;
  formulaUsed: string;
}

export class ShipmentCalcEngine {
  /**
   * Adapter bridging legacy calls/tests to the new strategy registry using Decimal math.
   */
  static calculate(input: RawEngineInput): RawEngineOutput {
    const code = input.categoryCode.toUpperCase();
    const fields = input.fields || {};

    let scope: ScopeType = ScopeType.SCOPE_1;

    if (code.includes('ELECTRICITY') || code.includes('RENEWABLE')) {
      scope = ScopeType.SCOPE_2;
    } else if (code.includes('TRANSPORT') || code.includes('PURCHASED') || code.includes('GOODS') || code.includes('WASTE')) {
      scope = ScopeType.SCOPE_3;
    }

    let value = new Decimal(fields.quantity?.value ?? fields.quantity ?? fields.kwhConsumed?.value ?? fields.kwhConsumed ?? fields.distanceKm?.value ?? fields.distanceKm ?? 0);
    const factorValue = new Decimal(input.factorValue);
    const unitVal = fields.unit?.value ?? fields.unit;

    // Apply Gallons to Liters conversion for test compatibility
    if (unitVal === 'GALLONS' && input.factorUnit === 'LITERS') {
      value = value.mul(3.78541);
    }


    // Map category code to strategy key
    let strategyKey = 'QTY_X_FACTOR';
    if (code.includes('ELECTRICITY') || code.includes('RENEWABLE')) {
      strategyKey = 'ELEC_LOCATION';
    } else if (code.includes('TRANSPORT')) {
      strategyKey = 'WEIGHT_DISTANCE_FACTOR';
    } else if (code.includes('FUGITIVE')) {
      strategyKey = 'REFRIGERANT_GWP';
    }

    const strategy = StrategyRegistry.get(strategyKey);
    let co2e = new Decimal(0);
    let co2eLoc: Decimal | null = null;
    let co2eMkt: Decimal | null = null;
    let activityVal = value;

    if (strategyKey === 'ELEC_LOCATION') {
      co2eLoc = strategy.calculate({ value, unit: input.factorUnit, fields }, factorValue);
      if (input.marketFactorValue !== undefined && input.marketFactorValue !== null) {
        const marketStrategy = StrategyRegistry.get('ELEC_MARKET');
        co2eMkt = marketStrategy.calculate({ value, unit: input.factorUnit, fields }, new Decimal(input.marketFactorValue));
      } else {
        co2eMkt = co2eLoc;
      }
      co2e = co2eLoc;
    } else if (strategyKey === 'WEIGHT_DISTANCE_FACTOR') {
      const isExplicitKg = fields.weightKg !== undefined;
      const rawWeight = new Decimal(fields.weightKg?.value ?? fields.weightKg ?? fields.weight?.value ?? fields.weight ?? 0);
      const rawDistance = new Decimal(fields.distanceKm?.value ?? fields.distanceKm ?? 0);
      const weightUnitStr = String(fields.weightUnit?.value ?? fields.weightUnit ?? (isExplicitKg ? 'KG' : '')).toUpperCase();
      
      // If weight is in KG or explicitly specified as weightKg, ALWAYS divide by 1000 to get tonnes
      const isKg = isExplicitKg || weightUnitStr.includes('KG') || (!weightUnitStr.includes('TON') && rawWeight.gte(1000));
      const weightTonnes = isKg ? rawWeight.div(1000) : rawWeight;
      
      const hasWeightOrDist = fields.weightKg !== undefined || fields.weight !== undefined || fields.distanceKm !== undefined;
      activityVal = hasWeightOrDist ? weightTonnes.mul(rawDistance) : value;
      co2e = strategy.calculate({ value: activityVal, unit: input.factorUnit, fields }, factorValue);
    } else {
      co2e = strategy.calculate({ value, unit: input.factorUnit, fields }, factorValue);
    }

    const calculationMethodName = strategyKey === 'WEIGHT_DISTANCE_FACTOR' ? 'GLEC_FRAMEWORK_V2_FREIGHT' : strategyKey;

    return {
      scope,
      co2e: Number(co2e.toFixed(4)),
      co2eLocation: co2eLoc ? Number(co2eLoc.toFixed(4)) : null,
      co2eMarket: co2eMkt ? Number(co2eMkt.toFixed(4)) : null,
      activityValue: Number(activityVal.toFixed(4)),
      activityUnit: input.factorUnit,
      calculationMethod: calculationMethodName,
      formulaUsed: `Strategy: ${strategyKey} | Converted value: ${activityVal.toFixed(4)} ${input.factorUnit}`,
    };

  }
}
