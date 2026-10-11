import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== STATIONARY COMBUSTION FACTORS ===');
  const factors = await prisma.emissionFactor.findMany({
    where: { category: 'STATIONARY_COMBUSTION' },
    orderBy: [{ subCategory: 'asc' }, { region: 'asc' }],
  });
  console.table(factors.map(f => ({
    id: f.id,
    subCategory: f.subCategory,
    region: f.region,
    factorValue: f.factorValue,
    unit: f.unit,
    sourceSet: f.sourceSet,
  })));

  console.log('\n=== MOBILE COMBUSTION FACTORS ===');
  const mobFactors = await prisma.emissionFactor.findMany({
    where: { category: 'MOBILE_COMBUSTION' },
    orderBy: [{ subCategory: 'asc' }, { region: 'asc' }],
  });
  console.table(mobFactors.map(f => ({
    id: f.id,
    subCategory: f.subCategory,
    region: f.region,
    factorValue: f.factorValue,
    unit: f.unit,
    sourceSet: f.sourceSet,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
