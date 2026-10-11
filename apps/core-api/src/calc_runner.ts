import { PrismaClient } from '@prisma/client';
import { CarbonEngineService } from './modules/carbon-engine/carbon-engine.service';
import { CarbonEngineRepository } from './modules/carbon-engine/carbon-engine.repository';
import { DocumentRepository } from './modules/document/document.repository';
import { AiCollectorRepository } from './modules/ai-collector/ai-collector.repository';
import { OrganizationRepository } from './modules/organization/organization.repository';
import { NotificationService } from './services/notification.service';
import { tenantStorage } from './core/middleware/tenant-context.middleware';

const prisma = new PrismaClient();

const repo = new CarbonEngineRepository(prisma);
const docRepo = new DocumentRepository(prisma);
const aiRepo = new AiCollectorRepository(prisma);
const orgRepo = new OrganizationRepository(prisma);
const notifService = new NotificationService(prisma);

const calcService = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, notifService);

async function main() {
  console.log('Calculating emissions for all 9 test documents...');
  const docs = await prisma.document.findMany({
    where: {
      fileName: { startsWith: 'scope' },
    },
    orderBy: { createdAt: 'desc' },
    take: 9,
  });

  for (const doc of docs) {
    console.log(`Processing [${doc.id}] ${doc.fileName}...`);
    try {
      const result = await tenantStorage.run(
        { organizationId: doc.organizationId, userId: 'system', role: 'ORG_ADMIN' },
        () => calcService.calculateApprovedRecord(doc.id, doc.organizationId),
      );

      if (result) {
        console.log(`  ✓ Scope: ${result.scope} | Emissions: ${result.co2e} kg CO2e (${(result.co2e / 1000).toFixed(4)} t CO2e)`);
        console.log(`  ✓ Formula: ${result.formulaUsed}`);
      } else {
        console.log(`  ⚠ Calculation returned null for ${doc.fileName}`);
      }
    } catch (err: any) {
      console.error(`  ✕ Error:`, err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
