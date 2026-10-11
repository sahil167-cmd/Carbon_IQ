import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { getPrismaClient } from '../core/repository/tenant-scoped.repository';
import { CanonicalActivityNormalizer } from '../modules/carbon-engine/canonical-activity.normalizer';
import { CarbonEngineService } from '../modules/carbon-engine/carbon-engine.service';
import { CarbonEngineRepository } from '../modules/carbon-engine/carbon-engine.repository';
import { DocumentRepository } from '../modules/document/document.repository';
import { AiCollectorRepository } from '../modules/ai-collector/ai-collector.repository';
import { OrganizationRepository } from '../modules/organization/organization.repository';
import { NotificationService } from '../services/notification.service';
import { ScopeType, DocumentStatus, DocumentSource } from '@prisma/client';

async function main() {
  console.log('='.repeat(80));
  console.log('   CARBONIQ UNIVERSAL ACCOUNTING PIPELINE COMPREHENSIVE REGRESSION SUITE');
  console.log('='.repeat(80));

  const prisma = getPrismaClient();

  const org = await prisma.organization.findFirst();
  const site = await prisma.site.findFirst({ where: { organizationId: org!.id } });
  const period = await prisma.reportingPeriod.findFirst({ where: { organizationId: org!.id } });
  const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });
  const catTransport = await prisma.documentCategory.findFirst({ where: { code: 'UPSTREAM_TRANSPORT' } });
  const catPurchased = await prisma.documentCategory.findFirst({ where: { code: 'PURCHASED_GOODS' } });

  const orgId = org!.id;
  const siteId = site!.id;
  const periodId = period!.id;
  const userId = user!.id;

  const repo = new CarbonEngineRepository(prisma);
  const docRepo = new DocumentRepository(prisma, orgId);
  const aiRepo = new AiCollectorRepository(prisma, orgId);
  const orgRepo = new OrganizationRepository(prisma, orgId);
  const notifService = new NotificationService(prisma);
  const engine = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, notifService);

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Scenario ${total}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Scenario ${total}: ${name} -> ${detail}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Scope 1 Mobile Diesel (Gallons -> Liters Conversion)
  // ───────────────────────────────────────────────────────────────────────────
  const s1Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'MOBILE_COMBUSTION',
    fields: { fuelType: 'DIESEL', quantity: 6850, unit: 'GALLONS' },
    siteCountry: 'US',
    rawText: 'FLEET REFUELING LOG - 6,850 Gallons Commercial Diesel #2',
  });
  assert(
    'Scope 1 Mobile Diesel Normalization',
    s1Canonical.scope === ScopeType.SCOPE_1 &&
    s1Canonical.category === 'MOBILE_COMBUSTION' &&
    s1Canonical.subCategory === 'DIESEL' &&
    s1Canonical.unit === 'GALLONS' &&
    s1Canonical.quantity === 6850 &&
    !s1Canonical.needsReview,
    `Got scope ${s1Canonical.scope}, cat ${s1Canonical.category}, sub ${s1Canonical.subCategory}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Scope 1 Stationary Diesel (Liters)
  // ───────────────────────────────────────────────────────────────────────────
  const s2Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'STATIONARY_COMBUSTION',
    fields: { fuelType: 'DIESEL', quantity: 4250, unit: 'LITERS' },
    siteCountry: 'US',
    rawText: 'STATIONARY COMBUSTION GENERATOR - 4,250 Liters Ultra-Low Sulfur Diesel',
  });
  assert(
    'Scope 1 Stationary Diesel Normalization',
    s2Canonical.scope === ScopeType.SCOPE_1 &&
    s2Canonical.category === 'STATIONARY_COMBUSTION' &&
    s2Canonical.subCategory === 'DIESEL' &&
    s2Canonical.unit === 'LITERS' &&
    s2Canonical.quantity === 4250 &&
    !s2Canonical.needsReview,
    `Got subCategory ${s2Canonical.subCategory}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Scope 1 Natural Gas Utility (m³)
  // ───────────────────────────────────────────────────────────────────────────
  const s3Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'STATIONARY_COMBUSTION',
    fields: { fuelType: 'NATURAL_GAS', quantity: 18400, unit: 'M3' },
    siteCountry: 'US',
    rawText: 'NATURAL GAS UTILITY STATEMENT - Volume 18,400 M3 Pipeline Natural Gas',
  });
  assert(
    'Scope 1 Natural Gas Normalization',
    s3Canonical.scope === ScopeType.SCOPE_1 &&
    s3Canonical.category === 'STATIONARY_COMBUSTION' &&
    s3Canonical.subCategory === 'NATURAL_GAS' &&
    s3Canonical.unit === 'M3' &&
    s3Canonical.quantity === 18400,
    `Got subCategory ${s3Canonical.subCategory}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Scope 2 Electricity (KWH)
  // ───────────────────────────────────────────────────────────────────────────
  const s4Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'ELECTRICITY',
    fields: { kwhConsumed: 12500, unit: 'KWH' },
    siteCountry: 'US',
    rawText: 'COMMERCIAL ELECTRIC UTILITY INVOICE - Total Consumption: 12,500 kWh',
  });
  assert(
    'Scope 2 Electricity Normalization',
    s4Canonical.scope === ScopeType.SCOPE_2 &&
    s4Canonical.category === 'ELECTRICITY' &&
    s4Canonical.subCategory === 'US_GRID' &&
    s4Canonical.quantity === 12500,
    `Got scope ${s4Canonical.scope}, sub ${s4Canonical.subCategory}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Scope 3 Purchased Goods Steel (KG)
  // ───────────────────────────────────────────────────────────────────────────
  const s5Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'PURCHASED_GOODS',
    fields: { materialType: 'STEEL', quantity: 28500, unit: 'KG' },
    siteCountry: 'US',
    rawText: 'RAW MATERIAL PURCHASE ORDER - 28,500 KG Structural Steel Beams',
  });
  assert(
    'Scope 3 Purchased Goods Steel Normalization',
    s5Canonical.scope === ScopeType.SCOPE_3 &&
    s5Canonical.category === 'PURCHASED_GOODS' &&
    s5Canonical.subCategory === 'STEEL' &&
    s5Canonical.quantity === 28500,
    `Got subCategory ${s5Canonical.subCategory}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Scope 3 Freight / Tonne-Km (Strict Dimensional Preservation)
  // ───────────────────────────────────────────────────────────────────────────
  const s6Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'UPSTREAM_TRANSPORT',
    fields: { distanceKm: 8900, weightKg: 18500, unit: 'TONNE_KM' },
    siteCountry: 'US',
    rawText: 'INTERMODAL BILL OF LADING - Route 8,900 km, Gross Cargo 18,500 KG (18.5 Tonnes)',
  });
  assert(
    'Scope 3 Freight Normalization (TONNE_KM Preserved)',
    s6Canonical.scope === ScopeType.SCOPE_3 &&
    s6Canonical.category === 'UPSTREAM_TRANSPORT' &&
    s6Canonical.unit === 'TONNE_KM' &&
    s6Canonical.quantity === 164650,
    `Got quantity ${s6Canonical.quantity}, unit ${s6Canonical.unit}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Scope 3 Business Travel / Air Freight
  // ───────────────────────────────────────────────────────────────────────────
  const s7Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'UPSTREAM_TRANSPORT',
    fields: { distanceKm: 3200, weightKg: 5000 },
    siteCountry: 'US',
    rawText: 'AIR WAYBILL AWB-77291 LUFTHANSA CARGO FLIGHT 3,200 KM 5,000 KG',
  });
  assert(
    'Scope 3 Air Freight Normalization',
    s7Canonical.scope === ScopeType.SCOPE_3 &&
    s7Canonical.category === 'UPSTREAM_TRANSPORT' &&
    s7Canonical.subCategory === 'AIR_FREIGHT' &&
    s7Canonical.quantity === 16000,
    `Got sub ${s7Canonical.subCategory}, qty ${s7Canonical.quantity}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Scope 3 Rail Freight
  // ───────────────────────────────────────────────────────────────────────────
  const s8Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'UPSTREAM_TRANSPORT',
    fields: { distanceKm: 1200, weightKg: 50000 },
    siteCountry: 'US',
    rawText: 'RAIL FREIGHT WAYBILL - 50,000 KG Intermodal Rail Freight 1,200 KM',
  });
  assert(
    'Scope 3 Rail Freight Normalization',
    s8Canonical.subCategory === 'RAIL_DIESEL' &&
    s8Canonical.quantity === 60000,
    `Got sub ${s8Canonical.subCategory}, qty ${s8Canonical.quantity}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 9: Document with Missing Material (Routes to Review & Recalculates)
  // ───────────────────────────────────────────────────────────────────────────
  const s9CanonicalMissing = CanonicalActivityNormalizer.normalize({
    categoryCode: 'PURCHASED_GOODS',
    fields: { quantity: 28500, unit: 'KG' },
    siteCountry: 'US',
    rawText: 'PURCHASE ORDER - 28,500 KG Unspecified Industrial Supplies',
  });
  assert(
    'Missing Material Routes to Review Workspace',
    s9CanonicalMissing.needsReview === true &&
    s9CanonicalMissing.subCategory === 'Missing' &&
    s9CanonicalMissing.blockReason !== null,
    `Got needsReview ${s9CanonicalMissing.needsReview}`
  );

  // Reviewer corrects materialType = 'STEEL' in manualData
  const s9CanonicalCorrected = CanonicalActivityNormalizer.normalize({
    categoryCode: 'PURCHASED_GOODS',
    fields: { ...s9CanonicalMissing.sourceEvidence, materialType: 'STEEL', quantity: 28500, unit: 'KG' },
    siteCountry: 'US',
    rawText: 'PURCHASE ORDER - 28,500 KG Unspecified Industrial Supplies',
  });
  assert(
    'Reviewer Correction Recalculates Successfully',
    s9CanonicalCorrected.needsReview === false &&
    s9CanonicalCorrected.subCategory === 'STEEL' &&
    s9CanonicalCorrected.quantity === 28500,
    `Got subCategory ${s9CanonicalCorrected.subCategory}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 10: Missing Quantity Guard (Zero is NEVER a fallback)
  // ───────────────────────────────────────────────────────────────────────────
  const s10Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'STATIONARY_COMBUSTION',
    fields: { fuelType: 'DIESEL', quantity: 'Missing', unit: 'LITERS' },
    siteCountry: 'US',
    rawText: 'FUEL DELIVERY RECEIPT - Ultra-Low Sulfur Diesel',
  });
  assert(
    'Missing Quantity Triggers Review (Never 0 Fallback)',
    s10Canonical.needsReview === true &&
    s10Canonical.quantity === 0 &&
    s10Canonical.blockReason?.includes('Missing fuel consumption volume') === true,
    `Got needsReview ${s10Canonical.needsReview}, blockReason ${s10Canonical.blockReason}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 11: Dimensional Guard Rejects Incompatible Units
  // ───────────────────────────────────────────────────────────────────────────
  const testDocId = `test_doc_${Date.now()}`;
  const doc = await prisma.document.create({
    data: {
      id: testDocId,
      organizationId: orgId,
      siteId,
      reportingPeriodId: periodId,
      categoryId: catTransport!.id,
      uploadedById: userId,
      fileName: 'adversarial_transport_with_liters.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      s3Key: `test/${testDocId}.pdf`,
      source: DocumentSource.UPLOAD,
      status: DocumentStatus.APPROVED,
    },
  });

  // Persist extracted data with mismatched unit (LITERS against UPSTREAM_TRANSPORT)
  await prisma.extractedData.create({
    data: {
      documentId: testDocId,
      extractionVersion: 1,
      fieldsJson: {
        quantity: { value: 5000 },
        unit: { value: 'LITERS' }, // Incompatible with transport factor TONNE_KM
      },
      fieldConfidenceJson: {},
      modelVersion: 'test',
      status: 'SUCCESS',
    },
  });

  const blockedResult = await engine.calculateApprovedRecord(testDocId, orgId);
  const updatedBlockedDoc = await prisma.document.findUnique({ where: { id: testDocId } });
  assert(
    'Dimensional Guard Blocks Incompatible Physical Conversion',
    blockedResult === null &&
    updatedBlockedDoc?.status === DocumentStatus.CALCULATION_BLOCKED,
    `Status is ${updatedBlockedDoc?.status}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 12: Conflicting Evidence Resolved by Strict Evidence Hierarchy
  // ───────────────────────────────────────────────────────────────────────────
  const s12Canonical = CanonicalActivityNormalizer.normalize({
    categoryCode: 'BUSINESS_TRAVEL', // Misclassified category code
    fields: { tonneKm: 21000, distanceKm: 1500, weightKg: 14000, unit: 'TONNE_KM' },
    siteCountry: 'US',
    rawText: 'INTERMODAL BILL OF LADING - Cargo Waybill 21,000 Tonne-Km Freight',
  });
  assert(
    'Conflicting Evidence Hierarchy Resolves True Freight Category',
    s12Canonical.category === 'UPSTREAM_TRANSPORT' &&
    s12Canonical.unit === 'TONNE_KM' &&
    s12Canonical.quantity === 21000,
    `Resolved category ${s12Canonical.category}, unit ${s12Canonical.unit}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 13: BRAND NEW UNSEEN DOCUMENT (End-to-End Accounting Pipeline)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TESTING BRAND NEW UNSEEN COMMERCIAL LOGISTICS DOCUMENT ---');
  const unseenDocId = `unseen_doc_${Date.now()}`;
  const unseenDoc = await prisma.document.create({
    data: {
      id: unseenDocId,
      organizationId: orgId,
      siteId,
      reportingPeriodId: periodId,
      categoryId: catPurchased!.id, // Initial placeholder category
      uploadedById: userId,
      fileName: 'unseen_new_commercial_heavy_freight.pdf',
      fileSize: 4096,
      mimeType: 'application/pdf',
      s3Key: `test/${unseenDocId}.pdf`,
      source: DocumentSource.UPLOAD,
      status: DocumentStatus.APPROVED,
    },
  });

  // Brand new unseen invoice: 45,000 KG cargo transported 1,000 km by Heavy Truck
  // Expected activity: (45,000 kg / 1000) * 1,000 km = 45,000 TONNE_KM
  // Expected factor: ROAD_HEAVY_TRUCK = 0.0921 kgCO2e/tkm (GLEC v3)
  // Expected CO2e: 45,000 * 0.0921 = 4,144.5 kg CO2e
  await prisma.extractedData.create({
    data: {
      documentId: unseenDocId,
      extractionVersion: 1,
      fieldsJson: {
        weightKg: { value: 45000 },
        distanceKm: { value: 1000 },
        unit: { value: 'TONNE_KM' },
      },
      fieldConfidenceJson: {},
      modelVersion: 'mistral-vision+langgraph',
      status: 'SUCCESS',
    },
  });

  const unseenCalcResult = await engine.calculateApprovedRecord(unseenDocId, orgId);
  console.log('Unseen document calculation result:', unseenCalcResult);

  assert(
    'BRAND NEW UNSEEN DOCUMENT End-to-End Execution',
    unseenCalcResult !== null &&
    unseenCalcResult.scope === ScopeType.SCOPE_3 &&
    unseenCalcResult.activityUnit === 'TONNE_KM' &&
    Math.abs(unseenCalcResult.co2e - 4144.5) < 1.0,
    `Calculated ${unseenCalcResult?.co2e} kgCO2e, expected ~4144.5 kgCO2e`
  );

  console.log('\n===============================================================');
  console.log(` RESULTS: ${passed} / ${total} COMPREHENSIVE SCENARIOS PASSED`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (passed === total) {
    console.log('ALL COMPREHENSIVE UNIVERSAL PIPELINE TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}

main().catch(console.error);
