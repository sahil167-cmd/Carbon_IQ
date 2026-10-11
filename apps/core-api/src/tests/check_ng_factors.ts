import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ng = await prisma.emissionFactor.findMany({
    where: { subCategory: { contains: 'NATURAL_GAS' } },
  });
  console.table(ng.map(f => ({
    id: f.id,
    category: f.category,
    subCategory: f.subCategory,
    region: f.region,
    factorValue: f.factorValue,
    unit: f.unit,
    version: f.version,
    sourceSet: f.sourceSet,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
