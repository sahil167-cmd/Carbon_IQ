import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import http from 'http';
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

const BASE = 'http://localhost:3000';
const ROOT = path.resolve(__dirname, '../../../../');

function httpRequest(method: string, urlPath: string, body: any = null, token: string | null = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
    };

    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('='.repeat(80));
  console.log('  CARBONIQ UNIVERSAL ACCOUNTING PIPELINE INTEGRATION TEST');
  console.log('='.repeat(80));

  const loginRes = await httpRequest('POST', '/api/v1/auth/login', {
    email: 'carboniq_test_exec@carboniq.dev',
    password: 'CarbonIQ!Test2026',
  });
  const token = loginRes.body?.data?.accessToken;
  const user = loginRes.body?.data?.user;
  const orgId = user?.organizationId || 'cmtby0prr001hsjmrvdar849v';
  const userId = user?.id || 'cmtby0psi001jsjmru7rimczn';

  const catRes = await httpRequest('GET', '/api/v1/document-categories', null, token);
  const categories = catRes.body?.data || [];
  const catMap = new Map<string, string>();
  for (const c of categories) {
    catMap.set(c.code, c.id);
  }

  const siteRes = await httpRequest('GET', '/api/v1/sites', null, token);
  const siteId = siteRes.body?.data?.[0]?.id || 'cmtby_site_001';

  const periodRes = await httpRequest('GET', '/api/v1/reporting-periods/active', null, token);
  const periodId = periodRes.body?.data?.[0]?.id || 'cmtby_period_001';

  const prisma = getPrismaClient();
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

  const testDocuments = [
    {
      name: 'Scope 1 Natural Gas Utility Statement',
      fileName: 'scope1_natural_gas_utility.pdf',
      category: 'STATIONARY_COMBUSTION',
      expectCalculated: true,
      expectedCo2e: 37168, // 18,400 M3 * 2.02 = 37,168 kg CO2e
      expectedUnit: 'M3',
    },
    {
      name: 'Scope 1 Stationary Diesel Backup Generator',
      fileName: 'scope1_stationary_diesel_generator.pdf',
      category: 'STATIONARY_COMBUSTION',
      expectCalculated: true,
      expectedCo2e: 11390, // 4,250 LITERS * 2.68 = 11,390 kg CO2e
      expectedUnit: 'LITERS',
    },
    {
      name: 'Scope 1 Mobile Fleet Diesel Refueling',
      fileName: 'scope1_mobile_fleet_diesel.pdf',
      category: 'MOBILE_COMBUSTION',
      expectCalculated: true,
      expectedCo2e: 70011, // 6,850 Gallons -> 25,930.059 L * 2.70 = 70,011 kg CO2e
      expectedUnit: 'LITERS',
    },
    {
      name: 'Scope 3 Intermodal Freight Waybill (Preserves TONNE_KM)',
      fileName: 'sample_scope3_freight_bol.pdf',
      category: 'UPSTREAM_TRANSPORT',
      expectCalculated: true,
      expectedCo2e: 2650, // 164,650 tkm * 0.0161 = 2,650.86 kg CO2e
      expectedUnit: 'TONNE_KM',
    },
    {
      name: 'Scope 3 Purchased Goods Structural Steel',
      fileName: 'scope3_purchased_goods_steel.pdf',
      category: 'PURCHASED_GOODS',
      expectCalculated: true,
      expectedCo2e: 52155, // 28,500 KG * 1.83 = 52,155 kg CO2e
      expectedUnit: 'KG',
    },
  ];

  let passed = 0;
  let total = 0;

  for (const docInfo of testDocuments) {
    total++;
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[TEST ${total}: ${docInfo.name}] File: ${docInfo.fileName} (Category: ${docInfo.category})`);
    console.log(`--------------------------------------------------------------------------------`);

    let filePath = path.join(ROOT, docInfo.fileName);
    if (!fs.existsSync(filePath)) filePath = path.join(ROOT, 'scratch', docInfo.fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const categoryId = catMap.get(docInfo.category) || categories[0]?.id;

    // 1. Upload URL & Register Document
    const urlRes = await httpRequest('POST', '/api/v1/documents/upload-url', {
      files: [{ fileName: docInfo.fileName, fileSize: fileBuffer.length, mimeType: 'application/pdf' }]
    }, token);
    const s3Key = urlRes.body?.data?.[0]?.s3Key || `uploads/${orgId}/${Date.now()}_${docInfo.fileName}`;

    const regRes = await httpRequest('POST', '/api/v1/documents', {
      fileName: docInfo.fileName,
      fileSize: fileBuffer.length,
      mimeType: 'application/pdf',
      s3Key,
      siteId,
      reportingPeriodId: periodId,
      categoryId,
    }, token);
    const docId = regRes.body?.data?.id;

    // 2. AI Extraction
    const extraction: any = await aiService.processDocumentExtraction(docId, orgId);
    const extractedFields = extraction?.extractedFields || {};
    console.log(`  -> Extraction: Status = ${extraction?.status}, Unit = ${extractedFields.unit?.value}, Qty = ${extractedFields.quantity?.value}, Mat = ${extractedFields.materialType?.value}, Fuel = ${extractedFields.fuelType?.value}`);

    // 3. Validation
    const issues = await valService.runLayer1And2Validation(docId, orgId);
    console.log(`  -> Validation Issues Flagged: ${issues.length}`);

    // 4. Approval & Calculation
    await valService.approveDocument(userId, docId, 'Approved for universal pipeline regression test');
    const calcResult: any = await engineService.calculateApprovedRecord(docId, orgId);

    console.log(`  -> Calculation Result: CO2e = ${calcResult?.co2e ?? 0} kg, Method = ${calcResult?.calculationMethod ?? 'BLOCKED'}, Activity Unit = ${calcResult?.activityUnit ?? 'N/A'}`);

    if (docInfo.expectCalculated) {
      if (calcResult && Math.abs(calcResult.co2e - docInfo.expectedCo2e) < 10 && calcResult.activityUnit === docInfo.expectedUnit) {
        console.log(`  -> RESULT: ✓ PASS (Calculated ${calcResult.co2e} kg CO2e, Unit: ${calcResult.activityUnit})`);
        passed++;
      } else {
        console.error(`  -> RESULT: ✗ FAIL (Expected ${docInfo.expectedCo2e} kg, got ${calcResult?.co2e} kg; Expected Unit ${docInfo.expectedUnit}, got ${calcResult?.activityUnit})`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log(` RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (passed === total) {
    console.log('ALL UNIVERSAL PIPELINE INTEGRATION TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
})();
