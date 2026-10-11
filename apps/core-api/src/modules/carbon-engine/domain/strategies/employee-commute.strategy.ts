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
 * Employee Commuting Strategy
 * 
 * Formula: CO₂e = employees × avg_one_way_km × 2 × working_days_per_year × mode_factor
 *
 * Source: GHG Protocol Scope 3 Standard, Category 7 / DEFRA 2024
 * 
 * Default assumptions (can be overridden by extracted fields):
 *   - Working days per year: 230 (deducting holidays/leave from 260)
 *   - Average one-way commute: 15 km (DEFRA default)
 *   - Round trip multiplier: 2
 * 
 * When detailed employee survey data is unavailable, the formula uses:
 *   CO₂e = employees × avg_distance_km × 2 × working_days × factor
 * 
 * When provided, pre-calculated total passenger-km is used directly:
 *   CO₂e = total_pkm × factor
 */
export class EmployeeCommuteStrategy implements ICalculationStrategy {
  readonly strategyKey = 'EMPLOYEE_COMMUTE';

  calculate(input: NormalizedActivityInput, factorValue: Decimal): Decimal {
    const fields = input.fields || {};

    // If total passenger-km or total distance already provided, use directly
    const totalPkm = extractNumeric(fields, [
      'totalPassengerKm', 'totalPkm', 'passengerKm', 'totalDistanceKm',
    ]);
    if (totalPkm > 0) {
      return new Decimal(totalPkm).mul(factorValue);
    }

    // Otherwise compute from employee count × distance × working days
    const employees = extractNumeric(fields, [
      'employees', 'employeeCount', 'headcount', 'numberOfEmployees', 'fteCount',
    ]);
    const avgDistanceKm = extractNumeric(fields, [
      'avgDistanceKm', 'commuteDistanceKm', 'averageOneWayKm', 'distanceKm',
    ]) || 15; // DEFRA default 15 km one-way

    const workingDays = extractNumeric(fields, [
      'workingDaysPerYear', 'workingDays', 'daysPerYear',
    ]) || 230; // 52 weeks × 5 days - 30 days leave/holidays

    const roundTrip = 2;
    const totalAnnualKm = employees * avgDistanceKm * roundTrip * workingDays;

    return new Decimal(totalAnnualKm).mul(factorValue);
  }
}
