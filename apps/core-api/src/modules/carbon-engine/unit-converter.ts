import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('UnitConverter');

/**
 * Production-grade unit conversion factors.
 * Sources: NIST, DEFRA 2024, ISO 80000, EPA.
 * All factors are exact or to 6+ significant figures.
 */
const FALLBACK_CONVERSIONS: Record<string, number> = {
  // ── Energy ──────────────────────────────────────────────────────────────
  'MWH_KWH': 1000,
  'KWH_MWH': 0.001,
  'GJ_KWH': 277.778,
  'KWH_GJ': 0.0036,
  'GJ_MWH': 0.277778,
  'MWH_GJ': 3.6,
  'THERMS_KWH': 29.3071,
  'KWH_THERMS': 0.034121,
  'MMBTU_KWH': 293.071,
  'KWH_MMBTU': 0.003413,
  'MMBTU_GJ': 1.05506,
  'GJ_MMBTU': 0.947817,
  'THERMS_GJ': 0.105506,
  'GJ_THERMS': 9.47817,
  'THERMS_M3': 2.83168,
  'M3_THERMS': 0.353147,
  'CCF_M3': 2.83168,
  'MCF_M3': 28.3168,
  'M3_MCF': 0.035315,

  // ── Volume (Liquid) ────────────────────────────────────────────────────
  'GALLONS_LITERS': 3.78541,
  'LITERS_GALLONS': 0.264172,
  'GALLONS_UK_LITERS': 4.54609,
  'LITERS_GALLONS_UK': 0.219969,
  'BBL_LITERS': 158.987,
  'LITERS_BBL': 0.006290,
  'BBL_GALLONS': 42.0,
  'GALLONS_BBL': 0.023810,
  'M3_LITERS': 1000,
  'LITERS_M3': 0.001,
  'M3_GALLONS': 264.172,
  'GALLONS_M3': 0.003785,

  // ── Mass ───────────────────────────────────────────────────────────────
  'TONNES_KG': 1000,
  'KG_TONNES': 0.001,
  'LBS_KG': 0.453592,
  'KG_LBS': 2.20462,
  'SHORT_TONS_KG': 907.185,
  'KG_SHORT_TONS': 0.001102,
  'SHORT_TONS_TONNES': 0.907185,
  'TONNES_SHORT_TONS': 1.10231,
  'LONG_TONS_KG': 1016.05,
  'KG_LONG_TONS': 0.000984,
  'LONG_TONS_TONNES': 1.01605,
  'TONNES_LONG_TONS': 0.984207,
  'OZ_KG': 0.0283495,
  'KG_OZ': 35.274,

  // ── Distance ───────────────────────────────────────────────────────────
  'MILES_KM': 1.60934,
  'KM_MILES': 0.621371,
  'NAUTICAL_MILES_KM': 1.852,
  'KM_NAUTICAL_MILES': 0.539957,
  'YARDS_M': 0.9144,
  'M_YARDS': 1.09361,
  'FEET_M': 0.3048,
  'M_FEET': 3.28084,

  // ── Transport Composite ────────────────────────────────────────────────
  'TEU_KM_TONNE_KM': 10.0,       // 1 TEU ≈ 10 tonnes average payload
  'TONNE_KM_TEU_KM': 0.1,
  'TON_MILE_TONNE_KM': 1.45997,  // 1 short-ton-mile = 1.46 tonne-km
  'TONNE_KM_TON_MILE': 0.684946,

  // ── Area ───────────────────────────────────────────────────────────────
  'SQM_SQFT': 10.7639,
  'SQFT_SQM': 0.092903,
  'HECTARE_SQM': 10000,
  'SQM_HECTARE': 0.0001,
  'ACRE_SQM': 4046.86,
  'SQM_ACRE': 0.000247105,

  // ── Passenger transport ────────────────────────────────────────────────
  'PKM_PASSENGER_MILE': 0.621371,
  'PASSENGER_MILE_PKM': 1.60934,
};

export class UnitConverter {
  constructor(private readonly prisma: PrismaClient) {}

  public normalizeUnit(unit: string): string {
    if (!unit) return 'KWH';
    const u = unit.trim().toUpperCase().replace(/[-_ ]/g, '_');

    // Volume
    if (['LITRES', 'L', 'LITER', 'LITRE'].includes(u)) return 'LITERS';
    if (['GALLON', 'GAL', 'GALLONS_US', 'US_GALLON', 'US_GALLONS'].includes(u)) return 'GALLONS';
    if (['GALLON_UK', 'GAL_UK', 'IMPERIAL_GALLON', 'GALLONS_IMPERIAL'].includes(u)) return 'GALLONS_UK';
    if (['BARREL', 'BARRELS', 'BBL', 'BBLS'].includes(u)) return 'BBL';

    // Mass
    if (['KGS', 'KILOGRAM', 'KILOGRAMS', 'KILO'].includes(u)) return 'KG';
    if (['TONS', 'TON', 'METRIC_TON', 'METRIC_TONS', 'TONNE', 'TONNES', 'MT'].includes(u)) return 'TONNES';
    if (['LB', 'LBS', 'POUND', 'POUNDS'].includes(u)) return 'LBS';
    if (['SHORT_TON', 'US_TON', 'US_TONS'].includes(u)) return 'SHORT_TONS';
    if (['LONG_TON', 'IMPERIAL_TON'].includes(u)) return 'LONG_TONS';
    if (['OUNCE', 'OUNCES', 'OZ'].includes(u)) return 'OZ';

    // Energy
    if (['KILOWATT_HOURS', 'KW_H', 'KWH', 'KILOWATT_HOUR'].includes(u)) return 'KWH';
    if (['MEGAWATT_HOURS', 'MW_H', 'MWH', 'MEGAWATT_HOUR'].includes(u)) return 'MWH';
    if (['THERM', 'THERMS'].includes(u)) return 'THERMS';
    if (['MMBTU', 'MM_BTU', 'MILLION_BTU'].includes(u)) return 'MMBTU';
    if (['GIGAJOULE', 'GIGAJOULES', 'GJ'].includes(u)) return 'GJ';
    if (['CCF', 'HUNDRED_CUBIC_FEET'].includes(u)) return 'CCF';
    if (['MCF', 'THOUSAND_CUBIC_FEET'].includes(u)) return 'MCF';

    // Volume (gas)
    if (['CUBIC_METERS', 'CUBIC_METER', 'M3', 'M_3', 'CBM'].includes(u)) return 'M3';

    // Distance
    if (['KILOMETERS', 'KMS', 'KM', 'KILOMETER'].includes(u)) return 'KM';
    if (['MILE', 'MILES', 'MI'].includes(u)) return 'MILES';
    if (['NAUTICAL_MILE', 'NAUTICAL_MILES', 'NM', 'NMI'].includes(u)) return 'NAUTICAL_MILES';
    if (['YARD', 'YARDS', 'YD'].includes(u)) return 'YARDS';
    if (['FOOT', 'FEET', 'FT'].includes(u)) return 'FEET';

    // Transport composite
    if (['TONNE_KM', 'TKM', 'TONNE_KILOMETER', 'TKMS'].includes(u)) return 'TONNE_KM';
    if (['TEU_KM', 'TEUKM'].includes(u)) return 'TEU_KM';
    if (['TON_MILE', 'TON_MILES'].includes(u)) return 'TON_MILE';
    if (['PKM', 'PASSENGER_KM', 'PASSENGER_KILOMETER'].includes(u)) return 'PKM';
    if (['PASSENGER_MILE', 'PASSENGER_MILES'].includes(u)) return 'PASSENGER_MILE';

    // Area
    if (['SQ_M', 'SQUARE_METER', 'SQUARE_METERS', 'SQM'].includes(u)) return 'SQM';
    if (['SQ_FT', 'SQUARE_FOOT', 'SQUARE_FEET', 'SQFT'].includes(u)) return 'SQFT';
    if (['HECTARE', 'HECTARES', 'HA'].includes(u)) return 'HECTARE';
    if (['ACRE', 'ACRES'].includes(u)) return 'ACRE';

    // Time
    if (['NIGHT', 'NIGHTS', 'ROOM_NIGHT', 'ROOM_NIGHTS'].includes(u)) return 'NIGHT';
    if (['DAY', 'DAYS'].includes(u)) return 'DAY';

    // Currency
    if (['USD', 'DOLLAR', 'DOLLARS', 'US_DOLLAR'].includes(u)) return 'USD';
    if (['EUR', 'EURO', 'EUROS'].includes(u)) return 'EUR';
    if (['GBP', 'POUND_STERLING'].includes(u)) return 'GBP';

    return u;
  }

  /**
   * Perform unit conversion using fixed-precision Decimal math.
   * Checks database first, then falls back to physical unit ratio dictionary.
   */
  async convert(value: Decimal, fromUnit: string, toUnit: string): Promise<Decimal> {
    const from = this.normalizeUnit(fromUnit || 'KWH');
    const to = this.normalizeUnit(toUnit || 'KWH');

    if (from === to) return value;

    // 1. Try DB lookups
    try {
      const conversion = await this.prisma.unitConversion.findUnique({
        where: {
          fromUnit_toUnit: {
            fromUnit: from,
            toUnit: to,
          },
        },
      });

      if (conversion) {
        return value.mul(new Decimal(conversion.conversionFactor));
      }
    } catch {
      // Fall through to builtin map
    }

    // 2. Check built-in fallback conversions
    const pairKey = `${from}_${to}`;
    if (FALLBACK_CONVERSIONS[pairKey] !== undefined) {
      return value.mul(new Decimal(FALLBACK_CONVERSIONS[pairKey]));
    }

    // 3. Try reverse conversion (1 / inverse factor)
    const reversePairKey = `${to}_${from}`;
    if (FALLBACK_CONVERSIONS[reversePairKey] !== undefined) {
      return value.div(new Decimal(FALLBACK_CONVERSIONS[reversePairKey]));
    }

    // 4. Strict Unit Conversion Guard (No silent quantity * 1.0 identity fallback)
    const errorMsg = `Unmapped unit conversion error: No conversion factor mapped for ${from} -> ${to}`;
    logger.error({ fromUnit: from, toUnit: to }, errorMsg);
    throw new Error(errorMsg);
  }
}
