/**
 * Enterprise Numeric and Decimal Formatting Utilities for CarbonIQ Logistics
 *
 * Provides defensive type-coercion and formatting for data incoming from
 * Prisma Decimal fields, string-serialized JSON responses, or raw calculations.
 * Completely immune to `TypeError: val.toFixed is not a function`.
 */

/**
 * Coerces any unknown value (string, Decimal, null, undefined, NaN) to a safe JavaScript number.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely formats any value with fixed decimal places.
 * Returns `fallback` if value is null, undefined, or not a valid number.
 */
export function formatNum(val: unknown, decimals = 2, fallback = '-'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return num.toFixed(decimals);
}

/**
 * Safely formats geographical coordinates (latitude / longitude).
 */
export function formatCoord(val: unknown, decimals = 4): string {
  if (val === null || val === undefined || val === '') return '-';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '-';
  return num.toFixed(decimals);
}

/**
 * Safely formats weight in kilograms or metric tonnes with localized comma separators.
 */
export function formatWeight(valKg: unknown, inTonnes = false, fallback = '-'): string {
  if (valKg === null || valKg === undefined || valKg === '') return fallback;
  const num = typeof valKg === 'number' ? valKg : Number(valKg);
  if (isNaN(num)) return fallback;

  if (inTonnes) {
    return `${(num / 1000).toFixed(2)} t`;
  }
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

/**
 * Safely formats volume in cubic meters.
 */
export function formatVolume(valM3: unknown, decimals = 2, fallback = '0 m³'): string {
  if (valM3 === null || valM3 === undefined || valM3 === '') return fallback;
  const num = typeof valM3 === 'number' ? valM3 : Number(valM3);
  if (isNaN(num)) return fallback;
  return `${num.toFixed(decimals)} m³`;
}

/**
 * Safely formats a percentage value (e.g. 84.5%).
 */
export function formatPercent(val: unknown, decimals = 1, fallback = '—'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return `${num.toFixed(decimals)}%`;
}
