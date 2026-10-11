import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function audit() {
  const prisma = new PrismaClient();
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Sahil Borhade' } },
  });

  if (!org) {
    console.log('Org not found!');
    await prisma.$disconnect();
    return;
  }

  console.log(`=== AUDIT FOR ORG: ${org.name} (${org.id}) ===\n`);

  // 1. Documents
  const docs = await prisma.document.findMany({
    where: { organizationId: org.id },
    select: { id: true, fileName: true, status: true, createdAt: true },
  });
  console.log('--- DOCUMENTS ---');
  console.table(docs);

  // 2. Calculated Emissions
  const emissions = await prisma.calculatedEmissions.findMany({
    where: { organizationId: org.id },
    select: {
      id: true,
      documentId: true,
      scope: true,
      co2e: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log('\n--- CALCULATED EMISSIONS ---');
  console.table(emissions);

  // 3. Raw SQL Monthly Aggregation (as used in forecast.repository.ts)
  const rawMonthlyAggs = await prisma.$queryRaw<any[]>`
    SELECT
      DATE_TRUNC('month', "createdAt") AS month,
      SUM(CASE WHEN scope = 'SCOPE_1' THEN co2e ELSE 0 END) AS scope1,
      SUM(CASE WHEN scope = 'SCOPE_2' THEN co2e ELSE 0 END) AS scope2,
      SUM(CASE WHEN scope = 'SCOPE_3' THEN co2e ELSE 0 END) AS scope3,
      SUM(co2e) AS "totalCo2e",
      COUNT(*) AS "docCount"
    FROM calculated_emissions
    WHERE "organizationId" = ${org.id}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month ASC
  `;
  console.log('\n--- RAW SQL MONTHLY AGGREGATES (createdAt) ---');
  console.table(rawMonthlyAggs);

  // 4. ML Models & Predictions in DB
  const models = await prisma.mlModel.findMany({
    where: { organizationId: org.id },
    include: { predictions: true, trainingRuns: true },
  });
  console.log('\n--- DEPLOYED ML MODELS & PREDICTIONS ---');
  console.log(JSON.stringify(models, null, 2));

  await prisma.$disconnect();
}

audit().catch(console.error);
