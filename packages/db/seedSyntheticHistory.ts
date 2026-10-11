import { PrismaClient, ScopeType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * seedSyntheticHistory.ts — FWS §11.2 Cold-Start / Synthetic Data Strategy
 * Seeds 18 months of internally-consistent calculated_emissions rows for a
 * dedicated DEMO organization (DEMO_ML_FORECASTING) to demonstrate XGBoost
 * forecasting path without touching any customer data.
 */
export async function seedSyntheticHistory() {
  console.log('🌱 Seeding 18-month synthetic emissions history for ML demo org...');

  // 1. Create or find Demo Organization
  let org = await prisma.organization.findFirst({
    where: { name: 'CarbonIQ Demo Corp (ML Forecasting)' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'CarbonIQ Demo Corp (ML Forecasting)',
        legalName: 'CarbonIQ Demo Corp Inc.',
        country: 'US',
        address: '100 Innovation Way, San Francisco, CA',
      },
    });
    console.log(`  ✓ Created Demo Org: ${org.id}`);
  } else {
    console.log(`  ✓ Found existing Demo Org: ${org.id}`);
  }

  // 2. Create Site
  let site = await prisma.site.findFirst({
    where: { organizationId: org.id, name: 'San Francisco HQ' },
  });

  if (!site) {
    site = await prisma.site.create({
      data: {
        organizationId: org.id,
        name: 'San Francisco HQ',
        type: 'MANUFACTURING_PLANT',
        country: 'US',
        state: 'CA',
        city: 'San Francisco',
      },
    });
  }

  // 3. Find emission factors to link against
  const dieselFactor = await prisma.emissionFactor.findFirst({
    where: { category: 'STATIONARY_COMBUSTION', subCategory: 'DIESEL' },
  });
  const elecFactor = await prisma.emissionFactor.findFirst({
    where: { category: 'ELECTRICITY', subCategory: 'US_GRID' },
  });
  const freightFactor = await prisma.emissionFactor.findFirst({
    where: { category: 'UPSTREAM_TRANSPORT', subCategory: 'ROAD_HEAVY_TRUCK' },
  });

  if (!dieselFactor || !elecFactor || !freightFactor) {
    console.error('❌ Base emission factors missing! Run `pnpm db:seed` first.');
    process.exit(1);
  }

  // 4. Create Reporting Period
  let period = await prisma.reportingPeriod.findFirst({
    where: { organizationId: org.id, name: '2025-2026 Full History' },
  });

  if (!period) {
    period = await prisma.reportingPeriod.create({
      data: {
        organizationId: org.id,
        name: '2025-2026 Full History',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-06-30'),
        status: 'OPEN',
      },
    });
  }

  // 5. Clean prior synthetic records for clean re-run
  await prisma.calculatedEmissions.deleteMany({
    where: { organizationId: org.id },
  });

  // Find category and user for dummy doc
  const category = await prisma.documentCategory.findFirst();
  const user = await prisma.user.findFirst();

  if (!category || !user) {
    console.error('❌ Document category or user missing! Run `pnpm db:seed` first.');
    process.exit(1);
  }

  // 6. Generate 18 months of data (Jan 2025 – June 2026)
  const startDate = new Date('2025-01-01T00:00:00.000Z');
  const recordsToCreate: any[] = [];

  for (let m = 0; m < 18; m++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + m);

    const monthNum = monthDate.getMonth() + 1; // 1-12

    // Trend component: gradual 8% annual efficiency improvement (emissions trending down)
    const trendFactor = 1.0 - m * 0.006;

    // Seasonality: winter diesel heating peaks (Dec-Feb), summer AC electricity peaks (Jul-Aug)
    const dieselSeason = 1.0 + 0.25 * Math.cos((2 * Math.PI * (monthNum - 1)) / 12);
    const elecSeason = 1.0 + 0.3 * Math.sin((2 * Math.PI * (monthNum - 7)) / 12);

    // Month 7 spike (July 2025): one-off emergency generator outage (tests outlier dampening)
    const spikeMultiplier = m === 6 ? 2.4 : 1.0;

    // Scope 1: Diesel combustion (Liters)
    const dieselLit = Math.round(5000 * trendFactor * dieselSeason * spikeMultiplier);
    const scope1Co2e = Number((dieselLit * dieselFactor.factorValue).toFixed(2));

    // Scope 2: Grid Electricity (kWh)
    const elecKwh = Math.round(22000 * trendFactor * elecSeason);
    const scope2Co2e = Number((elecKwh * elecFactor.factorValue).toFixed(2));

    // Scope 3: Freight Transport (Tonne-km)
    const freightTkm = Math.round(45000 * trendFactor * (0.9 + Math.random() * 0.2));
    const scope3Co2e = Number((freightTkm * freightFactor.factorValue).toFixed(2));

    // Create pseudo Document for this month to satisfy foreign keys
    const dummyDoc = await prisma.document.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        reportingPeriodId: period.id,
        categoryId: category.id,
        uploadedById: user.id,
        fileName: `synthetic_invoice_${monthDate.toISOString().slice(0, 7)}.pdf`,
        fileSize: 10240,
        mimeType: 'application/pdf',
        s3Key: `synthetic/${monthDate.toISOString().slice(0, 7)}.pdf`,
        source: 'MANUAL',
        status: 'APPROVED',
      },
    });

    recordsToCreate.push(
      {
        organizationId: org.id,
        siteId: site.id,
        reportingPeriodId: period.id,
        documentId: dummyDoc.id,
        emissionFactorId: dieselFactor.id,
        scope: ScopeType.SCOPE_1,
        co2e: scope1Co2e,
        activityValue: dieselLit,
        activityUnit: 'LITERS',
        calculationMethod: 'QTY_X_FACTOR',
        createdAt: monthDate,
        updatedAt: monthDate,
      },
      {
        organizationId: org.id,
        siteId: site.id,
        reportingPeriodId: period.id,
        documentId: dummyDoc.id,
        emissionFactorId: elecFactor.id,
        scope: ScopeType.SCOPE_2,
        co2e: scope2Co2e,
        co2eLocation: scope2Co2e,
        activityValue: elecKwh,
        activityUnit: 'KWH',
        calculationMethod: 'ELEC_LOCATION',
        createdAt: monthDate,
        updatedAt: monthDate,
      },
      {
        organizationId: org.id,
        siteId: site.id,
        reportingPeriodId: period.id,
        documentId: dummyDoc.id,
        emissionFactorId: freightFactor.id,
        scope: ScopeType.SCOPE_3,
        co2e: scope3Co2e,
        activityValue: freightTkm,
        activityUnit: 'TONNE_KM',
        calculationMethod: 'WEIGHT_DISTANCE_FACTOR',
        createdAt: monthDate,
        updatedAt: monthDate,
      },
    );
  }

  await prisma.calculatedEmissions.createMany({
    data: recordsToCreate,
  });

  console.log(`  ✓ Successfully seeded 18 months (${recordsToCreate.length} records) for Demo Org.`);
  console.log(`  ✓ Organization ID for testing ML: "${org.id}"`);
}

if (require.main === module) {
  seedSyntheticHistory()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
