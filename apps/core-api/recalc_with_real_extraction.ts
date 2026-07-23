import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { AiCollectorRepository } from './src/modules/ai-collector/ai-collector.repository';
import { AiCollectorService } from './src/modules/ai-collector/ai-collector.service';
import { DocumentRepository } from './src/modules/document/document.repository';
import { OrganizationRepository } from './src/modules/organization/organization.repository';
import { FeatureFlagService } from './src/services/feature-flag.service';
import { ConfigService } from './src/services/config.service';
import { CarbonEngineRepository } from './src/modules/carbon-engine/carbon-engine.repository';
import { CarbonEngineService } from './src/modules/carbon-engine/carbon-engine.service';

const prisma = new PrismaClient();

async function run() {
  const docs = await prisma.document.findMany({
    include: { category: true, site: true },
  });

  console.log(`=== RUNNING REAL OCR EXTRACTION & CALCULATION FOR ${docs.length} DOCS ===`);

  for (const doc of docs) {
    try {
      const aiRepo = new AiCollectorRepository(prisma, doc.organizationId);
      const docRepo = new DocumentRepository(prisma, doc.organizationId);
      const orgRepo = new OrganizationRepository(prisma, doc.organizationId);
      const flagService = new FeatureFlagService(prisma);
      const configService = new ConfigService(prisma);

      const aiService = new AiCollectorService(aiRepo, docRepo, orgRepo, flagService, configService);
      await aiService.processDocumentExtraction(doc.id, doc.organizationId);

      const repo = new CarbonEngineRepository(prisma, doc.organizationId);
      const calcService = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, null as any);

      const result = await calcService.calculateApprovedRecord(doc.id, doc.organizationId);

      console.log(`\n📄 Doc: ${doc.fileName}`);
      console.log(`   Category: ${doc.category.code} | Scope: ${result?.scope}`);
      console.log(`   CO2e Footprint: ${result?.co2e} ${result?.activityUnit || 'kgCO2e'}`);
      console.log(`   Formula Applied: ${(result as any)?.formulaUsed}`);
    } catch (err: any) {
      console.error(`❌ Doc: ${doc.fileName} -> Error: ${err.message}`);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
