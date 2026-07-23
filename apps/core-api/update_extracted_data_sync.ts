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
  const docId = 'cmrxkmcay001029u56fvh61qr';
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { category: true, site: true },
  });

  console.log('Target Document:', doc ? { id: doc.id, fileName: doc.fileName } : 'Not found');
  if (!doc) return;

  const aiRepo = new AiCollectorRepository(prisma, doc.organizationId);
  const docRepo = new DocumentRepository(prisma, doc.organizationId);
  const orgRepo = new OrganizationRepository(prisma, doc.organizationId);
  const flagService = new FeatureFlagService(prisma);
  const configService = new ConfigService(prisma);

  const aiService = new AiCollectorService(aiRepo, docRepo, orgRepo, flagService, configService);
  const ext = await aiService.processDocumentExtraction(doc.id, doc.organizationId);

  console.log('--- RE-EXTRACTION SUCCESS ---');
  console.log('Extracted Fields:', ext?.fields);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
