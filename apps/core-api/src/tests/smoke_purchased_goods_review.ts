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
  console.log('  FOCUSED SMOKE TEST: PURCHASED GOODS HUMAN REVIEW WORKFLOW');
  console.log('='.repeat(80));

  // 1. Authenticate
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

  // 2. Upload Document
  const docFileName = 'scope3_purchased_goods_steel.pdf';
  const fileBuffer = fs.readFileSync(path.join(ROOT, docFileName));

  const urlRes = await httpRequest('POST', '/api/v1/documents/upload-url', {
    files: [{ fileName: docFileName, fileSize: fileBuffer.length, mimeType: 'application/pdf' }]
  }, token);
  const s3Key = urlRes.body?.data?.[0]?.s3Key || `uploads/${orgId}/${Date.now()}_${docFileName}`;

  const regRes = await httpRequest('POST', '/api/v1/documents', {
    fileName: docFileName,
    fileSize: fileBuffer.length,
    mimeType: 'application/pdf',
    s3Key,
    siteId,
    reportingPeriodId: periodId,
    categoryId: catMap.get('PURCHASED_GOODS'),
  }, token);
  const docId = regRes.body?.data?.id;
  console.log(`[STEP 1] Document uploaded & registered -> ID: ${docId}`);

  // 3. AI Extraction (extracts quantity=28500, unit=KG, invoiceNumber without materialType)
  await aiService.processDocumentExtraction(docId, orgId);
  console.log(`[STEP 2] AI Extraction completed`);

  // 4. Initial Review state: Review Workspace loads document
  const preReviewDoc = await httpRequest('GET', `/api/v1/documents/${docId}`, null, token);
  console.log(`[STEP 3] Pre-review Document Status: ${preReviewDoc.body?.data?.status}`);

  // 5. Human Reviewer Action: Selects "STEEL" and submits approval with corrections
  console.log(`[STEP 4] Reviewer confirms Material Type = STEEL in Review Workspace`);
  const approveRes = await httpRequest('POST', `/api/v1/documents/${docId}/approve`, {
    reason: 'Human review confirmed materialType = STEEL from invoice PO-STEEL-2026-882',
    corrections: {
      materialType: 'STEEL',
    },
  }, token);
  console.log(`[STEP 5] Approve API Response:`, approveRes.body);

  // 6. Trigger Calculation via existing engine service
  const calcResult: any = await engineService.calculateApprovedRecord(docId, orgId);
  console.log(`[STEP 6] Engine Calculation Result:`, {
    co2e: calcResult?.co2e,
    factorValue: calcResult?.factorValue,
    factorUnit: calcResult?.factorUnit,
    status: calcResult?.validationStatus,
    method: calcResult?.calculationMethod,
  });

  // 7. Verify Document Details & Emissions API
  const finalDocRes = await httpRequest('GET', `/api/v1/documents/${docId}`, null, token);
  const finalEmRes = await httpRequest('GET', `/api/v1/emissions/${docId}`, null, token);
  const finalAuditRes = await httpRequest('GET', `/api/v1/carbon/audit/${docId}`, null, token);

  console.log(`\n[STEP 7] Final UI / API Verification:`);
  console.log(`  -> Document Status: ${finalDocRes.body?.data?.status}`);
  console.log(`  -> Calculated CO2e: ${finalEmRes.body?.data?.co2e} kg CO2e (${finalEmRes.body?.data?.co2e / 1000} t CO2e)`);
  console.log(`  -> Emission Factor: ${finalAuditRes.body?.data?.emissionFactor?.factorValue} ${finalAuditRes.body?.data?.emissionFactor?.unit}`);
  console.log(`  -> Factor Citation: ${finalAuditRes.body?.data?.emissionFactor?.citation}`);
  console.log(`  -> Calculation Formula: ${finalAuditRes.body?.data?.calculationLog?.formulaUsed}`);

  const isSuccess = Number(finalEmRes.body?.data?.co2e) === 52155 && finalDocRes.body?.data?.status === 'APPROVED';
  console.log(`\nSMOKE TEST RESULT: ${isSuccess ? 'PASS (100% Deterministic & Verified)' : 'FAIL'}`);

  await prisma.$disconnect();
})();
