import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import fs from 'fs';
import { getPrismaClient } from '../core/repository/tenant-scoped.repository';
import { AiCollectorService } from '../modules/ai-collector/ai-collector.service';
import { AiCollectorRepository } from '../modules/ai-collector/ai-collector.repository';
import { DocumentRepository } from '../modules/document/document.repository';
import { OrganizationRepository } from '../modules/organization/organization.repository';
import { FeatureFlagService } from '../services/feature-flag.service';
import { ConfigService } from '../services/config.service';
import { ValidationService } from '../modules/validation/validation.service';
import { ValidationRepository } from '../modules/validation/validation.repository';
import { CarbonEngineService } from '../modules/carbon-engine/carbon-engine.service';
import { CarbonEngineRepository } from '../modules/carbon-engine/carbon-engine.repository';
import { NotificationService } from '../services/notification.service';
import { DocumentSource, DocumentStatus } from '@prisma/client';

async function main() {
  const prisma = getPrismaClient();

  const org = await prisma.organization.findFirst();
  const site = await prisma.site.findFirst({ where: { organizationId: org!.id } });
  const period = await prisma.reportingPeriod.findFirst({ where: { organizationId: org!.id } });
  const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });
  const cat = await prisma.documentCategory.findFirst({ where: { code: 'STATIONARY_COMBUSTION' } });

  const orgId = org!.id;
  const userId = user!.id;

  const repo = new AiCollectorRepository(prisma, orgId);
  const docRepo = new DocumentRepository(prisma, orgId);
  const orgRepo = new OrganizationRepository(prisma, orgId);
  const flagService = new FeatureFlagService(prisma);
  const configService = new ConfigService(prisma);

  const aiService = new AiCollectorService(repo, docRepo, orgRepo, flagService, configService);
  const valRepo = new ValidationRepository(prisma, orgId);
  const valService = new ValidationService(valRepo, docRepo, repo, orgRepo, flagService);

  const engineRepo = new CarbonEngineRepository(prisma);
  const notifService = new NotificationService(prisma);
  const engineService = new CarbonEngineService(engineRepo, docRepo, repo, orgRepo, notifService);

  const filePath = path.resolve(__dirname, '../../../../scope1_natural_gas_utility.pdf');
  const fileBuffer = fs.readFileSync(filePath);

  console.log('1. Creating Document for scope1_natural_gas_utility.pdf');
  const doc = await prisma.document.create({
    data: {
      organizationId: orgId,
      siteId: site!.id,
      reportingPeriodId: period!.id,
      categoryId: cat!.id,
      uploadedById: userId,
      fileName: 'scope1_natural_gas_utility.pdf',
      fileSize: fileBuffer.length,
      mimeType: 'application/pdf',
      s3Key: `test/ng_${Date.now()}.pdf`,
      source: DocumentSource.UPLOAD,
      status: DocumentStatus.UPLOADED,
    },
  });

  console.log(`Document created with ID: ${doc.id}`);

  console.log('2. Running AI Extraction...');
  const extractionResult: any = await aiService.processDocumentExtraction(doc.id, orgId);
  console.log('Extraction status:', extractionResult.status);
  console.log('Extracted fields:', extractionResult.extractedFields);

  console.log('3. Running Validation...');
  const issues = await valService.runLayer1And2Validation(doc.id, orgId);
  console.log('Validation issues count:', issues.length);
  console.log('Validation issues:', issues);

  console.log('4. Approving Document...');
  await valService.approveDocument(userId, doc.id, 'Test approving natural gas');

  console.log('5. Running Carbon Calculation...');
  const calc = await engineService.calculateApprovedRecord(doc.id, orgId);
  console.log('Calculation result:', calc);

  const updatedDoc = await prisma.document.findUnique({
    where: { id: doc.id },
    include: { calculatedEmissions: true, statusHistory: true },
  });
  console.log('Updated document status:', updatedDoc?.status);
  console.log('Status history:', updatedDoc?.statusHistory.map(h => ({ to: h.toStatus, reason: h.reason })));
}

main().catch(console.error).finally(() => process.exit(0));
