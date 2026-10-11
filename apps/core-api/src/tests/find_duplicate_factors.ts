import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allFactors = await prisma.emissionFactor.findMany();
  const map = new Map<string, typeof allFactors>();

  for (const f of allFactors) {
    const key = `${f.category}::${f.subCategory}::${f.region}::${f.version}`;
    const list = map.get(key) || [];
    list.push(f);
    map.set(key, list);
  }

  const duplicates: Array<{ key: string; count: number; ids: string[]; values: number[] }> = [];
  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      duplicates.push({
        key,
        count: list.length,
        ids: list.map(l => l.id),
        values: list.map(l => l.factorValue),
      });
    }
  }

  console.log(`Total factors in DB: ${allFactors.length}`);
  console.log(`Duplicate factor groupings found: ${duplicates.length}`);
  console.table(duplicates);
}

main().catch(console.error).finally(() => prisma.$disconnect());
