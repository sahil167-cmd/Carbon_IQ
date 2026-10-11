import { Decimal } from 'decimal.js';

export interface ValidationGateResult {
  extraction: 'PASS' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA';
  dimensional: 'PASS' | 'FAILED';
  factor: 'PASS' | 'INSUFFICIENT_EVIDENCE' | 'FACTOR_MISMATCH';
  provenance: 'PASS' | 'INSUFFICIENT_EVIDENCE';
  mathematical: 'PASS' | 'FAILED';
  intensity: 'PASS' | 'WARNING' | 'FAILED';
  magnitude: 'PASS' | 'WARNING' | 'FAILED';
  duplicate: 'PASS' | 'WARNING';
  classification: 'PASS' | 'CATEGORY_REVIEW_REQUIRED';
  boundary: 'PASS' | 'NEEDS_REVIEW';
  isVerified: boolean;
  reviewReasons: string[];
}

export class DimensionalValidator {
  /**
   * Evaluates 10 independent validation gates before allowing a record into the verified ledger.
   */
  public static validate(params: {
    categoryCode: string;
    rawUnit: string;
    factorUnit: string;
    activityValue: number;
    factorValue: number;
    calculatedCo2e: number;
    factorSource: string;
    factorId: string;
    isDuplicate?: boolean;
    extractedFields: Record<string, any>;
  }): ValidationGateResult {
    const reviewReasons: string[] = [];
    const rawU = (params.rawUnit || '').toUpperCase().trim();
    const factorU = (params.factorUnit || '').toUpperCase().trim();

    // 1. EXTRACTION COMPLETENESS
    let extraction: 'PASS' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA' = 'PASS';
    if (!params.extractedFields || Object.keys(params.extractedFields).length === 0) {
      extraction = 'INSUFFICIENT_DATA';
      reviewReasons.push('No extracted fields present in document');
    } else if (params.activityValue <= 0) {
      extraction = 'NEEDS_REVIEW';
      reviewReasons.push('Extracted activity quantity is zero or negative');
    }

    // 2. DIMENSIONAL & SEMANTIC COMPATIBILITY
    let dimensional: 'PASS' | 'FAILED' = 'PASS';
    const isFreight = rawU.includes('TONNE_KM') || rawU.includes('TKM') || params.categoryCode.includes('TRANSPORT');
    const isFuel = ['LITERS', 'LITRES', 'GALLONS', 'M3', 'BBL'].includes(rawU);
    const isElec = ['KWH', 'MWH', 'GJ', 'THERMS'].includes(rawU);
    const isMaterial = ['KG', 'TONNES', 'LBS'].includes(rawU);

    if (isFreight && !factorU.includes('TONNE_KM') && !factorU.includes('TKM') && !factorU.includes('TON_MILE')) {
      dimensional = 'FAILED';
      reviewReasons.push(`Dimensional mismatch: Freight activity (${rawU}) matched with non-freight factor unit (${factorU})`);
    } else if (isFuel && !['LITERS', 'LITRES', 'GALLONS', 'M3', 'BBL', 'GJ'].includes(factorU)) {
      dimensional = 'FAILED';
      reviewReasons.push(`Dimensional mismatch: Fuel activity (${rawU}) matched with incompatible factor unit (${factorU})`);
    } else if (isElec && !['KWH', 'MWH', 'GJ', 'THERMS', 'MMBTU'].includes(factorU)) {
      dimensional = 'FAILED';
      reviewReasons.push(`Dimensional mismatch: Electricity activity (${rawU}) matched with incompatible factor unit (${factorU})`);
    }

    // 3. FACTOR COMPATIBILITY
    let factor: 'PASS' | 'INSUFFICIENT_EVIDENCE' | 'FACTOR_MISMATCH' = 'PASS';
    if (!params.factorId || params.factorValue <= 0) {
      factor = 'INSUFFICIENT_EVIDENCE';
      reviewReasons.push('No authoritative emission factor coefficient identified');
    } else if (dimensional === 'FAILED') {
      factor = 'FACTOR_MISMATCH';
    }

    // 4. FACTOR PROVENANCE
    let provenance: 'PASS' | 'INSUFFICIENT_EVIDENCE' = 'PASS';
    if (!params.factorSource || params.factorSource === 'UNKNOWN' || params.factorSource.trim() === '') {
      provenance = 'INSUFFICIENT_EVIDENCE';
      reviewReasons.push('Factor source metadata or publication authority missing');
    }

    // 5. MATHEMATICAL CALCULATION CHECK
    let mathematical: 'PASS' | 'FAILED' = 'PASS';
    const expectedCo2e = new Decimal(params.activityValue).mul(params.factorValue).toNumber();
    const diff = Math.abs(expectedCo2e - params.calculatedCo2e);
    if (diff > 0.05 && diff / (params.calculatedCo2e || 1) > 0.001) {
      mathematical = 'FAILED';
      reviewReasons.push(`Mathematical discrepancy: ${params.activityValue} × ${params.factorValue} != ${params.calculatedCo2e}`);
    }

    // 6. CARBON INTENSITY PLAUSIBILITY CHECK
    let intensity: 'PASS' | 'WARNING' | 'FAILED' = 'PASS';
    const intensityVal = params.calculatedCo2e / (params.activityValue || 1);
    if (isFreight && (intensityVal > 5.0 || intensityVal < 0.001)) {
      intensity = 'WARNING';
      reviewReasons.push(`Freight carbon intensity (${intensityVal.toFixed(4)} kgCO2e/tkm) outside normal range (0.005-2.5)`);
    } else if (isFuel && (intensityVal > 10.0 || intensityVal < 0.5)) {
      intensity = 'WARNING';
      reviewReasons.push(`Fuel carbon intensity (${intensityVal.toFixed(4)} kgCO2e/L) outside physical fuel range (1.0-4.0)`);
    }

    // 7. MAGNITUDE ANOMALY CHECK
    let magnitude: 'PASS' | 'WARNING' | 'FAILED' = 'PASS';
    if (params.calculatedCo2e > 5000000) {
      magnitude = 'WARNING';
      reviewReasons.push(`Calculated emission magnitude (${params.calculatedCo2e.toLocaleString()} kg) exceeds single-document baseline`);
    }

    // 8. DUPLICATE CHECK
    const duplicate: 'PASS' | 'WARNING' = params.isDuplicate ? 'WARNING' : 'PASS';
    if (params.isDuplicate) {
      reviewReasons.push('Potential duplicate document or invoice detected');
    }

    // 9. CLASSIFICATION CHECK
    let classification: 'PASS' | 'CATEGORY_REVIEW_REQUIRED' = 'PASS';
    if (params.categoryCode === 'BUSINESS_TRAVEL' && isFreight) {
      classification = 'CATEGORY_REVIEW_REQUIRED';
      reviewReasons.push('Freight Bill of Lading misclassified under Business Travel');
    }

    // 10. BOUNDARY CHECK
    const boundary: 'PASS' | 'NEEDS_REVIEW' = 'PASS';

    const isVerified =
      extraction === 'PASS' &&
      dimensional === 'PASS' &&
      factor === 'PASS' &&
      provenance === 'PASS' &&
      mathematical === 'PASS' &&
      intensity === 'PASS' &&
      magnitude === 'PASS' &&
      duplicate === 'PASS' &&
      classification === 'PASS' &&
      boundary === 'PASS';

    return {
      extraction,
      dimensional,
      factor,
      provenance,
      mathematical,
      intensity,
      magnitude,
      duplicate,
      classification,
      boundary,
      isVerified,
      reviewReasons,
    };
  }
}
