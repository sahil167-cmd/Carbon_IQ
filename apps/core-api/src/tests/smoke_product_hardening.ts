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
import { DuplicateService } from '../modules/document/duplicate.service';

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
  console.log('  CARBONIQ PRODUCT HARDENING SMOKE TESTS');
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
  const dupService = new DuplicateService(prisma);

  const smokeScenarios = [
    {
      name: 'Scope 1 Stationary Diesel Fuel',
      fileName: 'scope1_stationary_diesel_generator.pdf',
      category: 'STATIONARY_COMBUSTION',
      expectCalculated: true,
      expectedCo2e: 11390,
      expectedUnit: 'LITERS',
    },
    {
      name: 'Scope 2 Commercial Electricity',
      fileName: 'scope2_india_manufacturing_grid.pdf',
      category: 'ELECTRICITY',
      expectCalculated: true,
      expectedCo2e: 48200,
      expectedUnit: 'KWH',
    },
    {
      name: 'Scope 3 Intermodal Freight Road BOL',
      fileName: 'complex_scope3_freight_bol.pdf',
      category: 'UPSTREAM_TRANSPORT',
      expectCalculated: true,
      expectedCo2e: 2763,
      expectedUnit: 'TONNE_KM',
    },
    {
      name: 'Scope 3 Purchased Goods Steel',
      fileName: 'scope3_purchased_goods_steel.pdf',
      category: 'PURCHASED_GOODS',
      expectCalculated: true,
      expectedCo2e: 52155,
      expectedUnit: 'KG',
    },
    {
      name: 'Adversarial: Freight BOL Misclassified as Business Travel (Dimensional Guard)',
      fileName: 'complex_scope3_freight_bol.pdf',
      category: 'BUSINESS_TRAVEL',
      expectCalculated: false,
      expectedCo2e: 0,
      expectedUnit: 'TONNE_KM',
    },
  ];

  for (const s of smokeScenarios) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[TEST: ${s.name}] File: ${s.fileName} (Category: ${s.category})`);
    console.log(`--------------------------------------------------------------------------------`);

    let filePath = path.join(ROOT, s.fileName);
    if (!fs.existsSync(filePath)) filePath = path.join(ROOT, 'scratch', s.fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const categoryId = catMap.get(s.category) || categories[0]?.id;

    // 1. Upload URL & Register
    const urlRes = await httpRequest('POST', '/api/v1/documents/upload-url', {
      files: [{ fileName: s.fileName, fileSize: fileBuffer.length, mimeType: 'application/pdf' }]
    }, token);
    const s3Key = urlRes.body?.data?.[0]?.s3Key || `uploads/${orgId}/${Date.now()}_${s.fileName}`;

    const regRes = await httpRequest('POST', '/api/v1/documents', {
      fileName: s.fileName,
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
    await valService.approveDocument(userId, docId, 'Approved for product hardening smoke test');
    const calcResult: any = await engineService.calculateApprovedRecord(docId, orgId);

    console.log(`  -> Calculation Result: CO2e = ${calcResult?.co2e ?? 0} kg, Method = ${calcResult?.calculationMethod ?? 'BLOCKED'}, Activity Unit = ${calcResult?.activityUnit ?? 'N/A'}`);

    if (s.expectCalculated) {
      if (calcResult && Math.abs(calcResult.co2e - s.expectedCo2e) < 1 && calcResult.activityUnit === s.expectedUnit) {
        console.log(`  -> RESULT: ✓ PASS (Exact ${calcResult.co2e} kg CO2e, Unit: ${calcResult.activityUnit})`);
      } else {
        console.log(`  -> RESULT: ✗ FAIL (Expected ${s.expectedCo2e} kg, got ${calcResult?.co2e} kg; Expected Unit ${s.expectedUnit}, got ${calcResult?.activityUnit})`);
      }
    } else {
      if (!calcResult || calcResult.co2e === 0) {
        console.log(`  -> RESULT: ✓ PASS (Dimensional guard safely blocked cross-dimensional mismatch)`);
      } else {
        console.log(`  -> RESULT: ✗ FAIL (Expected block, but calculated ${calcResult.co2e})`);
      }
    }
  }

  await prisma.$disconnect();
})();
