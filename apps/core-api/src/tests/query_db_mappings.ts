import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ACTIVITY TYPE MAPPINGS ===');
  const mappings = await prisma.activityTypeMapping.findMany();
  console.table(mappings);

  console.log('\n=== ALL EMISSION FACTORS ===');
  const factors = await prisma.emissionFactor.findMany({
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
    orderBy: [{ category: 'asc' }, { subCategory: 'asc' }],
  });
  console.table(factors);
}

main().catch(console.error).finally(() => prisma.$disconnect());
