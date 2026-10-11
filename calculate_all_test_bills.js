const { PrismaClient } = require('@prisma/client');
const { CarbonEngineService } = require('./apps/core-api/src/modules/carbon-engine/carbon-engine.service');

const prisma = new PrismaClient();
const calcService = new CarbonEngineService(prisma);

async function main() {
  console.log('Calculating carbon footprint for all 9 ingested test documents...');
  const docs = await prisma.document.findMany({
    where: {
      fileName: {
        startsWith: 'scope',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 9,
  });

  for (const doc of docs) {
    console.log(`Calculating for [${doc.id}] ${doc.fileName}...`);
    try {
      const res = await calcService.calculateApprovedRecord(doc.id, doc.organizationId);
      if (res) {
        console.log(`  ✓ Scope: ${res.scope} | co2e: ${res.co2e} kgCO2e (${(res.co2e/1000).toFixed(4)} tCO2e)`);
        console.log(`  ✓ Formula: ${res.formulaUsed}`);
      } else {
        console.log(`  ⚠ Calculation returned null for ${doc.fileName}`);
      }
    } catch (err) {
      console.error(`  ✕ Error calculating for ${doc.fileName}:`, err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
