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
    fileName?: string;
  }): CanonicalActivity {
    const { categoryCode, fields, siteCountry = 'US', rawText = '', fileName = '' } = params;
    const country = (siteCountry || 'US').toUpperCase();
    const upperText = (rawText || '').toUpperCase();
    const upperFileName = (fileName || '').toUpperCase();
    const combinedEvidence = `${upperText} ${upperFileName}`;

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
      // 1. Explicit quantity / activity fields (most specific first)
      fields.quantity,
      fields.tonneKm,
      fields.kwhConsumed,
      fields.kwh,
      // 2. Domain-specific physical measurement fields
      //    These MUST come before 'amount' which is often billing cost, not consumption
      fields.volume,
      fields.liters,
      fields.gallons,
      fields.m3,
      fields.therms,
      fields.mmbtu,
      fields.gasVolume,
      fields.fuelVolume,
      fields.consumption,
      fields.totalConsumption,
      fields.usageM3,
      fields.naturalGasConsumed,
      fields.gasConsumed,
      // 3. 'amount' is intentionally LAST — it's ambiguous (could be invoice cost in ₹/$ not consumption units)
      // Only use it as a final fallback when all physical measurement fields are missing/zero
      fields.amount,
      // NOTE: weightKg is intentionally EXCLUDED from this candidate list.
      // It is a freight/transport dimension and is consumed via the rawWeight path in the
      // TRANSPORT branch below. Including it here causes utility/combustion docs that
      // happen to have a weight field extracted (e.g. from "kgCO2e" or "kg/m³" strings)
      // to produce astronomically inflated emission results.
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

    // Level 1: Explicit Document Headers, File Names & Protocol Declarations
    if (combinedEvidence.includes('ELECTRICITY') || combinedEvidence.includes('POWER UTILITY') || combinedEvidence.includes('ELECTRICITY BILL') || combinedEvidence.includes('GRID ELECTRICITY') || combinedEvidence.includes('SCOPE2_ELECTRICITY') || combinedEvidence.includes('ELECTRIC_BILL') || combinedEvidence.includes('POWER_BILL')) {
      effectiveCategory = 'ELECTRICITY';
    } else if (combinedEvidence.includes('STATIONARY_COMBUSTION') || combinedEvidence.includes('STATIONARY COMBUSTION') || combinedEvidence.includes('STATIONARY FUEL') || combinedEvidence.includes('COMMERCIAL GENERATOR') || combinedEvidence.includes('BACKUP GENERATOR')) {
      effectiveCategory = 'STATIONARY_COMBUSTION';
    } else if (combinedEvidence.includes('MOBILE_COMBUSTION') || combinedEvidence.includes('MOBILE COMBUSTION') || combinedEvidence.includes('FLEET FUEL') || combinedEvidence.includes('FLEET VEHICLE') || combinedEvidence.includes('FLEET REFUELING') || combinedEvidence.includes('FLEET_DIESEL') || combinedEvidence.includes('COMMERCIAL FLEET') || combinedEvidence.includes('DIRECT MOBILE') || combinedEvidence.includes('FLEET DEPOT') || combinedEvidence.includes('SHELL COMMERCIAL') || combinedEvidence.includes('BULK FUEL')) {
      effectiveCategory = 'MOBILE_COMBUSTION';
    } else if (combinedEvidence.includes('BILL OF LADING') || combinedEvidence.includes('AIR WAYBILL') || combinedEvidence.includes('FREIGHT WAYBILL') || combinedEvidence.includes('INTERMODAL') || combinedEvidence.includes('UPSTREAM_TRANSPORT') || combinedEvidence.includes('TONNE_KM') || combinedEvidence.includes('CARGO MANIFEST')) {
      effectiveCategory = 'UPSTREAM_TRANSPORT';
    } else if (combinedEvidence.includes('PURCHASED GOODS') || combinedEvidence.includes('RAW MATERIAL') || combinedEvidence.includes('PURCHASE ORDER') || combinedEvidence.includes('MATERIAL INVOICE')) {
      effectiveCategory = 'PURCHASED_GOODS';
    } else if (combinedEvidence.includes('BUSINESS TRAVEL') || combinedEvidence.includes('AIR TRAVEL') || combinedEvidence.includes('HOTEL STAY')) {
      effectiveCategory = 'BUSINESS_TRAVEL';
    } else if (combinedEvidence.includes('COMMUTE') || combinedEvidence.includes('EMPLOYEE COMMUTING')) {
      effectiveCategory = 'EMPLOYEE_COMMUTE';
    } else if (combinedEvidence.includes('WASTE GENERATED') || combinedEvidence.includes('LANDFILL') || combinedEvidence.includes('WASTEWATER')) {
      effectiveCategory = 'WASTE_MANAGEMENT';
    }

    // Level 2: Structured Activity Evidence Override
    // Applies when category is ambiguous (GENERAL, BUSINESS_TRAVEL) OR when classified as
    // UPSTREAM_TRANSPORT but there is no distance/weight data and fuel data IS present
    // (rescues misclassified fleet fuel bills with "Logistics" in their depot name).
    const isAmbiguous = effectiveCategory === 'GENERAL' || effectiveCategory === 'BUSINESS_TRAVEL';
    const isLikelyMisclassifiedTransport = effectiveCategory === 'UPSTREAM_TRANSPORT' && rawDistance <= 0 && rawWeight <= 0;

    if (isAmbiguous || isLikelyMisclassifiedTransport) {
      if (!isLikelyMisclassifiedTransport && (getFieldValue(fields.tonneKm) > 0 || rawUnit === 'TONNE_KM')) {
        // Explicit tonne-km unit or tonne-km field — confirmed freight
        effectiveCategory = 'UPSTREAM_TRANSPORT';
      } else if (getFieldValue(fields.kwhConsumed) > 0 || rawUnit === 'KWH' || rawUnit === 'MWH') {
        effectiveCategory = 'ELECTRICITY';
      } else if (getFieldValue(fields.fuelType) || rawUnit === 'LITERS' || rawUnit === 'GALLONS' || rawUnit === 'M3' || rawUnit === 'THERMS' || rawUnit === 'MMBTU') {
        if (upperText.includes('FLEET') || upperText.includes('MOBILE') || upperText.includes('VEHICLE') ||
            upperText.includes('COMMERCIAL FLEET') || upperText.includes('SHELL COMMERCIAL') || upperFileName.includes('FLEET')) {
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
        // Do NOT apply an auto-baseline for electricity.
        // Using a fabricated KWH figure (e.g. 12450 KWH) produces wrong emission values.
        // Route to human review so the reviewer can enter the actual meter reading.
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
          blockReason: 'Missing electricity consumption quantity (KWH) — please enter the actual kWh reading in the Review Workspace',
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
    // Only reaches here for confirmed freight docs with strict BoL/waybill markers
    // ─────────────────────────────────────────────────────────────────────────
    if (effectiveCategory.includes('TRANSPORT') || effectiveCategory.includes('FREIGHT')) {
      let tonneKm = rawQty;
      let finalUnit = rawUnit || 'TONNE_KM';

      // If distance and weight are present, calculate tonne-km deterministically
      if (rawDistance > 0 && rawWeight > 0) {
        tonneKm = (rawWeight / 1000) * rawDistance;
        finalUnit = 'TONNE_KM';
      } else if (rawWeight > 0 && (!rawDistance || rawDistance <= 0)) {
        // Fallback standard domestic road freight haul (350 km) when transit distance is omitted on invoice
        const estimatedDistanceKm = 350;
        tonneKm = (rawWeight / 1000) * estimatedDistanceKm;
        finalUnit = 'TONNE_KM';
        logger.info({ rawWeight, estimatedDistanceKm, tonneKm }, 'Applied baseline regional freight distance (350 km) for calculation');
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
        // Do NOT apply an auto-baseline for freight transport.
        // Using a fabricated tonne-km figure (e.g. 30,000 tkm) produces wrong emission values.
        // Route to human review so the reviewer can enter the actual cargo weight and distance.
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
          blockReason: 'Missing cargo weight (KG) or transit distance (KM) for freight calculation — please enter both fields in the Review Workspace',
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
        if (combinedEvidence.includes('STEEL')) resolvedMat = 'STEEL_PRIMARY';
        else if (combinedEvidence.includes('ALUMIN')) resolvedMat = 'ALUMINUM_PRIMARY';
        else if (combinedEvidence.includes('CEMENT') || combinedEvidence.includes('CONCRETE')) resolvedMat = 'CEMENT_PORTLAND';
        else if (combinedEvidence.includes('PLASTIC')) resolvedMat = 'PLASTIC_HDPE';
        else if (combinedEvidence.includes('PAPER')) resolvedMat = 'PAPER_VIRGIN';
        else if (combinedEvidence.includes('COPPER')) resolvedMat = 'COPPER';
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
        // Do NOT apply an auto-baseline for purchased goods.
        // Using a fabricated weight (e.g. 50,000 KG) produces unrealistic emission values.
        // Route to human review so the reviewer can enter the actual purchase weight.
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
          blockReason: 'Missing purchase material weight or quantity — please enter the actual purchase quantity in the Review Workspace',
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
      if (combinedEvidence.includes('DIESEL') || combinedEvidence.includes('FLEET') || combinedEvidence.includes('GENERATOR')) {
        resolvedFuelKey = 'DIESEL';
        unit = 'LITERS';
      } else if (combinedEvidence.includes('NATURAL_GAS') || combinedEvidence.includes('GAS') || combinedEvidence.includes('ATMOS')) {
        resolvedFuelKey = 'NATURAL_GAS_MMBTU';
        unit = 'MMBTU';
      } else if (combinedEvidence.includes('PETROL') || combinedEvidence.includes('GASOLINE')) {
        resolvedFuelKey = 'PETROL';
        unit = 'LITERS';
      }
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
      // Do NOT apply an auto-baseline for combustion/fuel documents.
      // Fabricated quantities (e.g. 2500 L / 1500 MMBTU) produce unrealistic emission values.
      // Route to human review so the reviewer can enter the correct consumption figure.
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
        blockReason: `Missing fuel consumption quantity for ${subCategory} — please enter the actual consumed quantity in the Review Workspace`,
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
