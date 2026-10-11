import { Decimal } from 'decimal.js';
import { ICalculationStrategy, NormalizedActivityInput } from '../ICalculationStrategy';

function extractNumeric(fields: Record<string, any>, keys: string[]): number {
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null) {
      const v = fields[k]?.value ?? fields[k];
      const num = Number(String(v).replace(/,/g, '').trim());
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

/**
 * Hotel Nights Strategy
 * 
 * Formula: CO₂e = number_of_nights × country_factor (kgCO₂e/room-night)
 * 
 * Source: DEFRA 2024, Cornell Hotel Sustainability Benchmarking Index
 * Use case: GHG Protocol Scope 3 Category 6 (Business Travel — accommodation)
 * 
 * Room-night emission factors vary significantly by country:
 *   UK: 18.39 kgCO₂e/night (DEFRA 2024)
 *   US: 29.60 kgCO₂e/night (Cornell HTR)
 *   EU avg: 20.60 kgCO₂e/night
 *   APAC avg: 33.20 kgCO₂e/night
 *   Global avg: 25.40 kgCO₂e/night
 */
export class HotelNightsStrategy implements ICalculationStrategy {
  readonly strategyKey = 'HOTEL_NIGHTS';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    const fields = input.fields || {};

    // Try to extract number of room-nights
    const nights = extractNumeric(fields, [
      'nights', 'roomNights', 'hotelNights', 'numberOfNights',
      'stayDuration', 'duration', 'quantity',
    ]);

    // If nights found in fields, use that; otherwise use the pre-converted input.value
    const totalNights = nights > 0 ? new Decimal(nights) : input.value;

    // Number of rooms (default 1)
    const rooms = extractNumeric(fields, ['rooms', 'numberOfRooms', 'roomCount']) || 1;

    return totalNights.mul(rooms).mul(factorValue);
  }
}
