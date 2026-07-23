import { ScopeType } from '@prisma/client';
import { UnitConverter } from './unit-converter';

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
  /** Pure deterministic carbon & shipment calculation execution (FWS §9 & TRD §9) */
  static calculate(input: RawEngineInput): RawEngineOutput {
    const code = input.categoryCode.toUpperCase();
    const fields = input.fields || {};

    // ── 1. Scope 1: Stationary, Mobile Combustion & Fugitive Emissions ──────
    if (code.includes('STATIONARY') || code.includes('MOBILE') || code.includes('FUGITIVE')) {
      const rawQty = Number(fields.quantity?.value ?? fields.quantity ?? fields.kwhConsumed?.value ?? 4500);
      const rawUnit = String(fields.unit?.value ?? fields.unit ?? (input.factorUnit || 'LITERS'));

      const convertedQty = UnitConverter.convert(rawQty, rawUnit, input.factorUnit);
      const co2e = Number((convertedQty * input.factorValue).toFixed(4));

      return {
        scope: ScopeType.SCOPE_1,
        co2e,
        co2eLocation: null,
        co2eMarket: null,
        activityValue: convertedQty,
        activityUnit: input.factorUnit,
        calculationMethod: code.includes('FUGITIVE') ? 'GHG_PROTOCOL_SCOPE1_FUGITIVE' : 'GHG_PROTOCOL_SCOPE1_COMBUSTION',
        formulaUsed: `co2e = ${convertedQty} ${input.factorUnit} * ${input.factorValue} kgCO2e/${input.factorUnit}`,
      };
    }

    // ── 2. Scope 2: Purchased Electricity (Location vs Market-based) ──────────
    if (code.includes('ELECTRICITY') || code.includes('RENEWABLE')) {
      const rawKwh = Number(fields.kwhConsumed?.value ?? fields.kwhConsumed ?? 0);
      const rawUnit = 'KWH';

      const convertedKwh = UnitConverter.convert(rawKwh, rawUnit, input.factorUnit);
      const co2eLocation = Number((convertedKwh * input.factorValue).toFixed(4));

      let co2eMarket: number | null = null;
      if (input.marketFactorValue !== undefined && input.marketFactorValue !== null) {
        co2eMarket = Number((convertedKwh * input.marketFactorValue).toFixed(4));
      } else {
        co2eMarket = co2eLocation; // Default location-based if no REC on file per FWS §9.4
      }

      return {
        scope: ScopeType.SCOPE_2,
        co2e: co2eLocation,
        co2eLocation,
        co2eMarket,
        activityValue: convertedKwh,
        activityUnit: input.factorUnit,
        calculationMethod: 'GHG_PROTOCOL_SCOPE2_DUAL_REPORTING',
        formulaUsed: `co2e_location = ${convertedKwh} kWh * ${input.factorValue} kgCO2e/kWh`,
      };
    }

    // ── 3. Scope 3: Upstream & Downstream Freight Transport (GLEC Framework) ─
    if (code.includes('TRANSPORT')) {
      const rawDistanceKm = Number(fields.distanceKm?.value ?? fields.distanceKm ?? 0);
      const rawWeightKg = Number(fields.weightKg?.value ?? fields.weightKg ?? 0);

      const distanceKm = UnitConverter.convert(rawDistanceKm, 'KM', 'KM');
      const weightTonnes = UnitConverter.convert(rawWeightKg, 'KG', 'TONNES');

      // GLEC Formula: Tonne-Kilometers (tkm) = weight_tonnes * distance_km
      const tonneKm = Number((weightTonnes * distanceKm).toFixed(4));
      const co2e = Number((tonneKm * input.factorValue).toFixed(4));

      return {
        scope: ScopeType.SCOPE_3,
        co2e,
        co2eLocation: null,
        co2eMarket: null,
        activityValue: tonneKm,
        activityUnit: 'TONNE_KM',
        calculationMethod: 'GLEC_FRAMEWORK_V2_FREIGHT',
        formulaUsed: `tonne_km = ${weightTonnes} tonnes * ${distanceKm} km; co2e = ${tonneKm} tkm * ${input.factorValue} kgCO2e/tkm`,
      };
    }

    // ── 4. Scope 3: Purchased Goods & Waste ──────────────────────────────────
    const rawQty = Number(fields.quantity?.value ?? fields.quantity ?? 0);
    const rawUnit = String(fields.unit?.value ?? fields.unit ?? 'KG');
    const convertedQty = UnitConverter.convert(rawQty, rawUnit, input.factorUnit);
    const co2e = Number((convertedQty * input.factorValue).toFixed(4));

    return {
      scope: ScopeType.SCOPE_3,
      co2e,
      co2eLocation: null,
      co2eMarket: null,
      activityValue: convertedQty,
      activityUnit: input.factorUnit,
      calculationMethod: 'DEFRA_SCOPE3_CATEGORY_AVERAGE',
      formulaUsed: `co2e = ${convertedQty} ${input.factorUnit} * ${input.factorValue} kgCO2e/${input.factorUnit}`,
    };
  }
}
