import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({
    include: {
      category: true,
      calculatedEmissions: true,
      extractedData: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  console.log(`Found ${docs.length} documents in database:\n`);
  for (const d of docs) {
    console.log(`- Document ID: ${d.id}`);
    console.log(`  File Name: ${d.fileName}`);
    console.log(`  Category Code: ${d.category?.code}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  Manual Data:`, JSON.stringify(d.manualData));
    console.log(`  Extracted Data:`, JSON.stringify(d.extractedData[0]?.fieldsJson));
    console.log(
      `  Emissions:`,
      d.calculatedEmissions.map((e) => ({
        co2e: Number(e.co2e),
        activityValue: Number(e.activityValue),
        activityUnit: e.activityUnit,
        method: e.calculationMethod,
      }))
    );
    console.log('----------------------------------------------------');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
