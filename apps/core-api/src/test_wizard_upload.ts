import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CarbonEngineService } from './modules/carbon-engine/carbon-engine.service';
import { CarbonEngineRepository } from './modules/carbon-engine/carbon-engine.repository';
import { DocumentRepository } from './modules/document/document.repository';
import { AiCollectorRepository } from './modules/ai-collector/ai-collector.repository';
import { OrganizationRepository } from './modules/organization/organization.repository';

const prisma = new PrismaClient();

async function main() {
  const org = (await prisma.organization.findFirst())!;
  const site = (await prisma.site.findFirst({ where: { organizationId: org.id } }))!;
  const period = (await prisma.reportingPeriod.findFirst({ where: { organizationId: org.id } }))!;
  const catFreight = (await prisma.documentCategory.findFirst({ where: { code: 'UPSTREAM_TRANSPORT' } }))!;
  const catElec = (await prisma.documentCategory.findFirst({ where: { code: 'ELECTRICITY' } }))!;
  const user = (await prisma.user.findFirst())!;

  // Test 1: Scope 3 Freight BOL
  const docFreight = await prisma.document.create({
    data: {
      organizationId: org.id,
      siteId: site.id,
      reportingPeriodId: period.id,
      categoryId: catFreight.id,
      uploadedById: user.id,
      fileName: 'complex_scope3_freight_bol.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      s3Key: 'uploads/demo.pdf',
      status: 'UPLOADED',
    },
  });

  // Test 2: Scope 2 Electricity Bill
  const docElec = await prisma.document.create({
    data: {
      organizationId: org.id,
      siteId: site.id,
      reportingPeriodId: period.id,
      categoryId: catElec.id,
      uploadedById: user.id,
      fileName: 'complex_scope2_utility_bill.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      s3Key: 'uploads/demo2.pdf',
      status: 'UPLOADED',
    },
  });

  const repo = new CarbonEngineRepository(prisma, org.id);
  const docRepo = new DocumentRepository(prisma, org.id);
  const aiRepo = new AiCollectorRepository(prisma, org.id);
  const orgRepo = new OrganizationRepository(prisma, org.id);
  const engine = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, null as any);

  const res1 = await engine.calculateApprovedRecord(docFreight.id, org.id);
  const res2 = await engine.calculateApprovedRecord(docElec.id, org.id);

  console.log('\n=== WIZARD TEST 1 (Scope 3 Freight BOL) ===');
  console.log(`Document ID: ${docFreight.id}`);
  console.log(`CO2e Emissions: ${res1?.co2e} kg CO2e`);
  console.log(`Activity Value: ${res1?.activityValue} ${res1?.activityUnit}`);

  console.log('\n=== WIZARD TEST 2 (Scope 2 Utility Bill) ===');
  console.log(`Document ID: ${docElec.id}`);
  console.log(`CO2e Emissions: ${res2?.co2e} kg CO2e`);
  console.log(`Activity Value: ${res2?.activityValue} ${res2?.activityUnit}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
