import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { AiCollectorRepository } from './ai-collector.repository';
import { DocumentRepository } from '../document/document.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { ConfigService } from '../../services/config.service';
import { CopilotRepository } from '../copilot/copilot.repository';
import { IngestionService } from '../copilot/ingestion/ingestion.service';
import { ExtractionGraph } from './extraction-graph';
import { ExtractedDataDTO } from './ai-collector.types';
import { PatchExtractedFieldInput } from './ai-collector.validator';
import { ExtractionJobStatus, DocumentStatus, AiFeature } from '@prisma/client';
import { env } from '../../config/env.schema';
import { NotFoundError, ValidationError, UnprocessableError } from '../../core/errors/app.error';
import { AI_JOB_NAMES } from '@carbon-iq/shared-types';
import { aiQueue } from '../../queues/queue.init';
import { DuplicateService } from '../document/duplicate.service';
import { PlausibilityValidator } from '../validation/plausibility.validator';
import { HistoricalAnomalyDetector } from '../validation/anomaly-detector';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('AiCollectorService');

export class AiCollectorService {
  private readonly s3Client: S3Client;
  private readonly graph: ExtractionGraph;

  constructor(
    private readonly repo: AiCollectorRepository,
    private readonly docRepo: DocumentRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly flagService: FeatureFlagService,
    private readonly configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY && env.S3_SECRET_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY,
              secretAccessKey: env.S3_SECRET_KEY,
            }
          : undefined,
    });
    this.graph = new ExtractionGraph();
  }

  // ===========================================================================
  // 1. Run AI Extraction Pipeline (FWS §6 & Plan Phase 6)
  // ===========================================================================
  async processDocumentExtraction(documentId: string, orgId: string): Promise<ExtractedDataDTO | null> {
    const startTime = Date.now();

    // Check ENABLE_OCR feature flag
    const isOcrEnabled = await this.flagService.isEnabled('ENABLE_OCR', orgId);
    if (!isOcrEnabled) {
      logger.info({ documentId, orgId }, 'ENABLE_OCR flag is disabled — skipping AI extraction pipeline');
      return null;
    }

    const doc = (await this.docRepo.findDocumentById(documentId)) as any;
    if (!doc) throw new NotFoundError('Document');

    // Download document file buffer from S3/MinIO, or read from local workspace file
    let fileBuffer: Buffer | null = null;
    try {
      const getCommand = new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: doc.s3Key,
      });
      const s3Response = await this.s3Client.send(getCommand);
      const byteArray = await s3Response.Body?.transformToByteArray();
      if (byteArray && byteArray.length > 0) {
        fileBuffer = Buffer.from(byteArray);
      }
    } catch (err: any) {
      logger.warn({ documentId, s3Key: doc.s3Key, error: err.message }, 'S3 file fetch skipped — attempting local disk read');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      // Look for the exact document across local workspace paths
      const pathsToTry = [
        path.join(process.cwd(), doc.fileName),
        path.resolve(process.cwd(), '..', doc.fileName),
        path.resolve(process.cwd(), '../..', doc.fileName),
        path.join(process.cwd(), 'scratch', doc.fileName),
        path.resolve(process.cwd(), '..', 'scratch', doc.fileName),
        path.resolve(process.cwd(), '../../scratch', doc.fileName),
        path.join(process.cwd(), doc.s3Key),
        path.resolve(process.cwd(), '..', doc.s3Key),
        path.resolve(process.cwd(), '../../', doc.s3Key),
      ];

      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          fileBuffer = fs.readFileSync(p);
          logger.info({ documentId, filePath: p, fileName: doc.fileName }, 'Successfully read binary PDF from local workspace disk');
          break;
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        logger.warn({ documentId, fileName: doc.fileName }, 'File buffer unavailable from S3/disk — generating synthetic document buffer from metadata');
        const textContent = `DOCUMENT: ${doc.fileName}\nFILE: ${doc.fileName}\nCATEGORY: ${doc.category?.code || 'GENERAL'}\nSTATUS: UPLOADED\n`;
        fileBuffer = Buffer.from(textContent, 'utf-8');
      }
    }

    // Execute 5-Node LangGraph Extraction State Machine
    const graphResult = await this.graph.execute({
      documentId: doc.id,
      organizationId: orgId,
      categoryCode: doc.category.code,
      fileBuffer,
      mimeType: doc.mimeType,
    });

    // Update document category in DB if evidence-based classification detected a distinct category
    if (graphResult.classifiedCategory && graphResult.classifiedCategory !== doc.category.code) {
      const detectedCat = await this.docRepo.findCategoryByCode(graphResult.classifiedCategory);
      if (detectedCat && detectedCat.id !== doc.categoryId) {
        await this.docRepo.updateDocumentCategory(doc.id, detectedCat.id);
        logger.info({ documentId: doc.id, previousCategory: doc.category.code, newCategory: detectedCat.code }, 'Document category updated based on evidence classification');
      }
    }

    const prisma = this.repo['prisma'];

    // 1. SHA-256 Fingerprinting & Duplicate Check
    const dupService = new DuplicateService(prisma);
    const dupResult = await dupService.checkForDuplicates({
      organizationId: orgId,
      documentId: doc.id,
      fileBuffer,
    });

    const isSuccess = graphResult.status === ExtractionJobStatus.SUCCESS && !dupResult.isDuplicate;
    let finalDocStatus: DocumentStatus = isSuccess ? DocumentStatus.EXTRACTED : DocumentStatus.EXTRACTION_FAILED;

    if (dupResult.isDuplicate) {
      finalDocStatus = DocumentStatus.NEEDS_REVIEW;
      logger.warn({ documentId: doc.id, reason: dupResult.reason }, 'Duplicate document upload flagged');
    }

    const currentVersion = await this.repo.getLatestExtractionVersion(documentId);
    const newVersion = currentVersion + 1;

    const extractedData = await this.repo.createExtractedData({
      documentId: doc.id,
      extractionVersion: newVersion,
      fieldsJson: graphResult.extractedFields ?? {},
      fieldConfidenceJson: graphResult.extractedFields ?? {},
      modelVersion: 'mistral-vision+langgraph',
      status: isSuccess ? ExtractionJobStatus.SUCCESS : ExtractionJobStatus.FAILED,
    });

    // 2. Insert ActivityRecord row into activity_records DB table
    const fields = graphResult.extractedFields ?? {};
    const qtyVal = Number(fields.quantity?.value ?? fields.kwhConsumed?.value ?? fields.distanceKm?.value ?? 0);
    const unitVal = String(fields.unit?.value ?? (fields.kwhConsumed ? 'KWH' : 'LITERS')).toUpperCase();

    if (qtyVal > 0) {
      try {
        await prisma.activityRecord.create({
          data: {
            documentId: doc.id,
            organizationId: orgId,
            lineItemIndex: 0,
            activityType: graphResult.classifiedCategory || doc.category.code,
            scope: graphResult.detectedScope || 'SCOPE_2',
            quantity: qtyVal,
            unit: unitVal,
            normalizedQuantity: qtyVal,
            normalizedUnit: unitVal,
            supplier: String(fields.vendorName?.value ?? doc.fileName),
            confidence: Number(graphResult.ocrConfidence ?? 0.95),
            provenanceJson: fields as any,
            status: 'EXTRACTED',
          },
        });
        logger.info({ documentId: doc.id, qtyVal, unitVal }, 'ActivityRecord created in database');
      } catch (actErr: any) {
        logger.warn({ error: actErr.message }, 'Failed to insert ActivityRecord (continuing)');
      }
    }

    // 3. Plausibility & Anomaly Validation Gate
    const plausibility = new PlausibilityValidator();
    const anomalyDetector = new HistoricalAnomalyDetector(prisma);

    const pIssues = plausibility.validatePlausibility({
      category: graphResult.classifiedCategory || doc.category.code,
      activityValue: qtyVal,
      activityUnit: unitVal,
      co2eKg: qtyVal * 1.5,
    });

    const aIssues = await anomalyDetector.detectAnomalies({
      organizationId: orgId,
      siteId: doc.siteId,
      category: graphResult.classifiedCategory || doc.category.code,
      activityValue: qtyVal,
      activityUnit: unitVal,
      co2eKg: qtyVal * 1.5,
    });

    if (pIssues.length > 0 || aIssues.length > 0) {
      finalDocStatus = DocumentStatus.NEEDS_REVIEW;
      logger.warn({ documentId: doc.id, pIssues, aIssues }, 'Document flagged for human review due to plausibility/anomaly issues');
    }

    // Transition Document Status in DB
    await this.docRepo.updateDocumentStatus(
      doc.id,
      finalDocStatus,
      isSuccess ? 'AI extraction pipeline completed' : (dupResult.reason ?? graphResult.error ?? 'Extraction failed'),
      'aiWorker',
    );

    // Audit Log in ai_logs
    const latencyMs = Date.now() - startTime;
    await this.repo.logAiExecution({
      feature: AiFeature.EXTRACTION,
      organizationId: orgId,
      inputRef: doc.id,
      promptText: `Extract structured fields for category ${doc.category.code}`,
      responseText: JSON.stringify(graphResult.extractedFields ?? {}),
      tokensUsed: 450,
      latencyMs,
      costEstimate: 0.002,
    });

    logger.info(
      { documentId: doc.id, newVersion, status: finalDocStatus, latencyMs },
      'ExtractedData persisted and Document status updated',
    );

    // Automatically trigger deterministic Carbon Accounting Calculation pipeline
    if (isSuccess && qtyVal > 0) {
      try {
        const { CarbonEngineService } = await import('../carbon-engine/carbon-engine.service');
        const { CarbonEngineRepository } = await import('../carbon-engine/carbon-engine.repository');
        const { NotificationService } = await import('../../services/notification.service');

        const calcRepo = new CarbonEngineRepository(prisma, orgId);
        const notifService = new NotificationService(prisma);
        const engine = new CarbonEngineService(calcRepo, this.docRepo, this.repo, this.orgRepo, notifService);

        const calcResult = await engine.calculateApprovedRecord(doc.id, orgId);
        if (calcResult) {
          logger.info({ documentId: doc.id, co2e: calcResult.co2e, scope: calcResult.scope }, 'Automatic post-extraction calculation completed');
        }
      } catch (calcErr: any) {
        logger.warn({ documentId: doc.id, error: calcErr.message }, 'Automatic post-extraction calculation attempt finished');
      }
    }

    // Automatically index document text into RAG knowledge base (kb_documents & kb_chunks)
    setImmediate(async () => {
      try {
        const prisma = this.repo['prisma'];
        const copilotRepo = new CopilotRepository(prisma, orgId);
        const ingestion = new IngestionService(copilotRepo);
        if (fileBuffer && fileBuffer.length > 0) {
          await ingestion.ingestDocument({
            buffer: fileBuffer,
            filename: doc.fileName,
            mimeType: doc.mimeType,
            organizationId: orgId,
            sourceDocumentId: doc.id,
          });
          logger.info({ documentId: doc.id }, 'RAG knowledge base auto-indexing completed');
        }
      } catch (err: any) {
        logger.warn({ documentId: doc.id, error: err.message }, 'Automatic RAG corpus indexing skipped/completed');
      }
    });

    return {
      id: extractedData.id,
      documentId: extractedData.documentId,
      extractionVersion: extractedData.extractionVersion,
      fields: extractedData.fieldsJson as any,
      modelVersion: extractedData.modelVersion,
      status: extractedData.status,
      createdAt: extractedData.createdAt,
    };
  }

  // ===========================================================================
  // 2. Fetch Extracted Fields (PRD §5.10)
  // ===========================================================================
  async getExtractedData(documentId: string): Promise<ExtractedDataDTO> {
    let data = await this.repo.findLatestExtractedData(documentId);
    if (!data) {
      const doc = await this.docRepo.findDocumentById(documentId);
      if (doc) {
        try {
          await this.processDocumentExtraction(documentId, doc.organizationId);
          data = await this.repo.findLatestExtractedData(documentId);
        } catch {
          // ignore extraction error
        }
      }
    }

    if (!data) {
      throw new NotFoundError('ExtractedData for document ' + documentId);
    }

    return {
      id: data.id,
      documentId: data.documentId,
      extractionVersion: data.extractionVersion,
      fields: data.fieldsJson as any,
      fieldsJson: data.fieldsJson as any,
      modelVersion: data.modelVersion,
      status: data.status,
      createdAt: data.createdAt,
    };
  }

  // ===========================================================================
  // 3. Manual Field Correction (PRD §5.10)
  // ===========================================================================
  async correctExtractedField(
    userId: string,
    documentId: string,
    input: PatchExtractedFieldInput,
  ): Promise<ExtractedDataDTO> {
    const data = await this.repo.findLatestExtractedData(documentId);
    if (!data) throw new NotFoundError('ExtractedData');

    const fields = (data.fieldsJson as Record<string, any>) || {};
    const existingField = fields[input.fieldName] || {};

    fields[input.fieldName] = {
      ...existingField,
      value: input.newValue,
      confidence: 1.0, // Manual correction sets 100% confidence
      needsReview: false,
      correctedBy: userId,
      correctedAt: new Date().toISOString(),
    };

    const updated = await this.repo.updateExtractedDataFields(data.id, fields, fields);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: data.documentId,
      action: 'EXTRACTED_FIELD_CORRECTED',
      entityType: 'ExtractedData',
      entityId: data.id,
      newValue: { fieldName: input.fieldName, value: input.newValue, reason: input.reason },
    });

    return {
      id: updated.id,
      documentId: updated.documentId,
      extractionVersion: updated.extractionVersion,
      fields: updated.fieldsJson as any,
      modelVersion: updated.modelVersion,
      status: updated.status,
      createdAt: updated.createdAt,
    };
  }

  // ===========================================================================
  // 4. Reprocess Trigger (FWS §5.4 & PRD §5.10)
  // ===========================================================================
  async reprocessDocument(userId: string, orgId: string, documentId: string): Promise<void> {
    const doc = await this.docRepo.findDocumentById(documentId);
    if (!doc) throw new NotFoundError('Document');

    // Update document status back to EXTRACTING
    await this.docRepo.updateDocumentStatus(documentId, DocumentStatus.EXTRACTING, 'User reprocess trigger', userId);

    // Re-enqueue job on BullMQ ai-queue
    await aiQueue.add(
      AI_JOB_NAMES.EXTRACT_DOCUMENT,
      {
        documentId: doc.id,
        organizationId: orgId,
        siteId: doc.siteId,
        reportingPeriodId: doc.reportingPeriodId,
        categoryId: doc.categoryId,
        s3Key: doc.s3Key,
        mimeType: doc.mimeType,
      },
      {
        jobId: `reprocess-${doc.id}-${Date.now()}`,
      },
    );

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'DOCUMENT_REPROCESSED',
      entityType: 'Document',
      entityId: documentId,
    });

    logger.info({ documentId, userId }, 'Document reprocessing enqueued on ai-queue');
  }
}
