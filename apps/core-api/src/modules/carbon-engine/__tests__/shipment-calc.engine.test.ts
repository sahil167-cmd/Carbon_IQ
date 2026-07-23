import { ShipmentCalcEngine } from '../shipment-calc.engine';
import { ScopeType } from '@prisma/client';

describe('ShipmentCalcEngine (Deterministic Core)', () => {
  describe('Scope 1 Calculations', () => {
    it('should calculate Scope 1 stationary fuel emissions with unit conversion (Gallons -> Liters)', () => {
      const result = ShipmentCalcEngine.calculate({
        categoryCode: 'STATIONARY_COMBUSTION',
        fields: {
          quantity: { value: 100 }, // 100 Gallons
          unit: { value: 'GALLONS' },
        },
        factorValue: 2.68, // 2.68 kg CO2e / Liter
        factorUnit: 'LITERS',
      });

      expect(result.scope).toBe(ScopeType.SCOPE_1);
      expect(result.activityValue).toBe(378.541); // 100 * 3.78541 Liters
      expect(result.co2e).toBe(1014.49, 2); // 378.541 * 2.68 = 1014.48988 -> 1014.49 kgCO2e
    });
  });

  describe('Scope 2 Dual-Reporting Calculations', () => {
    it('should compute both Location-based and Market-based Scope 2 emissions', () => {
      const result = ShipmentCalcEngine.calculate({
        categoryCode: 'ELECTRICITY',
        fields: {
          kwhConsumed: { value: 10000 },
        },
        factorValue: 0.385, // Grid Location Factor
        factorUnit: 'KWH',
        marketFactorValue: 0.05, // REC Market Factor
      });

      expect(result.scope).toBe(ScopeType.SCOPE_2);
      expect(result.co2eLocation).toBe(3850); // 10000 * 0.385
      expect(result.co2eMarket).toBe(500); // 10000 * 0.05
    });
  });

  describe('Scope 3 GLEC Freight Transport Calculations', () => {
    it('should calculate GLEC ton-km freight emissions (weight_tonnes * distance_km * GLEC_factor)', () => {
      const result = ShipmentCalcEngine.calculate({
        categoryCode: 'UPSTREAM_TRANSPORT',
        fields: {
          distanceKm: { value: 500 }, // 500 km
          weightKg: { value: 20000 }, // 20 tonnes
        },
        factorValue: 0.092, // 0.092 kg CO2e / tonne-km
        factorUnit: 'TONNE_KM',
      });

      expect(result.scope).toBe(ScopeType.SCOPE_3);
      expect(result.activityValue).toBe(10000); // 20 tonnes * 500 km = 10,000 tkm
      expect(result.co2e).toBe(920); // 10000 * 0.092 = 920 kgCO2e
      expect(result.calculationMethod).toBe('GLEC_FRAMEWORK_V2_FREIGHT');
    });
  });

  describe('Hard Determinism Test (CI-Blocking)', () => {
    it('should produce bit-for-bit identical co2e output when executed repeatedly on identical input', () => {
      const input = {
        categoryCode: 'UPSTREAM_TRANSPORT',
        fields: {
          distanceKm: { value: 1250.75 },
          weightKg: { value: 18450 },
        },
        factorValue: 0.092,
        factorUnit: 'TONNE_KM',
      };

      const run1 = ShipmentCalcEngine.calculate(input);
      const run2 = ShipmentCalcEngine.calculate(input);
      const run3 = ShipmentCalcEngine.calculate(input);

      expect(run1.co2e).toBe(run2.co2e);
      expect(run2.co2e).toBe(run3.co2e);
      expect(run1.activityValue).toBe(run2.activityValue);
      expect(run1.formulaUsed).toBe(run2.formulaUsed);
    });
  });
});
