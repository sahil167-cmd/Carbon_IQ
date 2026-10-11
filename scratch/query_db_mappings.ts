import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ACTIVITY TYPE MAPPINGS ===');
  const mappings = await prisma.activityTypeMapping.findMany();
  console.table(mappings);

  console.log('\n=== EMISSION FACTORS (NATURAL GAS & COMBUSTION) ===');
  const factors = await prisma.emissionFactor.findMany({
    where: {
      category: { in: ['STATIONARY_COMBUSTION', 'MOBILE_COMBUSTION', 'COMBUSTION', 'PURCHASED_GOODS', 'UPSTREAM_TRANSPORT'] },
    },
    select: {
      id: true,
      category: true,
      subCategory: true,
      region: true,
      factorValue: true,
      unit: true,
      sourceSet: true,
      version: true,
    },
  });
  console.table(factors);
}

main().catch(console.error).finally(() => prisma.$disconnect());
