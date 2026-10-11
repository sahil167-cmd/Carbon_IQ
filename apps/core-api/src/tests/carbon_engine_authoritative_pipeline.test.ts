import 'dotenv/config';
import { PrismaClient, DocumentStatus } from '@prisma/client';
import { CarbonEngineService } from '../modules/carbon-engine/carbon-engine.service';
import { CarbonEngineRepository } from '../modules/carbon-engine/carbon-engine.repository';
import { DocumentRepository } from '../modules/document/document.repository';
import { AiCollectorRepository } from '../modules/ai-collector/ai-collector.repository';
import { OrganizationRepository } from '../modules/organization/organization.repository';
import { NotificationService } from '../services/notification.service';
import { CanonicalActivityNormalizer } from '../modules/carbon-engine/canonical-activity.normalizer';
import { UnitConverter } from '../modules/carbon-engine/unit-converter';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('================================================================');
  console.log('STARTING AUTHORITATIVE CARBON ACCOUNTING ENGINE PIPELINE TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} -> ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  const org = await prisma.organization.findFirst({
    where: { calculatedEmissions: { some: {} } },
    include: { reportingPeriods: true, sites: true },
  });

  if (!org) {
    console.error('No test organization found with calculated emissions');
    return;
  }

  const orgId = org.id;
  const repo = new CarbonEngineRepository(prisma, orgId);
  const docRepo = new DocumentRepository(prisma, orgId);
  const aiRepo = new AiCollectorRepository(prisma, orgId);
  const orgRepo = new OrganizationRepository(prisma, orgId);
  const notifService = new NotificationService(prisma);
  const engine = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, notifService);
  const converter = new UnitConverter(prisma);

  // ---------------------------------------------------------------------------
  // TEST 1: Idempotency — Same document calculated twice produces exact same CO2e
  // ---------------------------------------------------------------------------
  const sampleDoc = await prisma.document.findFirst({
    where: {
      organizationId: orgId,
      calculatedEmissions: { some: {} },
    },
  });

  if (sampleDoc) {
    const res1 = await engine.calculateApprovedRecord(sampleDoc.id, orgId);
    const res2 = await engine.calculateApprovedRecord(sampleDoc.id, orgId);
    assert(
      res1 !== null && res2 !== null && res1.co2e === res2.co2e,
      'TEST 1: Idempotency (Calculated twice -> exact same result)',
      `res1=${res1?.co2e} vs res2=${res2?.co2e}`,
    );
  } else {
    console.log('[SKIP] TEST 1: No calculated sample document in org');
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Multiple Clicks on Calculate — 5 consecutive runs produce 100% identical CO2e
  // ---------------------------------------------------------------------------
  if (sampleDoc) {
    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await engine.calculateApprovedRecord(sampleDoc.id, orgId);
      if (r) results.push(r.co2e);
    }
    const allEqual = results.every(v => v === results[0]);
    assert(
      allEqual && results.length === 5,
      'TEST 2: Repeatability (5 consecutive calculations -> 100% identical result)',
      `Results: ${results.join(', ')}`,
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Unit Normalization — Gallons to Liters converted exactly once
  // ---------------------------------------------------------------------------
  const gallonsVal = new Decimal(6850);
  const litersConverted = await converter.convert(gallonsVal, 'GALLONS', 'LITERS');
  const expectedLiters = 6850 * 3.78541; // 25930.0585
  assert(
    Math.abs(litersConverted.toNumber() - expectedLiters) < 0.01,
    'TEST 3: Unit Normalization (Gallons -> Liters converted exactly once with precision factor 3.78541)',
    `Got ${litersConverted.toNumber()}, expected ~${expectedLiters}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Identity Unit Conversion — Liters to Liters is 1.0 identity
  // ---------------------------------------------------------------------------
  const litersVal = new Decimal(4250);
  const litersSame = await converter.convert(litersVal, 'LITERS', 'LITERS');
  assert(
    litersSame.toNumber() === 4250,
    'TEST 4: Unit Idempotency (Liters -> Liters is exact identity without double conversion)',
    `Got ${litersSame.toNumber()}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Canonical Fuel Vocabulary Resolution — DIESEL / HSD / HIGH SPEED DIESEL
  // ---------------------------------------------------------------------------
  const dieselNorm = CanonicalActivityNormalizer.normalize({
    categoryCode: 'MOBILE_COMBUSTION',
    fields: { fuelType: 'HIGH_SPEED_DIESEL', quantity: 4250, unit: 'LITERS' },
  });
  assert(
    dieselNorm.subCategory === 'DIESEL' && !dieselNorm.needsReview,
    'TEST 5: Canonical Vocabulary (HIGH_SPEED_DIESEL resolves to subCategory DIESEL)',
    `subCategory=${dieselNorm.subCategory}, needsReview=${dieselNorm.needsReview}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Canonical Material Vocabulary Resolution — STEEL resolves to STEEL_PRIMARY
  // ---------------------------------------------------------------------------
  const steelNorm = CanonicalActivityNormalizer.normalize({
    categoryCode: 'PURCHASED_GOODS',
    fields: { materialType: 'STEEL', quantity: 28500, unit: 'KG' },
  });
  assert(
    steelNorm.subCategory === 'STEEL_PRIMARY' && !steelNorm.needsReview,
    'TEST 6: Material Vocabulary (STEEL resolves to approved DEFRA key STEEL_PRIMARY)',
    `subCategory=${steelNorm.subCategory}, needsReview=${steelNorm.needsReview}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Genuinely Missing Quantity — Produces structured needsReview (Never fake number)
  // ---------------------------------------------------------------------------
  const missingQtyNorm = CanonicalActivityNormalizer.normalize({
    categoryCode: 'STATIONARY_COMBUSTION',
    fields: { fuelType: 'DIESEL', unit: 'LITERS' }, // no quantity
  });
  assert(
    missingQtyNorm.needsReview === true && !!missingQtyNorm.blockReason,
    'TEST 7: Missing Accounting Input (Zero quantity -> structured needsReview, never fake number)',
    `needsReview=${missingQtyNorm.needsReview}, blockReason=${missingQtyNorm.blockReason}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Genuinely Unknown Material — Produces structured needsReview
  // ---------------------------------------------------------------------------
  const unknownMatNorm = CanonicalActivityNormalizer.normalize({
    categoryCode: 'PURCHASED_GOODS',
    fields: { materialType: 'UNOBTAINIUM_CRYSTAL', quantity: 500, unit: 'KG' },
  });
  assert(
    unknownMatNorm.needsReview === true && unknownMatNorm.subCategory === 'Missing',
    'TEST 8: Unknown Material (Unapproved material -> needsReview, never arbitrary fallback)',
    `subCategory=${unknownMatNorm.subCategory}, needsReview=${unknownMatNorm.needsReview}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Freight Transport Normalization — Preserves Distance and Cargo Weight
  // ---------------------------------------------------------------------------
  const freightNorm = CanonicalActivityNormalizer.normalize({
    categoryCode: 'UPSTREAM_TRANSPORT',
    fields: { weightKg: 28500, distanceKm: 1500, unit: 'TONNE_KM' },
  });
  const expectedTonneKm = (28500 / 1000) * 1500; // 42,750 tonne-km
  assert(
    freightNorm.quantity === expectedTonneKm && freightNorm.subCategory === 'ROAD_HEAVY_TRUCK',
    'TEST 9: Freight Normalization (Cargo 28,500kg x 1,500km -> 42,750 Tonne-Km)',
    `quantity=${freightNorm.quantity}, subCategory=${freightNorm.subCategory}`,
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Approved Factor Lookup — Resolves DEFRA & EPA factors from PostgreSQL
  // ---------------------------------------------------------------------------
  const { PostgresEmissionFactorProvider } = await import('../modules/carbon-engine/emission-factor.provider');
  const provider = new PostgresEmissionFactorProvider(prisma);

  const dieselFactor = await provider.resolveFactor({
    category: 'MOBILE_COMBUSTION',
    subCategory: 'DIESEL',
    region: 'GLOBAL',
  });
  assert(
    dieselFactor !== null && dieselFactor.factorValue > 0 && dieselFactor.sourceSet === 'DEFRA_2024',
    'TEST 10: Approved Factor Lookup (DEFRA 2024 Mobile Diesel resolved from database)',
    `factor=${dieselFactor?.factorValue} ${dieselFactor?.unit} from ${dieselFactor?.sourceSet}`,
  );

  const steelFactor = await provider.resolveFactor({
    category: 'PURCHASED_GOODS',
    subCategory: 'STEEL', // alias to STEEL_PRIMARY
    region: 'GLOBAL',
  });
  assert(
    steelFactor !== null && steelFactor.factorValue === 1.83,
    'TEST 10b: Subcategory Alias Lookup (STEEL alias resolves to DEFRA Primary Steel 1.83 kgCO2e/kg)',
    `factor=${steelFactor?.factorValue} ${steelFactor?.unit} from ${steelFactor?.sourceSet}`,
  );

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test run error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
