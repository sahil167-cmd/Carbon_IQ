import { createLogger } from '../../core/logging/logger';

const logger = createLogger('UnitConverter');

export class UnitConverter {
  private static readonly conversionMap: Record<string, number> = {
    // Volume conversions
    'GALLONS->LITERS': 3.78541,
    'LITERS->LITERS': 1.0,
    'M3->LITERS': 1000.0,
    'LITERS->M3': 0.001,

    // Mass conversions
    'LBS->KG': 0.453592,
    'KG->KG': 1.0,
    'TONNES->KG': 1000.0,
    'KG->TONNES': 0.001,
    'TONS->KG': 907.185,

    // Distance conversions
    'MILES->KM': 1.60934,
    'KM->KM': 1.0,

    // Energy conversions
    'MWH->KWH': 1000.0,
    'KWH->KWH': 1.0,

    // Tonne-km conversions
    'TONNE_KM->TONNE_KM': 1.0,
    'TON_MILES->TONNE_KM': 1.45997,

    // Mass-to-Volume Density Conversions (Fuel Density: 1 kg = 1.1976 Liters)
    'KG->LITERS': 1.1976,
    'LITERS->KG': 0.835,
    'TONNES->LITERS': 1197.6,
    'LITERS->TONNES': 0.000835,

    // Energy to Mass / Volume Fallbacks
    'KWH->LITERS': 0.264,
    'LITERS->KWH': 3.788,
    'KWH->KG': 0.220,
    'KG->KWH': 4.545,
  };

  private static normalizeUnit(unit: string): string {
    const u = unit.trim().toUpperCase();
    if (u === 'LITRES' || u === 'L' || u === 'LITER') return 'LITERS';
    if (u === 'KGS' || u === 'KILOGRAM' || u === 'KILOGRAMS') return 'KG';
    if (u === 'KILOWATT_HOURS' || u === 'KW-H' || u === 'KWH') return 'KWH';
    if (u === 'KILOMETERS' || u === 'KMS' || u === 'KM') return 'KM';
    if (u === 'TONS' || u === 'METRIC_TONS') return 'TONNES';
    return u;
  }

  /** Perform fixed-precision unit conversion scaling with fuel density & fallback (FWS §9.1 & TRD §9.3) */
  static convert(value: number, fromUnit: string, toUnit: string): number {
    const from = this.normalizeUnit(fromUnit || 'LITERS');
    const to = this.normalizeUnit(toUnit || 'LITERS');

    if (from === to) return value;

    const key = `${from}->${to}`;
    const factor = this.conversionMap[key];

    if (!factor) {
      logger.warn({ fromUnit, toUnit }, `Unmapped unit pair "${from}->${to}", applying 1:1 fallback scaling`);
      return value;
    }

    const converted = value * factor;
    return Number(converted.toFixed(6));
  }
}
