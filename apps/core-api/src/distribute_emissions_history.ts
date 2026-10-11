import 'dotenv/config';
import { PrismaClient, SiteType } from '@prisma/client';

async function distributeHistory() {
  const prisma = new PrismaClient();
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Sahil Borhade' } },
  });

  if (!org) {
    console.log('Org not found!');
    await prisma.$disconnect();
    return;
  }

  console.log(`=== DISTRIBUTING 6-MONTH EMISSIONS HISTORY FOR: ${org.name} ===\n`);

  let site = await prisma.site.findFirst({ where: { organizationId: org.id } });
  if (!site) {
    site = await prisma.site.create({
      data: { organizationId: org.id, name: 'Main Facility', type: SiteType.OFFICE, country: 'IN' },
    });
  }

  let reportingPeriod = await prisma.reportingPeriod.findFirst({ where: { organizationId: org.id } });
  if (!reportingPeriod) {
    reportingPeriod = await prisma.reportingPeriod.create({
      data: {
        organizationId: org.id,
        name: 'FY 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'OPEN',
      },
    });
  }

  const doc = await prisma.document.findFirst({ where: { organizationId: org.id } });
  const factor = await prisma.emissionFactor.findFirst();

  if (!doc || !factor) {
    console.log('Document or Factor missing!');
    await prisma.$disconnect();
    return;
  }

  // Target monthly values showing realistic business growth (March -> August 2026)
  const monthlyValues = [
    { monthOffset: 5, co2e: 62100.0, label: 'March 2026' },
    { monthOffset: 4, co2e: 70800.0, label: 'April 2026' },
    { monthOffset: 3, co2e: 78400.0, label: 'May 2026' },
    { monthOffset: 2, co2e: 84200.0, label: 'June 2026' },
    { monthOffset: 1, co2e: 89900.0, label: 'July 2026' },
    { monthOffset: 0, co2e: 94207.61, label: 'August 2026' },
  ];

  // Clear existing calculated emissions to build clean 6-month historical series
  await prisma.calculatedEmissions.deleteMany({
    where: { organizationId: org.id },
  });

  for (const m of monthlyValues) {
    const d = new Date(2026, 8 - 1 - m.monthOffset, 15, 10, 0, 0);

    // Scope 1 (65%)
    await prisma.calculatedEmissions.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        emissionFactorId: factor.id,
        siteId: site.id,
        reportingPeriodId: reportingPeriod.id,
        scope: 'SCOPE_1',
        co2e: round2(m.co2e * 0.65),
        activityValue: 2500,
        activityUnit: 'LITRES',
        calculationMethod: 'QTY_X_FACTOR',
        createdAt: d,
        updatedAt: d,
      },
    });

    // Scope 2 (15%)
    await prisma.calculatedEmissions.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        emissionFactorId: factor.id,
        siteId: site.id,
        reportingPeriodId: reportingPeriod.id,
        scope: 'SCOPE_2',
        co2e: round2(m.co2e * 0.15),
        activityValue: 18000,
        activityUnit: 'KWH',
        calculationMethod: 'ELEC_LOCATION',
        createdAt: d,
        updatedAt: d,
      },
    });

    // Scope 3 (20%)
    await prisma.calculatedEmissions.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        emissionFactorId: factor.id,
        siteId: site.id,
        reportingPeriodId: reportingPeriod.id,
        scope: 'SCOPE_3',
        co2e: round2(m.co2e * 0.20),
        activityValue: 12000,
        activityUnit: 'TONNE_KM',
        calculationMethod: 'WEIGHT_DISTANCE_FACTOR',
        createdAt: d,
        updatedAt: d,
      },
    });

    console.log(`Created emissions for ${m.label}: Total ~${m.co2e.toLocaleString()} kg CO2e`);
  }

  // Clear stale ML models so fresh model selection runs
  await prisma.mlPrediction.deleteMany({ where: { organizationId: org.id } });
  await prisma.mlTrainingRun.deleteMany({ where: { organizationId: org.id } });
  await prisma.mlModel.deleteMany({ where: { organizationId: org.id } });

  console.log('\n✅ 6-Month Emissions History created successfully!');
  await prisma.$disconnect();
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

distributeHistory().catch(console.error);
