import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DocumentRepository } from './document.repository';
import {
  SingleUploadUrlInput,
  RegisterDocumentInput,
  SubmitManualDataInput,
  ListDocumentsQuery,
} from './document.validator';
import {
  PresignedUploadUrlResponse,
  DocumentDTO,
  DocumentCategoryDTO,
  PeriodProgressSummary,
} from './document.types';
import { DocumentStatus, ReportingPeriodStatus, DocumentSource } from '@prisma/client';
import { env } from '../../config/env.schema';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/errors/app.error';
import { ERROR_CODES, AI_JOB_NAMES } from '@carbon-os/shared-types';
import { aiQueue } from '../../queues/queue.init';
import { OrganizationRepository } from '../organization/organization.repository';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('DocumentService');

export class DocumentService {
  private readonly s3Client: S3Client;

  constructor(
    private readonly repo: DocumentRepository,
    private readonly orgRepo: OrganizationRepository,
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
  }

  // ===========================================================================
  // 1. S3 Pre-signed Upload URL Generation (TRD §8.1 & PRD §4.10)
  // ===========================================================================
  async generateUploadUrl(
    orgId: string,
    input: SingleUploadUrlInput,
  ): Promise<PresignedUploadUrlResponse> {
    const timestamp = Date.now();
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${orgId}/${timestamp}_${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      ContentType: input.mimeType,
      ContentLength: input.fileSize,
    });

    const expiresInSeconds = 300; // 5 minutes lifetime per TRD §8.1
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });

    logger.info({ orgId, s3Key, mimeType: input.mimeType }, 'Pre-signed upload URL generated');

    return {
      uploadUrl,
      s3Key,
      expiresInSeconds,
    };
  }

  async generateBatchUploadUrls(
    orgId: string,
    files: SingleUploadUrlInput[],
  ): Promise<PresignedUploadUrlResponse[]> {
    return Promise.all(files.map((file) => this.generateUploadUrl(orgId, file)));
  }

  // ===========================================================================
  // 2. Metadata Registration & Queue Enqueueing (FWS §5.1 & PRD §4.10)
  // ===========================================================================
  async registerDocument(
    userId: string,
    orgId: string,
    input: RegisterDocumentInput,
  ): Promise<DocumentDTO> {
    // Validate period is open
    const period = await this.repo.findReportingPeriodById(input.reportingPeriodId);
    if (!period) throw new NotFoundError('ReportingPeriod');

    if (period.status !== ReportingPeriodStatus.OPEN) {
      throw new ConflictError(
        'Cannot upload documents to a locked or finalized reporting period.',
        ERROR_CODES.PERIOD_LOCKED,
      );
    }

    // Validate category exists
    const category = await this.repo.findCategoryById(input.categoryId);
    if (!category) throw new NotFoundError('DocumentCategory');

    const doc = await this.repo.createUploadedDocument({
      siteId: input.siteId,
      reportingPeriodId: input.reportingPeriodId,
      categoryId: input.categoryId,
      uploadedById: userId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      s3Key: input.s3Key,
    });

    // Enqueue extraction job on BullMQ ai-queue
    try {
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
          jobId: `extract-${doc.id}`,
        },
      );

      logger.info({ documentId: doc.id, queue: 'ai-queue' }, 'Extraction job enqueued');
    } catch (err: any) {
      logger.error({ documentId: doc.id, error: err.message }, 'Failed to enqueue extraction job');
      // Non-fatal — status remains UPLOADED, user can retry
    }

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc.id,
      newValue: { fileName: doc.fileName, s3Key: doc.s3Key, category: category.code },
    });

    return this.enrichDocumentWithDownloadUrl(doc);
  }

  // ===========================================================================
  // 3. Manual Data Entry (FWS §5.1)
  // ===========================================================================
  async submitManualData(
    userId: string,
    orgId: string,
    input: SubmitManualDataInput,
  ): Promise<DocumentDTO> {
    const period = await this.repo.findReportingPeriodById(input.reportingPeriodId);
    if (!period) throw new NotFoundError('ReportingPeriod');

    if (period.status !== ReportingPeriodStatus.OPEN) {
      throw new ConflictError(
        'Cannot submit manual data to a locked or finalized reporting period.',
        ERROR_CODES.PERIOD_LOCKED,
      );
    }

    const doc = await this.repo.createManualDocument({
      siteId: input.siteId,
      reportingPeriodId: input.reportingPeriodId,
      categoryId: input.categoryId,
      uploadedById: userId,
      manualData: input.manualData,
    });

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'MANUAL_ACTIVITY_DATA_SUBMITTED',
      entityType: 'Document',
      entityId: doc.id,
      newValue: input.manualData,
    });

    logger.info({ documentId: doc.id, source: 'MANUAL' }, 'Manual activity data entry submitted');

    return doc as DocumentDTO;
  }

  // ===========================================================================
  // 4. Document Queries & Details (PRD §4.12)
  // ===========================================================================
  async getDocumentById(documentId: string): Promise<DocumentDTO> {
    const doc = await this.repo.findDocumentById(documentId);
    if (!doc) throw new NotFoundError('Document');

    return this.enrichDocumentWithDownloadUrl(doc);
  }

  async listDocuments(query: ListDocumentsQuery) {
    const { items, total } = await this.repo.listDocuments(
      {
        siteId: query.siteId,
        reportingPeriodId: query.reportingPeriodId,
        categoryId: query.categoryId,
        status: query.status,
      },
      query.page,
      query.limit,
    );

    const enrichedItems = await Promise.all(
      items.map((doc) => this.enrichDocumentWithDownloadUrl(doc)),
    );

    return { items: enrichedItems, total, page: query.page, limit: query.limit };
  }

  // ===========================================================================
  // 5. Category Taxonomy & Period Progress (FWS §5.1 & PRD §4.5)
  // ===========================================================================
  async listCategories(): Promise<DocumentCategoryDTO[]> {
    const categories = await this.repo.listCategories();
    return categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      scope: c.scope,
      description: c.description,
      requiredByDefault: c.requiredByDefault,
      acceptedMimeTypes: c.acceptedMimeTypes,
    }));
  }

  async getPeriodProgress(
    siteId: string,
    reportingPeriodId: string,
  ): Promise<PeriodProgressSummary> {
    const categories = await this.repo.listCategories();
    const requiredCategories = categories.filter((c) => c.requiredByDefault);
    const approvedCategoryIds = await this.repo.getApprovedCategoriesCount(siteId, reportingPeriodId);

    const approvedCategoryIdsSet = new Set(approvedCategoryIds);
    const requiredCompleted = requiredCategories.filter((c) => approvedCategoryIdsSet.has(c.id)).length;
    const missingCategoryCodes = requiredCategories
      .filter((c) => !approvedCategoryIdsSet.has(c.id))
      .map((c) => c.code);

    const totalReq = requiredCategories.length;
    const percentComplete = totalReq > 0 ? Math.round((requiredCompleted / totalReq) * 100) : 100;

    return {
      siteId,
      reportingPeriodId,
      totalCategories: categories.length,
      completedCategories: approvedCategoryIds.length,
      requiredCategories: totalReq,
      requiredCompleted,
      percentComplete,
      isReadyForCalculation: missingCategoryCodes.length === 0,
      missingCategoryCodes,
    };
  }

  // ===========================================================================
  // 6. Period Lock / Unlock (FWS §5.4 & PRD §4.8)
  // ===========================================================================
  async lockReportingPeriod(userId: string, orgId: string, periodId: string, reason?: string) {
    const period = await this.repo.findReportingPeriodById(periodId);
    if (!period) throw new NotFoundError('ReportingPeriod');

    const updated = await this.repo.updateReportingPeriodStatus(periodId, ReportingPeriodStatus.LOCKED);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'REPORTING_PERIOD_LOCKED',
      entityType: 'ReportingPeriod',
      entityId: periodId,
      reason,
    });

    logger.info({ periodId, orgId, userId }, 'Reporting period locked');

    return updated;
  }

  async unlockReportingPeriod(userId: string, orgId: string, periodId: string, reason?: string) {
    const period = await this.repo.findReportingPeriodById(periodId);
    if (!period) throw new NotFoundError('ReportingPeriod');

    const updated = await this.repo.updateReportingPeriodStatus(periodId, ReportingPeriodStatus.OPEN);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'REPORTING_PERIOD_UNLOCKED',
      entityType: 'ReportingPeriod',
      entityId: periodId,
      reason: reason ?? 'Unlocked by Org Admin',
    });

    logger.info({ periodId, orgId, userId }, 'Reporting period unlocked');

    return updated;
  }

  async listActiveReportingPeriods() {
    return this.repo.listActiveReportingPeriods();
  }

  async listReportingPeriods() {
    return this.repo.listReportingPeriods();
  }

  async createReportingPeriod(userId: string, orgId: string, input: { name: string; startDate: string; endDate: string }) {
    const period = await this.repo.createReportingPeriod({
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'REPORTING_PERIOD_CREATED',
      entityType: 'ReportingPeriod',
      entityId: period.id,
      newValue: { name: period.name, startDate: period.startDate, endDate: period.endDate },
    });

    logger.info({ periodId: period.id, orgId }, 'Reporting period created');

    return period;
  }

  // ===========================================================================
  // Helper
  // ===========================================================================
  private async enrichDocumentWithDownloadUrl(doc: any): Promise<DocumentDTO> {
    let downloadUrl: string | undefined = undefined;

    if (doc.source === DocumentSource.UPLOAD && doc.s3Key) {
      try {
        const command = new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: doc.s3Key,
        });
        downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
      } catch (err: any) {
        logger.warn({ s3Key: doc.s3Key, error: err.message }, 'Failed to generate download URL');
      }
    }

    return {
      ...doc,
      downloadUrl,
    };
  }
}
