import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.emissionFactor.count();
  console.log('Total emission factors in DB:', count);
  const sample = await prisma.emissionFactor.findFirst();
  console.log('Sample factor fields:', Object.keys(sample || {}));
  console.log('Sample factor:', sample);
  
  const factors = await prisma.emissionFactor.findMany({
    select: {
      id: true,
      category: true,
      subCategory: true,
      region: true,
      unit: true,
      factorValue: true,
      sourceSet: true,
      version: true,
    }
  });
  console.log('Distinct Categories:', Array.from(new Set(factors.map(f => f.category))));
  console.log('Total records:', factors.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
