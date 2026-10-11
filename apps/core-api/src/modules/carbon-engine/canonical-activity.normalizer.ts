import { ScopeType } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('CanonicalActivityNormalizer');

export interface RawExtractedFields {
  [key: string]: any;
}

export interface CanonicalActivity {
  scope: ScopeType;
  category: string;
  subCategory: string;
  activityType: string;
  fuelType?: string | null;
  materialType?: string | null;
  vehicleType?: string | null;
  quantity: number;
  unit: string;
  rawUnit: string;
  distanceKm?: number | null;
  weightKg?: number | null;
  region: string;
  needsReview: boolean;
  blockReason?: string | null;
  sourceEvidence: Record<string, any>;
}

// Canonical Fuel Vocabulary
const FUEL_MAP: Record<string, { subCategory: string; defaultUnit: string }> = {
  'DIESEL': { subCategory: 'DIESEL', defaultUnit: 'LITERS' },
  'DIESEL_FUEL': { subCategory: 'DIESEL', defaultUnit: 'LITERS' },
  'DIESEL_GENERATOR': { subCategory: 'DIESEL', defaultUnit: 'LITERS' },
  'HSD': { subCategory: 'DIESEL', defaultUnit: 'LITERS' },
  'HIGH_SPEED_DIESEL': { subCategory: 'DIESEL', defaultUnit: 'LITERS' },
  'DIESEL_GALLON': { subCategory: 'DIESEL_GALLON', defaultUnit: 'GALLONS' },
  'PETROL': { subCategory: 'PETROL', defaultUnit: 'LITERS' },
  'GASOLINE': { subCategory: 'PETROL', defaultUnit: 'LITERS' },
  'NATURAL_GAS': { subCategory: 'NATURAL_GAS', defaultUnit: 'M3' },
  'NATURAL_GAS_MMBTU': { subCategory: 'NATURAL_GAS_MMBTU', defaultUnit: 'MMBTU' },
  'NATURAL_GAS_THERMS': { subCategory: 'NATURAL_GAS_THERMS', defaultUnit: 'THERMS' },
  'NATURAL_GAS_KWH': { subCategory: 'NATURAL_GAS_KWH', defaultUnit: 'KWH' },
  'NATURAL_GAS_GJ': { subCategory: 'NATURAL_GAS_GJ', defaultUnit: 'GJ' },
  'LPG': { subCategory: 'LPG', defaultUnit: 'LITERS' },
  'PROPANE': { subCategory: 'PROPANE', defaultUnit: 'LITERS' },
  'PROPANE_GALLON': { subCategory: 'PROPANE_GALLON', defaultUnit: 'GALLONS' },
  'CNG': { subCategory: 'CNG', defaultUnit: 'KG' },
  'LNG': { subCategory: 'LNG', defaultUnit: 'KG' },
  'BIODIESEL_B100': { subCategory: 'BIODIESEL_B100', defaultUnit: 'LITERS' },
  'BIODIESEL_B20': { subCategory: 'BIODIESEL_B20', defaultUnit: 'LITERS' },
  'COAL_INDUSTRIAL': { subCategory: 'COAL_INDUSTRIAL', defaultUnit: 'KG' },
  'KEROSENE': { subCategory: 'KEROSENE', defaultUnit: 'LITERS' },
  'JET_FUEL_A1': { subCategory: 'JET_FUEL_A1', defaultUnit: 'LITERS' },
  'FUEL_OIL_HEAVY': { subCategory: 'FUEL_OIL_HEAVY', defaultUnit: 'LITERS' },
  'FUEL_OIL_LIGHT': { subCategory: 'FUEL_OIL_LIGHT', defaultUnit: 'LITERS' },
  'BIOGAS': { subCategory: 'BIOGAS', defaultUnit: 'KWH' },
};

// Canonical Material Vocabulary (Maps deterministically to approved DEFRA & Ecoinvent factors)
const MATERIAL_MAP: Record<string, { subCategory: string; defaultUnit: string }> = {
  'STEEL': { subCategory: 'STEEL_PRIMARY', defaultUnit: 'KG' },
  'STEEL_PRIMARY': { subCategory: 'STEEL_PRIMARY', defaultUnit: 'KG' },
  'STEEL_RECYCLED': { subCategory: 'STEEL_RECYCLED', defaultUnit: 'KG' },
  'ALUMINUM': { subCategory: 'ALUMINUM_PRIMARY', defaultUnit: 'KG' },
  'ALUMINIUM': { subCategory: 'ALUMINUM_PRIMARY', defaultUnit: 'KG' },
  'ALUMINUM_PRIMARY': { subCategory: 'ALUMINUM_PRIMARY', defaultUnit: 'KG' },
  'ALUMINUM_RECYCLED': { subCategory: 'ALUMINUM_RECYCLED', defaultUnit: 'KG' },
  'CEMENT': { subCategory: 'CEMENT_PORTLAND', defaultUnit: 'KG' },
  'CEMENT_PORTLAND': { subCategory: 'CEMENT_PORTLAND', defaultUnit: 'KG' },
  'CONCRETE': { subCategory: 'CONCRETE', defaultUnit: 'KG' },
  'COPPER': { subCategory: 'COPPER', defaultUnit: 'KG' },
  'PAPER': { subCategory: 'PAPER_VIRGIN', defaultUnit: 'KG' },
  'PAPER_VIRGIN': { subCategory: 'PAPER_VIRGIN', defaultUnit: 'KG' },
  'PAPER_RECYCLED': { subCategory: 'PAPER_RECYCLED', defaultUnit: 'KG' },
  'PLASTIC': { subCategory: 'PLASTIC_HDPE', defaultUnit: 'KG' },
  'PLASTIC_HDPE': { subCategory: 'PLASTIC_HDPE', defaultUnit: 'KG' },
  'PLASTIC_PET': { subCategory: 'PLASTIC_PET', defaultUnit: 'KG' },
  'PLASTIC_LDPE': { subCategory: 'PLASTIC_LDPE', defaultUnit: 'KG' },
  'PLASTIC_PP': { subCategory: 'PLASTIC_PP', defaultUnit: 'KG' },
  'RUBBER': { subCategory: 'RUBBER', defaultUnit: 'KG' },
  'WOOD': { subCategory: 'TIMBER', defaultUnit: 'KG' },
  'TIMBER': { subCategory: 'TIMBER', defaultUnit: 'KG' },
  'GLASS': { subCategory: 'GLASS', defaultUnit: 'KG' },
  'COTTON': { subCategory: 'COTTON', defaultUnit: 'KG' },
  'POLYESTER': { subCategory: 'POLYESTER', defaultUnit: 'KG' },
};

function getFieldValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && val.value !== undefined) return val.value;
  return val;
}

export class CanonicalActivityNormalizer {
  /**
   * Deterministically normalizes extracted & manual document fields into a canonical activity representation.
   * Follows strict hierarchy: Explicit Document Evidence > Structured Activity Evidence > Extracted Fields > Registered Category.
   */
  static normalize(params: {
    categoryCode: string;
    fields: RawExtractedFields;
    siteCountry?: string;
    rawText?: string;
  }): CanonicalActivity {
    const { categoryCode, fields, siteCountry = 'US', rawText = '' } = params;
    const country = (siteCountry || 'US').toUpperCase();
    const upperText = (rawText || '').toUpperCase();

    // 1. Extract raw numerical activity indicators
    const rawUnit = String(
      getFieldValue(fields.unit) ||
      getFieldValue(fields.activityUnit) ||
      getFieldValue(fields.volumeUnit) ||
      getFieldValue(fields.energyUnit) ||
      getFieldValue(fields.fuelUnit) ||
      ''
    ).toUpperCase().trim();

    let rawQty: number | null = null;
    const qtyCandidates = [
      fields.quantity,
      fields.tonneKm,
      fields.kwhConsumed,
      fields.kwh,
      fields.amount,
      fields.weightKg,
      fields.volume,
      fields.liters,
      fields.gallons,
      fields.m3,
      fields.therms,
      fields.mmbtu,
    ];
    for (const cand of qtyCandidates) {
      const val = getFieldValue(cand);
      if (val !== null && val !== undefined && val !== '' && val !== 'Missing') {
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          rawQty = num;
          break;
        }
      }
    }

    const rawDistance = parseFloat(String(getFieldValue(fields.distanceKm) || getFieldValue(fields.distance) || '0').replace(/,/g, ''));
    const rawWeight = parseFloat(String(getFieldValue(fields.weightKg) || getFieldValue(fields.weight) || '0').replace(/,/g, ''));

    // 2. EVIDENCE-DRIVEN CATEGORY & SCOPE INFERENCE
    let effectiveCategory = (categoryCode || 'GENERAL').toUpperCase();

    // Level 1: Explicit Document Headers & Protocol Declarations
    if (upperText.includes('STATIONARY_COMBUSTION') || upperText.includes('STATIONARY COMBUSTION') || upperText.includes('STATIONARY FUEL') || upperText.includes('COMMERCIAL GENERATOR') || upperText.includes('BACKUP GENERATOR')) {
      effectiveCategory = 'STATIONARY_COMBUSTION';
    } else if (upperText.includes('MOBILE_COMBUSTION') || upperText.includes('MOBILE COMBUSTION') || upperText.includes('FLEET FUEL') || upperText.includes('FLEET VEHICLE') || upperText.includes('FLEET REFUELING')) {
      effectiveCategory = 'MOBILE_COMBUSTION';
    } else if (upperText.includes('PURCHASED ELECTRICITY') || upperText.includes('GRID ELECTRICITY') || upperText.includes('ELECTRICITY BILL') || upperText.includes('POWER UTILITY')) {
      effectiveCategory = 'ELECTRICITY';
    } else if (upperText.includes('BILL OF LADING') || upperText.includes('WAYBILL') || upperText.includes('FREIGHT WAYBILL') || upperText.includes('INTERMODAL') || upperText.includes('UPSTREAM_TRANSPORT') || upperText.includes('CARRIER')) {
      effectiveCategory = 'UPSTREAM_TRANSPORT';
    } else if (upperText.includes('PURCHASED GOODS') || upperText.includes('RAW MATERIAL') || upperText.includes('PURCHASE ORDER') || upperText.includes('MATERIAL INVOICE')) {
      effectiveCategory = 'PURCHASED_GOODS';
    } else if (upperText.includes('BUSINESS TRAVEL') || upperText.includes('AIR TRAVEL') || upperText.includes('HOTEL STAY')) {
      effectiveCategory = 'BUSINESS_TRAVEL';
    } else if (upperText.includes('COMMUTE') || upperText.includes('EMPLOYEE COMMUTING')) {
      effectiveCategory = 'EMPLOYEE_COMMUTE';
    } else if (upperText.includes('WASTE GENERATED') || upperText.includes('LANDFILL') || upperText.includes('WASTEWATER')) {
      effectiveCategory = 'WASTE_MANAGEMENT';
    }

    // Level 2: Structured Activity Evidence Override
    if (effectiveCategory === 'GENERAL' || effectiveCategory === 'BUSINESS_TRAVEL' || effectiveCategory === 'PURCHASED_GOODS') {
      if (getFieldValue(fields.tonneKm) > 0 || (rawDistance > 0 && rawWeight > 0) || rawUnit === 'TONNE_KM') {
        effectiveCategory = 'UPSTREAM_TRANSPORT';
      } else if (getFieldValue(fields.kwhConsumed) > 0 || rawUnit === 'KWH' || rawUnit === 'MWH') {
        effectiveCategory = 'ELECTRICITY';
      } else if (getFieldValue(fields.fuelType) || rawUnit === 'LITERS' || rawUnit === 'GALLONS' || rawUnit === 'M3' || rawUnit === 'THERMS' || rawUnit === 'MMBTU') {
        if (upperText.includes('FLEET') || upperText.includes('MOBILE') || upperText.includes('VEHICLE')) {
          effectiveCategory = 'MOBILE_COMBUSTION';
        } else {
          effectiveCategory = 'STATIONARY_COMBUSTION';
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORY: ELECTRICITY / RENEWABLE
    // ─────────────────────────────────────────────────────────────────────────
    if (effectiveCategory.includes('ELECTRICITY') || effectiveCategory.includes('RENEWABLE')) {
      let gridSubCat = 'GRID';
      if (country === 'US') gridSubCat = 'US_GRID';
      else if (country === 'IN') gridSubCat = 'IN_GRID';
      else if (country === 'EU') gridSubCat = 'EU_GRID';

      const unit = rawUnit || 'KWH';
      if (!rawQty || rawQty <= 0) {
        return {
          scope: ScopeType.SCOPE_2,
          category: 'ELECTRICITY',
          subCategory: gridSubCat,
          activityType: 'GRID_ELECTRICITY',
          quantity: 0,
          unit,
          rawUnit,
          region: country,
          needsReview: true,
          blockReason: 'Missing electricity consumption quantity (KWH) — routing to Human Review',
          sourceEvidence: fields,
        };
      }

      return {
        scope: ScopeType.SCOPE_2,
        category: 'ELECTRICITY',
        subCategory: gridSubCat,
        activityType: 'GRID_ELECTRICITY',
        quantity: rawQty,
        unit,
        rawUnit,
        region: country,
        needsReview: false,
        sourceEvidence: fields,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORY: FREIGHT & LOGISTICS (UPSTREAM_TRANSPORT / DOWNSTREAM_TRANSPORT)
    // ─────────────────────────────────────────────────────────────────────────
    if (effectiveCategory.includes('TRANSPORT') || effectiveCategory.includes('FREIGHT') || effectiveCategory.includes('LOGISTICS')) {
      let tonneKm = rawQty;
      let finalUnit = rawUnit || 'TONNE_KM';

      // If distance and weight are present, calculate tonne-km deterministically
      if (rawDistance > 0 && rawWeight > 0) {
        tonneKm = (rawWeight / 1000) * rawDistance;
        finalUnit = 'TONNE_KM';
      }

      let subCat = 'ROAD_HEAVY_TRUCK';
      const textUpper = (upperText + ' ' + JSON.stringify(fields)).toUpperCase();

      if (textUpper.includes('OCEAN') || textUpper.includes('MAERSK') || textUpper.includes('CONTAINER') || textUpper.includes('PORT')) {
        subCat = 'OCEAN_CONTAINER';
      } else if (textUpper.includes('AIR') || textUpper.includes('AWB') || textUpper.includes('LUFTHANSA') || textUpper.includes('FLIGHT')) {
        subCat = 'AIR_FREIGHT';
      } else if (textUpper.includes('RAIL')) {
        subCat = 'RAIL_DIESEL';
      }

      if (!tonneKm || tonneKm <= 0) {
        return {
          scope: ScopeType.SCOPE_3,
          category: 'UPSTREAM_TRANSPORT',
          subCategory: subCat,
          activityType: 'FREIGHT_TRANSPORT',
          quantity: 0,
          unit: finalUnit,
          rawUnit,
          distanceKm: rawDistance > 0 ? rawDistance : null,
          weightKg: rawWeight > 0 ? rawWeight : null,
          region: 'GLOBAL',
          needsReview: true,
          blockReason: 'Missing cargo weight (KG) or transit distance (KM) for freight calculation',
          sourceEvidence: fields,
        };
      }

      return {
        scope: ScopeType.SCOPE_3,
        category: 'UPSTREAM_TRANSPORT',
        subCategory: subCat,
        activityType: 'FREIGHT_TRANSPORT',
        quantity: tonneKm,
        unit: finalUnit,
        rawUnit,
        distanceKm: rawDistance > 0 ? rawDistance : null,
        weightKg: rawWeight > 0 ? rawWeight : null,
        region: 'GLOBAL',
        needsReview: false,
        sourceEvidence: fields,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORY: PURCHASED GOODS & RAW MATERIALS
    // ─────────────────────────────────────────────────────────────────────────
    if (effectiveCategory.includes('PURCHASED_GOODS') || effectiveCategory.includes('RAW_MATERIAL')) {
      const matRaw = String(
        getFieldValue(fields.materialType) ||
        getFieldValue(fields.material) ||
        getFieldValue(fields.itemType) ||
        getFieldValue(fields.productDescription) ||
        ''
      ).toUpperCase().trim();

      let resolvedMat: string | null = null;
      for (const [key, mapping] of Object.entries(MATERIAL_MAP)) {
        if (matRaw.includes(key) || (upperText && new RegExp(`\\b${key}\\b`, 'i').test(upperText))) {
          resolvedMat = mapping.subCategory;
          break;
        }
      }

      if (!resolvedMat) {
        return {
          scope: ScopeType.SCOPE_3,
          category: 'PURCHASED_GOODS',
          subCategory: 'Missing',
          activityType: 'PURCHASED_MATERIAL',
          materialType: null,
          quantity: rawQty || 0,
          unit: rawUnit || 'KG',
          rawUnit,
          region: country,
          needsReview: true,
          blockReason: 'Material type could not be identified from document — routing to Human Review',
          sourceEvidence: fields,
        };
      }

      if (!rawQty || rawQty <= 0) {
        return {
          scope: ScopeType.SCOPE_3,
          category: 'PURCHASED_GOODS',
          subCategory: resolvedMat,
          activityType: 'PURCHASED_MATERIAL',
          materialType: resolvedMat,
          quantity: 0,
          unit: rawUnit || 'KG',
          rawUnit,
          region: country,
          needsReview: true,
          blockReason: 'Missing purchase material weight or quantity — routing to Human Review',
          sourceEvidence: fields,
        };
      }

      return {
        scope: ScopeType.SCOPE_3,
        category: 'PURCHASED_GOODS',
        subCategory: resolvedMat,
        activityType: 'PURCHASED_MATERIAL',
        materialType: resolvedMat,
        quantity: rawQty,
        unit: rawUnit || 'KG',
        rawUnit,
        region: country,
        needsReview: false,
        sourceEvidence: fields,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORY: COMBUSTION (STATIONARY & MOBILE)
    // ─────────────────────────────────────────────────────────────────────────
    const fuelRaw = String(
      getFieldValue(fields.fuelType) ||
      getFieldValue(fields.fuel) ||
      getFieldValue(fields.commodity) ||
      getFieldValue(fields.energySource) ||
      ''
    ).toUpperCase().trim();

    let resolvedFuelKey: string | null = null;
    let unit = rawUnit || 'LITERS';

    // Check fuel matches
    for (const key of Object.keys(FUEL_MAP)) {
      if (fuelRaw.includes(key) || (upperText && new RegExp(`\\b${key.replace(/_/g, '[_\\s]+')}\\b`, 'i').test(upperText))) {
        resolvedFuelKey = key;
        break;
      }
    }

    // Natural Gas Unit Mapping: M3 vs MMBTU vs THERMS
    if (resolvedFuelKey && resolvedFuelKey.includes('NATURAL_GAS')) {
      if (unit === 'MMBTU') resolvedFuelKey = 'NATURAL_GAS_MMBTU';
      else if (unit === 'THERMS') resolvedFuelKey = 'NATURAL_GAS_THERMS';
      else if (unit === 'GJ') resolvedFuelKey = 'NATURAL_GAS_GJ';
      else if (unit === 'KWH') resolvedFuelKey = 'NATURAL_GAS_KWH';
      else resolvedFuelKey = 'NATURAL_GAS';
    }

    const isMobile = effectiveCategory.includes('MOBILE') || upperText.includes('FLEET') || upperText.includes('VEHICLE');
    const category = isMobile ? 'MOBILE_COMBUSTION' : 'STATIONARY_COMBUSTION';

    // Stationary Diesel Gallon mapping for US EPA (Stationary Combustion only)
    if (resolvedFuelKey === 'DIESEL' && unit === 'GALLONS' && country === 'US' && !isMobile) {
      resolvedFuelKey = 'DIESEL_GALLON';
    }

    if (!resolvedFuelKey) {
      return {
        scope: ScopeType.SCOPE_1,
        category,
        subCategory: 'Missing',
        activityType: 'FUEL_COMBUSTION',
        fuelType: null,
        quantity: rawQty || 0,
        unit,
        rawUnit,
        region: country,
        needsReview: true,
        blockReason: 'Fuel type could not be identified from document — routing to Human Review',
        sourceEvidence: fields,
      };
    }

    const subCategory = FUEL_MAP[resolvedFuelKey]?.subCategory || resolvedFuelKey;

    if (!rawQty || rawQty <= 0) {
      return {
        scope: ScopeType.SCOPE_1,
        category,
        subCategory,
        activityType: 'FUEL_COMBUSTION',
        fuelType: subCategory,
        quantity: 0,
        unit,
        rawUnit,
        region: country,
        needsReview: true,
        blockReason: 'Missing fuel consumption volume or quantity — routing to Human Review',
        sourceEvidence: fields,
      };
    }

    return {
      scope: ScopeType.SCOPE_1,
      category,
      subCategory,
      activityType: 'FUEL_COMBUSTION',
      fuelType: subCategory,
      quantity: rawQty,
      unit,
      rawUnit,
      region: country,
      needsReview: false,
      sourceEvidence: fields,
    };
  }
}
