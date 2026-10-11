import { DimensionUnit, WeightUnit, Prisma } from '@prisma/client';
import { ValidationError } from '../../../core/errors/app.error';

/**
 * UnitNormalizer
 *
 * Explicit, audit-grade conversion from Prisma persistence Decimal & Unit values
 * to normalized integer millimetres (mm) and integer grams (g) required by CargoPackingEngine.
 * Zero silent unit assumptions.
 */
export class UnitNormalizer {
  /**
   * Converts a linear dimension into integer millimetres (mm).
   * Rejects non-positive or undefined inputs.
   */
  public static toIntegerMm(
    value: Prisma.Decimal | number | string | null | undefined,
    unit: DimensionUnit | string | null | undefined,
    fieldName = 'dimension',
  ): number {
    if (value === null || value === undefined) {
      throw new ValidationError(`Missing required dimension field: ${fieldName}`);
    }

    const dec = new Prisma.Decimal(value);
    if (dec.lessThanOrEqualTo(0)) {
      throw new ValidationError(`Field ${fieldName} must be positive, received: ${dec.toString()}`);
    }

    const effectiveUnit = unit || DimensionUnit.CM;

    switch (effectiveUnit) {
      case DimensionUnit.MM:
      case 'MM':
        return dec.round().toNumber();

      case DimensionUnit.CM:
      case 'CM':
        return dec.mul(10).round().toNumber();

      case DimensionUnit.M:
      case 'M':
        return dec.mul(1000).round().toNumber();

      case DimensionUnit.INCH:
      case 'INCH':
      case 'IN':
        // 1 inch = 25.4 mm exactly
        return dec.mul(new Prisma.Decimal('25.4')).round().toNumber();

      default:
        throw new ValidationError(`Unsupported dimension unit: '${effectiveUnit}' for field ${fieldName}`);
    }
  }

  /**
   * Converts a mass/weight value into integer grams (g).
   * Rejects non-positive or undefined inputs.
   */
  public static toIntegerGrams(
    value: Prisma.Decimal | number | string | null | undefined,
    unit: WeightUnit | string | null | undefined,
    fieldName = 'weight',
  ): number {
    if (value === null || value === undefined) {
      throw new ValidationError(`Missing required weight field: ${fieldName}`);
    }

    const dec = new Prisma.Decimal(value);
    if (dec.lessThanOrEqualTo(0)) {
      throw new ValidationError(`Field ${fieldName} must be positive, received: ${dec.toString()}`);
    }

    const effectiveUnit = unit || WeightUnit.KG;

    switch (effectiveUnit) {
      case WeightUnit.G:
      case 'G':
      case 'GRAM':
      case 'GRAMS':
        return dec.round().toNumber();

      case WeightUnit.KG:
      case 'KG':
      case 'KILOGRAM':
      case 'KILOGRAMS':
        return dec.mul(1000).round().toNumber();

      case WeightUnit.TONNE:
      case 'TONNE':
      case 'TONNES':
      case 'T':
      case 'MT':
        return dec.mul(1_000_000).round().toNumber();

      case WeightUnit.LBS:
      case 'LBS':
      case 'LB':
      case 'POUND':
      case 'POUNDS':
        // 1 lb = 453.59237 grams exactly
        return dec.mul(new Prisma.Decimal('453.59237')).round().toNumber();

      default:
        throw new ValidationError(`Unsupported weight unit: '${effectiveUnit}' for field ${fieldName}`);
    }
  }

  /**
   * Converts an optional max stack weight (in the item's weight unit) to integer grams.
   */
  public static toOptionalIntegerGrams(
    value: Prisma.Decimal | number | string | null | undefined,
    unit: WeightUnit | string | null | undefined,
    fieldName = 'maxStackWeight',
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const dec = new Prisma.Decimal(value);
    if (dec.lessThanOrEqualTo(0)) {
      return undefined;
    }
    return this.toIntegerGrams(dec, unit, fieldName);
  }
}
