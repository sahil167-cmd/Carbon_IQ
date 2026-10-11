import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function retrainAll() {
  const prisma = new PrismaClient();
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });

  console.log('--- RE-TRAINING ALL ORGS WITH CANDIDATE MODEL PIPELINE ---');

  for (const org of orgs) {
    try {
      const res = await fetch('http://localhost:8000/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: org.id,
          database_url: process.env.DATABASE_URL,
        }),
      });
      const data = await res.json();
      console.log(`Org: ${org.name} (${org.id}) ->`, data);
    } catch (err: any) {
      console.error(`Org ${org.name} failed:`, err.message);
    }
  }

  await prisma.$disconnect();
}

retrainAll().catch(console.error);
