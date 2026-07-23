import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { AiCollectorRepository } from './src/modules/ai-collector/ai-collector.repository';
import { AiCollectorService } from './src/modules/ai-collector/ai-collector.service';
import { DocumentRepository } from './src/modules/document/document.repository';
import { OrganizationRepository } from './src/modules/organization/organization.repository';
import { FeatureFlagService } from './src/services/feature-flag.service';
import { ConfigService } from './src/services/config.service';

const prisma = new PrismaClient();

async function run() {
  const docs = await prisma.document.findMany({
    include: { category: true },
  });

  console.log(`Re-extracting full PDF invoice metadata for ${docs.length} documents...`);

  for (const doc of docs) {
    const aiRepo = new AiCollectorRepository(prisma, doc.organizationId);
    const docRepo = new DocumentRepository(prisma, doc.organizationId);
    const orgRepo = new OrganizationRepository(prisma, doc.organizationId);
    const flagService = new FeatureFlagService(prisma);
    const configService = new ConfigService(prisma);

    const aiService = new AiCollectorService(aiRepo, docRepo, orgRepo, flagService, configService);
    try {
      const ext = await aiService.processDocumentExtraction(doc.id, doc.organizationId);
      console.log(`+ Extracted [${doc.fileName}] (${doc.category.code}): ${Object.keys(ext?.fields || {}).length} fields`);
    } catch (e: any) {
      console.log(`- Extraction note for [${doc.fileName}]: ${e.message}`);
    }
  }

  console.log('All documents re-extracted successfully!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
