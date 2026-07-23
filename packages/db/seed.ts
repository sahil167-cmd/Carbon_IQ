/**
 * Carbon OS — Database Seed
 * Seeds platform defaults: feature_flags, config_entries, controlled industries, factor mappings, document categories, emission factors, and unit conversions.
 * Run with: pnpm db:seed
 */
import { PrismaClient, ScopeType } from '@prisma/client';

const prisma = new PrismaClient();

const featureFlags = [
  {
    key: 'ENABLE_FORECAST',
    description: 'Enable ML forecasting module (Module 9). When disabled, forecast card is hidden.',
    isEnabled: true,
    scope: 'GLOBAL' as const,
  },
  {
    key: 'ENABLE_RAG',
    description: 'Enable RAG Sustainability Copilot (Module 10). When disabled, copilot chat is hidden.',
    isEnabled: true,
    scope: 'GLOBAL' as const,
  },
  {
    key: 'ENABLE_COMPLIANCE',
    description: 'Enable Compliance Agent / Report Builder (Module 11). When disabled, report builder is hidden.',
    isEnabled: true,
    scope: 'GLOBAL' as const,
  },
  {
    key: 'ENABLE_OCR',
    description: 'Enable OCR extraction pipeline (Module 5). When disabled, uploaded documents must be manually entered.',
    isEnabled: true,
    scope: 'GLOBAL' as const,
  },
  {
    key: 'ENABLE_AI_VALIDATION',
    description: 'Enable AI Layer 3 validation (Module 6). When disabled, only deterministic Layers 1/2 run.',
    isEnabled: true,
    scope: 'GLOBAL' as const,
  },
];

const configEntries = [
  {
    key: 'AI_CONFIDENCE_THRESHOLD',
    valueJson: 0.7,
    description: 'Minimum AI extraction confidence score (0-1) to auto-accept a field without flagging for review.',
  },
  {
    key: 'UPLOAD_MAX_FILES_PER_BATCH',
    valueJson: 25,
    description: 'Maximum number of files that can be uploaded in a single batch.',
  },
  {
    key: 'UPLOAD_MAX_FILE_SIZE_MB',
    valueJson: 20,
    description: 'Maximum size in MB for a single uploaded document.',
  },
  {
    key: 'ALLOWED_UPLOAD_MIME_TYPES',
    valueJson: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'],
    description: 'Allowed MIME types for document uploads (magic-byte verified server-side).',
  },
  {
    key: 'DEFAULT_EMISSION_FACTOR_SET',
    valueJson: 'GLEC_2023',
    description: 'Default emission factor dataset used by the Carbon Accounting Engine when no explicit set is specified.',
  },
  {
    key: 'PRESIGNED_URL_EXPIRY_SECONDS',
    valueJson: 300,
    description: 'Lifetime in seconds for S3 pre-signed upload/download URLs.',
  },
  {
    key: 'NOTIFICATION_EMAIL_ENABLED',
    valueJson: true,
    description: 'Whether to attempt email delivery when NotificationService.send() is called.',
  },
  {
    key: 'RATE_LIMIT_AUTH_REQUESTS',
    valueJson: 5,
    description: 'Max auth attempts (login/forgot-password) per account per 15 minutes before lockout.',
  },
];

const controlledIndustries = [
  {
    code: 'MANUFACTURING',
    name: 'Industrial Manufacturing & Heavy Goods',
    description: 'Manufacturing plants, assembly facilities, and raw material processing.',
    defaultFactorSet: 'GHG_PROTOCOL_2023',
  },
  {
    code: 'LOGISTICS',
    name: 'Freight, Logistics & Supply Chain',
    description: 'Road transport, maritime shipping, air freight, and warehousing.',
    defaultFactorSet: 'GLEC_2023',
  },
  {
    code: 'CHEMICAL',
    name: 'Chemicals, Plastics & Specialty Synthetics',
    description: 'Chemical synthesis, polymer production, and refining processes.',
    defaultFactorSet: 'DEFRA_2023',
  },
  {
    code: 'RETAIL',
    name: 'Retail, Consumer Goods & E-Commerce',
    description: 'Consumer goods manufacturing, distribution centers, and retail stores.',
    defaultFactorSet: 'DEFRA_2023',
  },
  {
    code: 'ENERGY',
    name: 'Energy, Utilities & Renewables',
    description: 'Power generation, grid operations, fuel distribution, and renewables.',
    defaultFactorSet: 'GHG_PROTOCOL_2023',
  },
  {
    code: 'TECHNOLOGY',
    name: 'Technology, Data Centers & Services',
    description: 'Data centers, cloud infrastructure, office operations, and professional services.',
    defaultFactorSet: 'DEFRA_2023',
  },
];

const documentCategories = [
  {
    code: 'STATIONARY_COMBUSTION',
    name: 'Stationary Combustion',
    scope: ScopeType.SCOPE_1,
    description: 'Boilers, furnaces, burners, and generator diesel/LPG/furnace oil fuel bills.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  },
  {
    code: 'MOBILE_COMBUSTION',
    name: 'Mobile Combustion',
    scope: ScopeType.SCOPE_1,
    description: 'Owned fleet fuel logs, company vehicles, and generator fuel receipts.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv'],
  },
  {
    code: 'FUGITIVE_EMISSIONS',
    name: 'Fugitive Emissions',
    scope: ScopeType.SCOPE_1,
    description: 'HVAC refrigerant top-up invoices, gas leakage logs, and chiller maintenance records.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  },
  {
    code: 'ELECTRICITY',
    name: 'Purchased Electricity',
    scope: ScopeType.SCOPE_2,
    description: 'Utility electricity bills, grid electricity statements, and meter readings.',
    requiredByDefault: true,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  },
  {
    code: 'RENEWABLE_ENERGY',
    name: 'Renewable Energy Certificates',
    scope: ScopeType.SCOPE_2,
    description: 'RECs, solar generation logs, power purchase agreements (PPAs).',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  },
  {
    code: 'UPSTREAM_TRANSPORT',
    name: 'Upstream Transport & Freight',
    scope: ScopeType.SCOPE_3,
    description: 'Inbound shipment invoices, transport challans, waybills, and bills of lading.',
    requiredByDefault: true,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  {
    code: 'DOWNSTREAM_TRANSPORT',
    name: 'Downstream Transport & Distribution',
    scope: ScopeType.SCOPE_3,
    description: 'Outbound courier invoices, customer shipment delivery records.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  {
    code: 'PURCHASED_GOODS',
    name: 'Purchased Goods & Services',
    scope: ScopeType.SCOPE_3,
    description: 'Material procurement purchase orders, vendor invoices, raw material receipts.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  },
  {
    code: 'WASTE_MANAGEMENT',
    name: 'Waste Generated in Operations',
    scope: ScopeType.SCOPE_3,
    description: 'Hazardous/non-hazardous waste disposal certificates, recycler manifests.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  },
  {
    code: 'BUSINESS_TRAVEL',
    name: 'Business Travel & Employee Commuting',
    scope: ScopeType.SCOPE_3,
    description: 'Flight tickets, train receipts, car rental bills, and employee travel expense reports.',
    requiredByDefault: false,
    acceptedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv'],
  },
];

const defaultEmissionFactors = [
  // Scope 1 — Stationary & Mobile Fuels
  {
    category: 'STATIONARY_COMBUSTION',
    subCategory: 'DIESEL',
    region: 'GLOBAL',
    factorValue: 2.68, // 2.68 kg CO2e / Liter
    unit: 'LITERS',
    sourceSet: 'GHG_PROTOCOL_2023',
    version: 1,
  },
  {
    category: 'STATIONARY_COMBUSTION',
    subCategory: 'NATURAL_GAS',
    region: 'GLOBAL',
    factorValue: 2.02, // 2.02 kg CO2e / m3
    unit: 'M3',
    sourceSet: 'GHG_PROTOCOL_2023',
    version: 1,
  },
  {
    category: 'MOBILE_COMBUSTION',
    subCategory: 'DIESEL',
    region: 'GLOBAL',
    factorValue: 2.68,
    unit: 'LITERS',
    sourceSet: 'GHG_PROTOCOL_2023',
    version: 1,
  },
  // Scope 2 — Grid Electricity Factors
  {
    category: 'ELECTRICITY',
    subCategory: 'US_GRID',
    region: 'US',
    factorValue: 0.385, // 0.385 kg CO2e / kWh
    unit: 'KWH',
    sourceSet: 'GHG_PROTOCOL_2023',
    version: 1,
  },
  {
    category: 'ELECTRICITY',
    subCategory: 'IN_GRID',
    region: 'IN',
    factorValue: 0.716, // 0.716 kg CO2e / kWh (CEA Grid Factor)
    unit: 'KWH',
    sourceSet: 'GHG_PROTOCOL_2023',
    version: 1,
  },
  {
    category: 'ELECTRICITY',
    subCategory: 'EU_GRID',
    region: 'EU',
    factorValue: 0.255, // 0.255 kg CO2e / kWh
    unit: 'KWH',
    sourceSet: 'GHG_PROTOCOL_2023',
    version: 1,
  },
  // Scope 3 — GLEC Transport & Freight
  {
    category: 'UPSTREAM_TRANSPORT',
    subCategory: 'ROAD_HEAVY_TRUCK',
    region: 'GLOBAL',
    factorValue: 0.092, // 0.092 kg CO2e / tonne-km (GLEC v2.0)
    unit: 'TONNE_KM',
    sourceSet: 'GLEC_2023',
    version: 1,
  },
  {
    category: 'UPSTREAM_TRANSPORT',
    subCategory: 'AIR_FREIGHT',
    region: 'GLOBAL',
    factorValue: 0.602, // 0.602 kg CO2e / tonne-km
    unit: 'TONNE_KM',
    sourceSet: 'GLEC_2023',
    version: 1,
  },
  {
    category: 'DOWNSTREAM_TRANSPORT',
    subCategory: 'ROAD_LIGHT_VAN',
    region: 'GLOBAL',
    factorValue: 0.178, // 0.178 kg CO2e / tonne-km
    unit: 'TONNE_KM',
    sourceSet: 'GLEC_2023',
    version: 1,
  },
  // Scope 3 — Goods & Waste
  {
    category: 'PURCHASED_GOODS',
    subCategory: 'STEEL',
    region: 'GLOBAL',
    factorValue: 1.83, // 1.83 kg CO2e / kg
    unit: 'KG',
    sourceSet: 'DEFRA_2023',
    version: 1,
  },
  {
    category: 'WASTE_MANAGEMENT',
    subCategory: 'LANDFILL',
    region: 'GLOBAL',
    factorValue: 0.45, // 0.45 kg CO2e / kg
    unit: 'KG',
    sourceSet: 'DEFRA_2023',
    version: 1,
  },
];

const unitConversions = [
  { fromUnit: 'GALLONS', toUnit: 'LITERS', conversionFactor: 3.78541 },
  { fromUnit: 'LITERS', toUnit: 'LITERS', conversionFactor: 1.0 },
  { fromUnit: 'LBS', toUnit: 'KG', conversionFactor: 0.453592 },
  { fromUnit: 'KG', toUnit: 'KG', conversionFactor: 1.0 },
  { fromUnit: 'TONNES', toUnit: 'KG', conversionFactor: 1000.0 },
  { fromUnit: 'MILES', toUnit: 'KM', conversionFactor: 1.60934 },
  { fromUnit: 'KM', toUnit: 'KM', conversionFactor: 1.0 },
  { fromUnit: 'MWH', toUnit: 'KWH', conversionFactor: 1000.0 },
  { fromUnit: 'KWH', toUnit: 'KWH', conversionFactor: 1.0 },
];

async function main() {
  console.log('🌱 Starting Carbon OS database seed...');

  // Upsert feature flags
  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: flag,
    });
    console.log(`  ✓ Feature flag: ${flag.key}`);
  }

  // Upsert config entries
  for (const entry of configEntries) {
    await prisma.configEntry.upsert({
      where: { key: entry.key },
      update: { description: entry.description },
      create: {
        key: entry.key,
        valueJson: entry.valueJson as any,
        description: entry.description,
      },
    });
    console.log(`  ✓ Config entry: ${entry.key}`);
  }

  // Upsert controlled industries & emission factor mappings
  for (const ind of controlledIndustries) {
    const industry = await prisma.industry.upsert({
      where: { code: ind.code },
      update: { name: ind.name, description: ind.description },
      create: {
        code: ind.code,
        name: ind.name,
        description: ind.description,
      },
    });

    await prisma.industryFactorMapping.deleteMany({
      where: { industryId: industry.id },
    });

    await prisma.industryFactorMapping.create({
      data: {
        industryId: industry.id,
        emissionFactorSet: ind.defaultFactorSet,
      },
    });

    console.log(`  ✓ Industry: ${ind.code} (${ind.defaultFactorSet})`);
  }

  // Upsert document taxonomy categories
  for (const cat of documentCategories) {
    await prisma.documentCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        scope: cat.scope,
        description: cat.description,
        requiredByDefault: cat.requiredByDefault,
        acceptedMimeTypes: cat.acceptedMimeTypes,
      },
      create: cat,
    });
    console.log(`  ✓ Document Category: ${cat.code} (${cat.scope})`);
  }

  // Upsert controlled emission factors
  for (const factor of defaultEmissionFactors) {
    await prisma.emissionFactor.upsert({
      where: {
        category_subCategory_region_sourceSet_version: {
          category: factor.category,
          subCategory: factor.subCategory,
          region: factor.region,
          sourceSet: factor.sourceSet,
          version: factor.version,
        },
      },
      update: { factorValue: factor.factorValue },
      create: factor,
    });
    console.log(`  ✓ Emission Factor: ${factor.category}:${factor.subCategory} (${factor.factorValue} ${(factor as any).co2eUnit ?? 'kgCO2e'}/${factor.unit})`);
  }

  // Upsert unit conversions
  for (const conv of unitConversions) {
    await prisma.unitConversion.upsert({
      where: {
        fromUnit_toUnit: {
          fromUnit: conv.fromUnit,
          toUnit: conv.toUnit,
        },
      },
      update: { conversionFactor: conv.conversionFactor },
      create: conv,
    });
    console.log(`  ✓ Unit Conversion: ${conv.fromUnit} -> ${conv.toUnit} (x${conv.conversionFactor})`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
