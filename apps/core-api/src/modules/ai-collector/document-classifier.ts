import { ScopeType } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('DocumentClassifier');

export type DocumentClassificationType =
  | 'ELECTRICITY'
  | 'FUEL_STATIONARY'
  | 'FUEL_MOBILE'
  | 'PURCHASED_GOODS'
  | 'FREIGHT'
  | 'BUSINESS_TRAVEL'
  | 'WASTE'
  | 'FUGITIVE'
  | 'RENEWABLE_ENERGY'
  | 'OTHER';

export interface DocumentClassificationResult {
  documentType: DocumentClassificationType;
  scope: ScopeType;
  scope3Category?: number;
  confidence: number;
  detectedKeywords: string[];
}

export class DocumentClassifier {
  /**
   * Classify document prior to extraction using text analysis and structural cues.
   * Does NOT make carbon calculations or invent facts.
   */
  public classify(rawText: string, fileName?: string): DocumentClassificationResult {
    const text = (rawText || '').toUpperCase();
    const fname = (fileName || '').toUpperCase();
    const combined = `${fname} ${text}`;

    const keywordsFound: string[] = [];

    // 1. FREIGHT / TRANSPORT
    if (
      /BILL OF LADING|WAYBILL|AWB-|BOL-|CONTAINER|FREIGHT|LOGISTICS|CARGO|INTERMODAL|TONNE-KM|OCEAN FREIGHT|ROAD FREIGHT|AIR FREIGHT/i.test(
        combined
      )
    ) {
      keywordsFound.push('FREIGHT', 'LOGISTICS');
      return {
        documentType: 'FREIGHT',
        scope: ScopeType.SCOPE_3,
        scope3Category: 4, // Upstream transportation and distribution
        confidence: 0.95,
        detectedKeywords: keywordsFound,
      };
    }

    // 2. STATIONARY FUEL (Diesel Genset, Natural Gas, LPG, Generators)
    if (
      /NATURAL GAS|PIPELINE|MMBTU|THERM|THERMS|ATMOS ENERGY|GENERATOR|GENSET|TANK-GEN|DIESEL FUEL|HEAVY FUEL OIL|PROPANE|LPG CYLINDER/i.test(
        combined
      )
    ) {
      keywordsFound.push('STATIONARY_COMBUSTION');
      return {
        documentType: 'FUEL_STATIONARY',
        scope: ScopeType.SCOPE_1,
        confidence: 0.94,
        detectedKeywords: keywordsFound,
      };
    }

    // 3. MOBILE FLEET FUEL (Fleet Receipts, Petrol/Diesel, Vehicles)
    if (
      /SHELL FLEET|PETROL|GASOLINE|PUMP RECEIPT|FUEL CARD|CNG|VEHICLE NO|ODOMETER/i.test(
        combined
      )
    ) {
      keywordsFound.push('MOBILE_COMBUSTION');
      return {
        documentType: 'FUEL_MOBILE',
        scope: ScopeType.SCOPE_1,
        confidence: 0.93,
        detectedKeywords: keywordsFound,
      };
    }

    // 4. ELECTRICITY & UTILITIES
    if (
      /KWH|MWH|ELECTRICITY|POWER UTILITY|UTILITY BILL|METER READ|TAVERTON|CONEDISON|TATA POWER|VATTENFALL|GRID DRAW|DEMAND CHARGE/i.test(
        combined
      )
    ) {
      keywordsFound.push('ELECTRICITY', 'KWH');
      const isRenewable = /REC|RENEWABLE|GUARANTEE OF ORIGIN|GREEN TARIFF|SOLAR PPA/i.test(combined);
      return {
        documentType: isRenewable ? 'RENEWABLE_ENERGY' : 'ELECTRICITY',
        scope: ScopeType.SCOPE_2,
        confidence: 0.96,
        detectedKeywords: keywordsFound,
      };
    }

    // 5. FUGITIVE EMISSIONS / REFRIGERANTS
    if (/R-134A|R404A|R410A|REFRIGERANT|CHILLER REFILL|HVAC SERVICE|LEAK RECHARGE|GWP/i.test(combined)) {
      keywordsFound.push('REFRIGERANTS');
      return {
        documentType: 'FUGITIVE',
        scope: ScopeType.SCOPE_1,
        confidence: 0.92,
        detectedKeywords: keywordsFound,
      };
    }

    // 6. PURCHASED GOODS & MATERIALS (Steel, Aluminium, Cement, Packaging)
    if (
      /STEEL|ALUMINIUM|ALUMINUM|CEMENT|RAW MATERIAL|PURCHASE ORDER|ARCELORMITTAL|PACKAGING|CHEMICAL|INVOICE/i.test(
        combined
      )
    ) {
      keywordsFound.push('PURCHASED_GOODS');
      return {
        documentType: 'PURCHASED_GOODS',
        scope: ScopeType.SCOPE_3,
        scope3Category: 1, // Category 1: Purchased Goods and Services
        confidence: 0.91,
        detectedKeywords: keywordsFound,
      };
    }

    // 7. BUSINESS TRAVEL
    if (/FLIGHT|AIRLINE|HOTEL|LODGING|ROOM NIGHT|PASSENGER|RAIL TICKET|TICKET NO/i.test(combined)) {
      keywordsFound.push('BUSINESS_TRAVEL');
      return {
        documentType: 'BUSINESS_TRAVEL',
        scope: ScopeType.SCOPE_3,
        scope3Category: 6, // Category 6: Business travel
        confidence: 0.90,
        detectedKeywords: keywordsFound,
      };
    }

    // 8. WASTE MANAGEMENT
    if (/WASTE|LANDFILL|RECYCLING|DISPOSAL|HAZARDOUS WASTE|COMPOST/i.test(combined)) {
      keywordsFound.push('WASTE');
      return {
        documentType: 'WASTE',
        scope: ScopeType.SCOPE_3,
        scope3Category: 5, // Category 5: Waste generated in operations
        confidence: 0.89,
        detectedKeywords: keywordsFound,
      };
    }

    logger.info({ fileName }, 'Document classifier defaulted to OTHER category');
    return {
      documentType: 'OTHER',
      scope: ScopeType.SCOPE_3,
      confidence: 0.50,
      detectedKeywords: [],
    };
  }
}
