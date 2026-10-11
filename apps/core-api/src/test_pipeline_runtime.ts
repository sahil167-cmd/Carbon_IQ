import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import { AiCollectorService } from './modules/ai-collector/ai-collector.service';
import { AiCollectorRepository } from './modules/ai-collector/ai-collector.repository';
import { DocumentRepository } from './modules/document/document.repository';
import { OrganizationRepository } from './modules/organization/organization.repository';
import { FeatureFlagService } from './services/feature-flag.service';
import { ConfigService } from './services/config.service';

async function testRuntimePipeline() {
  const prisma = new PrismaClient();
  const doc = await prisma.document.findFirst();

  if (!doc) {
    console.log('No document found in database');
    await prisma.$disconnect();
    return;
  }

  console.log(`Processing document ID: ${doc.id} (${doc.fileName})`);

  const aiRepo = new AiCollectorRepository(prisma, doc.organizationId);
  const docRepo = new DocumentRepository(prisma, doc.organizationId);
  const orgRepo = new OrganizationRepository(prisma);
  const flagService = new FeatureFlagService(prisma);
  const configService = new ConfigService(prisma);

  const aiCollector = new AiCollectorService(aiRepo, docRepo, orgRepo, flagService, configService);

  try {
    const result = await aiCollector.processDocumentExtraction(doc.id, doc.organizationId);
    console.log('Extraction Result Success:', result?.status);

    const actCount = await prisma.activityRecord.count();
    const fpCount = await prisma.documentFingerprint.count();
    console.log(`\n=== DATABASE RUNTIME RECORD METRICS ===`);
    console.log(`ActivityRecords in DB      : ${actCount}`);
    console.log(`DocumentFingerprints in DB : ${fpCount}`);
    console.log(`=======================================\n`);
  } catch (err: any) {
    console.error('Error during extraction test:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRuntimePipeline();
