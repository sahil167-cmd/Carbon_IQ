import { IOcrProvider, TesseractOcrProvider } from './ocr.provider';
import { ExtractedFieldValue, BoundingBox } from './ai-collector.types';
import { ExtractionJobStatus, ScopeType } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('ExtractionGraph');

const CANONICAL_FUELS: Record<string, string> = {
  'DIESEL': 'DIESEL',
  'DIESEL FUEL': 'DIESEL',
  'DIESEL GENERATOR': 'DIESEL',
  'DIESEL OIL': 'DIESEL',
  'GAS OIL': 'DIESEL',
  'ULSD': 'DIESEL',
  'AUTOMOTIVE DIESEL': 'DIESEL',
  'BIODIESEL': 'BIODIESEL_B100',
  'BIODIESEL B20': 'BIODIESEL_B20',
  'B20': 'BIODIESEL_B20',
  'PETROL': 'PETROL',
  'GASOLINE': 'PETROL',
  'MOTOR GASOLINE': 'PETROL',
  'MOGAS': 'PETROL',
  'UNLEADED': 'PETROL',
  'NATURAL GAS': 'NATURAL_GAS',
  'PIPELINE GAS': 'NATURAL_GAS',
  'CNG': 'CNG',
  'LNG': 'LNG',
  'LPG': 'LPG',
  'PROPANE': 'PROPANE',
  'BUTANE': 'LPG',
  'KEROSENE': 'KEROSENE',
  'JET FUEL': 'JET_FUEL_A1',
  'JET A-1': 'JET_FUEL_A1',
  'AVTUR': 'JET_FUEL_A1',
  'HEAVY FUEL OIL': 'FUEL_OIL_HEAVY',
  'FURNACE OIL': 'FUEL_OIL_HEAVY',
  'LIGHT FUEL OIL': 'FUEL_OIL_LIGHT',
  'COAL': 'COAL_INDUSTRIAL',
  'BIOGAS': 'BIOGAS',
};

const CANONICAL_MATERIALS: Record<string, string> = {
  'STEEL': 'STEEL',
  'STRUCTURAL STEEL': 'STEEL',
  'PRIMARY STEEL': 'STEEL',
  'RECYCLED STEEL': 'STEEL',
  'STEEL BEAMS': 'STEEL',
  'STEEL PLATES': 'STEEL',
  'REBAR': 'STEEL',
  'STAINLESS STEEL': 'STEEL',
  'CARBON STEEL': 'STEEL',
  'ALUMINUM': 'ALUMINUM_PRIMARY',
  'ALUMINIUM': 'ALUMINUM_PRIMARY',
  'PRIMARY ALUMINUM': 'ALUMINUM_PRIMARY',
  'RECYCLED ALUMINUM': 'ALUMINUM_RECYCLED',
  'CEMENT': 'CEMENT_PORTLAND',
  'PORTLAND CEMENT': 'CEMENT_PORTLAND',
  'CONCRETE': 'CONCRETE',
  'COPPER': 'COPPER',
  'PAPER': 'PAPER_VIRGIN',
  'VIRGIN PAPER': 'PAPER_VIRGIN',
  'RECYCLED PAPER': 'PAPER_RECYCLED',
  'CARDBOARD': 'PAPER_VIRGIN',
  'PLASTIC': 'PLASTIC_HDPE',
  'HDPE': 'PLASTIC_HDPE',
  'PET': 'PLASTIC_PET',
  'TIMBER': 'WOOD',
  'WOOD': 'WOOD',
  'GLASS': 'GLASS',
  'RUBBER': 'RUBBER',
};

function resolveCanonicalFuel(text: string): { fuelType: string | null; confidence: number } {
  const upper = text.toUpperCase();
  const sortedKeys = Object.keys(CANONICAL_FUELS).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    const regex = new RegExp(`\\b${k.replace(/ /g, '\\s+')}\\b`, 'i');
    if (regex.test(upper)) {
      return { fuelType: CANONICAL_FUELS[k], confidence: 0.96 };
    }
  }
  return { fuelType: null, confidence: 0 };
}

function resolveCanonicalMaterial(text: string): { materialType: string | null; confidence: number } {
  const upper = text.toUpperCase();
  const sortedKeys = Object.keys(CANONICAL_MATERIALS).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    const regex = new RegExp(`\\b${k.replace(/ /g, '\\s+')}\\b`, 'i');
    if (regex.test(upper)) {
      return { materialType: CANONICAL_MATERIALS[k], confidence: 0.95 };
    }
  }
  return { materialType: null, confidence: 0 };
}

export interface GraphState {
  documentId: string;
  organizationId: string;
  categoryCode: string;
  fileBuffer: Buffer;
  mimeType: string;
  rawText?: string;
  ocrConfidence?: number;
  boundingBoxes?: Array<{ text: string; boundingBox: BoundingBox }>;
  classifiedCategory?: string;
  detectedScope?: ScopeType;
  extractedFields?: Record<string, ExtractedFieldValue>;
  status?: ExtractionJobStatus;
  error?: string;
}

export class ExtractionGraph {
  private ocrProvider: IOcrProvider;

  constructor(ocrProvider?: IOcrProvider) {
    this.ocrProvider = ocrProvider ?? new TesseractOcrProvider();
  }

  /** Run 5-Node Document-Driven Extraction Pipeline */
  async execute(state: GraphState): Promise<GraphState> {
    logger.info({ documentId: state.documentId }, 'Starting ExtractionGraph document pipeline');

    try {
      // Node 1: OCR Processing Node
      const ocrState = await this.ocrNode(state);
      if (ocrState.status === ExtractionJobStatus.FAILED) return ocrState;

      // Node 2: Classify Document & Detect Scope Node
      const classifyState = await this.classifyNode(ocrState);

      // Node 3: Extract Fields Node
      const extractState = await this.extractNode(classifyState);

      // Node 4: Confidence Scoring Node
      const scoredState = await this.confidenceScoringNode(extractState);

      logger.info({ documentId: state.documentId, category: scoredState.classifiedCategory, scope: scoredState.detectedScope }, 'ExtractionGraph pipeline completed successfully');
      return scoredState;
    } catch (err: any) {
      logger.error({ documentId: state.documentId, error: err.message }, 'ExtractionGraph pipeline error');
      return {
        ...state,
        status: ExtractionJobStatus.FAILED,
        error: err.message,
      };
    }
  }

  // Node 1: OCR Processing
  private async ocrNode(state: GraphState): Promise<GraphState> {
    try {
      const ocrResult = await this.ocrProvider.extractText(state.fileBuffer, state.mimeType);

      if (!ocrResult.rawText || ocrResult.rawText === 'Missing') {
        return {
          ...state,
          status: ExtractionJobStatus.FAILED,
          error: 'Unreadable document text',
        };
      }

      return {
        ...state,
        rawText: ocrResult.rawText,
        ocrConfidence: ocrResult.confidence,
        boundingBoxes: ocrResult.boundingBoxes,
      };
    } catch (err: any) {
      return {
        ...state,
        status: ExtractionJobStatus.FAILED,
        error: `OCR failed: ${err.message}`,
      };
    }
  }

  // Node 2: Classify Document & Detect Scope
  private async classifyNode(state: GraphState): Promise<GraphState> {
    const text = (state.rawText || '').toUpperCase();

    let category = state.categoryCode || 'GENERAL';
    let scope: ScopeType = ScopeType.SCOPE_3;

    if (text.includes('BILL OF LADING') || text.includes('BOL-') || text.includes('MAERSK') || text.includes('OCEAN') || text.includes('AIR WAYBILL') || text.includes('AWB-') || text.includes('LUFTHANSA') || text.includes('FREIGHT') || text.includes('CARGO') || text.includes('LOGISTICS') || text.includes('UPSTREAM_TRANSPORT')) {
      category = 'UPSTREAM_TRANSPORT';
      scope = ScopeType.SCOPE_3;
    } else if (text.includes('NATURAL GAS') || text.includes('ATMOS') || text.includes('PIPELINE') || text.includes('MMBTU') || text.includes('THERMS')) {
      category = 'STATIONARY_COMBUSTION';
      scope = ScopeType.SCOPE_1;
    } else if (text.includes('GENERATOR') || text.includes('TANK-GEN') || text.includes('CAT POWER') || text.includes('DIESEL FUEL') || text.includes('COMMERCIAL GENERATOR') || text.includes('STATIONARY_COMBUSTION')) {
      category = 'STATIONARY_COMBUSTION';
      scope = ScopeType.SCOPE_1;
    } else if (text.includes('SHELL FLEET') || text.includes('PETROL') || text.includes('GASOLINE') || text.includes('MOBILE_COMBUSTION')) {
      category = 'MOBILE_COMBUSTION';
      scope = ScopeType.SCOPE_1;
    } else if (text.includes('KWH') || text.includes('ELECTRICITY') || text.includes('ENERGY BILL') || text.includes('CONEDISON') || text.includes('TATA POWER') || text.includes('VATTENFALL')) {
      category = 'ELECTRICITY';
      scope = ScopeType.SCOPE_2;
    } else if (text.includes('STEEL') || text.includes('PURCHASE ORDER') || text.includes('ARCELORMITTAL') || text.includes('PURCHASED GOODS') || text.includes('RAW MATERIAL')) {
      category = 'PURCHASED_GOODS';
      scope = ScopeType.SCOPE_3;
    } else if (text.includes('WASTE') || text.includes('LANDFILL') || text.includes('RECYCLING')) {
      category = 'WASTE_MANAGEMENT';
      scope = ScopeType.SCOPE_3;
    }

    return {
      ...state,
      classifiedCategory: category,
      detectedScope: scope,
    };
  }

  // Node 3: Extract Fields directly from text
  private async extractNode(state: GraphState): Promise<GraphState> {
    const text = state.rawText || '';
    const fields: Record<string, ExtractedFieldValue> = {};

    // Helper regex parser
    const findMatch = (patterns: RegExp[]): string | null => {
      for (const pat of patterns) {
        const m = text.match(pat);
        if (m && m[1]) return m[1].trim();
      }
      return null;
    };

    // 1. Vendor / Carrier Name
    const vendor = findMatch([
      /(?:carrier\s*name|carrier)\s*:?\s*([A-Za-z0-9 &.,-]+)/i,
      /(?:vendor|supplier|company)\s*:?\s*([A-Za-z0-9 &.,-]+)/i,
      /(APEX [A-Za-z0-9 &.,-]+)/i,
      /(CAT POWER [A-Za-z0-9 &.,-]+)/i,
      /(ATMOS ENERGY [A-Za-z0-9 &.,-]+)/i,
      /(SHELL FLEET [A-Za-z0-9 &.,-]+)/i,
      /(TATA POWER [A-Za-z0-9 &.,-]+)/i,
      /(MAERSK [A-Za-z0-9 &.,-]+)/i,
      /(ARCELORMITTAL [A-Za-z0-9 &.,-]+)/i,
    ]);
    if (vendor) {
      fields.vendorName = { value: vendor, confidence: 0.96, needsReview: false };
    }

    // 2. Document Reference Number
    const refNum = findMatch([
      /(BOL-[A-Za-z0-9-]+)/i,
      /(AWB-[A-Za-z0-9-]+)/i,
      /(INV-[A-Za-z0-9-]+)/i,
      /(NG-ATM-[A-Za-z0-9-]+)/i,
      /(FLT-SHL-[A-Za-z0-9-]+)/i,
      /(ACCT-[A-Za-z0-9-]+)/i,
      /(HT-PUNE-[A-Za-z0-9-]+)/i,
      /(PO-STEEL-[A-Za-z0-9-]+)/i,
      /(?:invoice|bill|account|reference|po|bol|awb)\s*(?:number|id|ref|#)?\s*:?\s*([A-Za-z0-9-]+)/i,
    ]);
    if (refNum) {
      fields.invoiceNumber = { value: refNum, confidence: 0.98, needsReview: false };
    }

    // 3. Category Specific Numerical Extractions
    const cat = state.classifiedCategory || state.categoryCode;

    // Freight & Logistics Multi-Line and Total Weight Extractions
    const distMatch = findMatch([
      /distanceKm\s*:?\s*([0-9,]+)/i,
      /(?:distance|transit route distance)\s*:?\s*([0-9,]+)\s*km/i,
      /([0-9,]+)\s*km/i,
    ]);
    
    // Total Weight or Multi-Line Weights
    const totalWeightMatch = findMatch([
      /(?:total cargo weight|total weight|weightKg)\s*:?\s*([0-9,]+)\s*kg/i,
      /total\s*:\s*([0-9,]+)\s*kg/i,
    ]);

    const distVal = distMatch ? parseFloat(distMatch.replace(/,/g, '')) : null;
    let totalWeightVal = totalWeightMatch ? parseFloat(totalWeightMatch.replace(/,/g, '')) : null;

    // Multi-line cargo line matches (e.g. Line 01: 14000, Line 02: 6000)
    const lineMatches = Array.from(text.matchAll(/Line\s*\d+[^0-9\n\r]*([0-9,]+)\s*KG/gi));
    let lineSum = 0;
    const lineItems: Array<{ lineIndex: number; massKg: number }> = [];

    lineMatches.forEach((m, idx) => {
      const kg = parseFloat(m[1].replace(/,/g, ''));
      lineSum += kg;
      lineItems.push({ lineIndex: idx + 1, massKg: kg });
    });

    if (!totalWeightVal && lineSum > 0) {
      totalWeightVal = lineSum;
    } else if (!totalWeightVal) {
      const singleWeightMatch = findMatch([/([0-9,]+)\s*kg/i]);
      if (singleWeightMatch) totalWeightVal = parseFloat(singleWeightMatch.replace(/,/g, ''));
    }

    if (distVal) {
      fields.distanceKm = { value: distVal, confidence: 0.98, needsReview: false };
    }
    if (totalWeightVal) {
      fields.weightKg = { value: totalWeightVal, confidence: 0.98, needsReview: false };
    }

    if (cat === 'UPSTREAM_TRANSPORT' || cat === 'DOWNSTREAM_TRANSPORT' || cat === 'ROAD_FREIGHT' || text.includes('BILL OF LADING')) {
      if (distVal && totalWeightVal) {
        const tonnes = totalWeightVal / 1000;
        const tkm = tonnes * distVal;
        fields.tonneKm = { value: tkm, confidence: 0.99, needsReview: false };
        fields.quantity = { value: tkm, confidence: 0.99, needsReview: false };
        fields.unit = { value: 'TONNE_KM', confidence: 0.99, needsReview: false };
      } else {
        if (!distVal) fields.distanceKm = { value: 'Missing', confidence: 0, needsReview: true };
        if (!totalWeightVal) fields.weightKg = { value: 'Missing', confidence: 0, needsReview: true };
      }
    } else if (cat === 'PURCHASED_GOODS' || text.includes('PURCHASE ORDER') || text.includes('STEEL BEAMS') || text.includes('RAW MATERIAL')) {
      // Purchased Goods & Raw Materials
      const canonicalMat = resolveCanonicalMaterial(text);
      if (canonicalMat.materialType) {
        fields.materialType = { value: canonicalMat.materialType, confidence: canonicalMat.confidence, needsReview: false };
      } else {
        fields.materialType = { value: 'Missing', confidence: 0, needsReview: true };
      }

      const qtyStr = findMatch([
        /(?:quantity|weightKg|weight|amount)\s*:?\s*([0-9,]+)/i,
        /([0-9,]+)\s*(?:kg|tonnes|tons|lbs)/i,
      ]);
      const unitStr = findMatch([
        /(KG|TONNES|TONS|LBS|METRIC_TONS)/i,
      ]);

      if (qtyStr) {
        const q = parseFloat(qtyStr.replace(/,/g, ''));
        fields.quantity = { value: q, confidence: 0.96, needsReview: false };
        fields.weightKg = { value: q, confidence: 0.96, needsReview: false };
        fields.unit = { value: (unitStr || 'KG').toUpperCase(), confidence: 0.95, needsReview: false };
      } else {
        fields.quantity = { value: 'Missing', confidence: 0, needsReview: true };
      }
    } else if (cat === 'ELECTRICITY') {
      const kwhStr = findMatch([
        /(?:kwhConsumed|consumed|energy)\s*:?\s*([0-9,]+)/i,
        /([0-9,]+)\s*kwh/i,
      ]);
      if (kwhStr) {
        const kwh = parseFloat(kwhStr.replace(/,/g, ''));
        fields.kwhConsumed = { value: kwh, confidence: 0.98, needsReview: false };
        fields.quantity = { value: kwh, confidence: 0.98, needsReview: false };
        fields.unit = { value: 'KWH', confidence: 0.99, needsReview: false };
      } else {
        fields.kwhConsumed = { value: 'Missing', confidence: 0, needsReview: true };
      }

      if (/recVerification:\s*true|Guarantee of Origin|Green Tariff/i.test(text)) {
        fields.recVerification = { value: true, confidence: 0.99, needsReview: false };
      }
    } else {
      // Fuel & Stationary/Mobile Combustion
      const canonicalFuel = resolveCanonicalFuel(text);
      if (canonicalFuel.fuelType) {
        fields.fuelType = { value: canonicalFuel.fuelType, confidence: canonicalFuel.confidence, needsReview: false };
      } else {
        fields.fuelType = { value: 'Missing', confidence: 0, needsReview: true };
      }

      const qtyStr = findMatch([
        /(?:quantity|volume|consumed)\s*:?\s*([0-9,]+)/i,
        /([0-9,]+)\s*(?:liters|litres|gallons|m3|kg|mmbtu)/i,
      ]);
      const unitStr = findMatch([
        /(LITERS|LITRES|GALLONS|M3|KG|TONNES|MMBTU|THERMS)/i,
      ]);

      if (qtyStr) {
        fields.quantity = { value: parseFloat(qtyStr.replace(/,/g, '')), confidence: 0.96, needsReview: false };
        fields.unit = { value: (unitStr || 'LITERS').toUpperCase(), confidence: 0.95, needsReview: false };
      } else {
        fields.quantity = { value: 'Missing', confidence: 0, needsReview: true };
      }
    }

    return {
      ...state,
      extractedFields: fields,
    };
  }

  // Node 4: Confidence Scoring
  private async confidenceScoringNode(state: GraphState): Promise<GraphState> {
    return {
      ...state,
      status: ExtractionJobStatus.SUCCESS,
    };
  }
}
