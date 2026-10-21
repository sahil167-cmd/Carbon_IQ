import { ValidationRepository } from './validation.repository';
import { DocumentRepository } from '../document/document.repository';
import { AiCollectorRepository } from '../ai-collector/ai-collector.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { Layer1Validator } from './layer1.validator';
import { Layer2Validator } from './layer2.validator';
import { Layer3AiValidator } from './layer3.validator';
import {
  ValidationIssue,
  ValidationResultDTO,
  ReviewQueueItemDTO,
  BulkApproveResponse,
} from './validation.types';
import {
  ValidationLayer,
  ValidationStatus,
  DocumentStatus,
  ReviewActionType,
} from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors/app.error';
import { AI_JOB_NAMES, CALC_JOB_NAMES } from '@carbon-iq/shared-types';
import { aiQueue, calcQueue } from '../../queues/queue.init';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('ValidationService');

export class ValidationService {
  private readonly layer1: Layer1Validator;
  private readonly layer2: Layer2Validator;
  private readonly layer3: Layer3AiValidator;

  constructor(
    private readonly repo: ValidationRepository,
    private readonly docRepo: DocumentRepository,
    private readonly aiRepo: AiCollectorRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly flagService: FeatureFlagService,
  ) {
    this.layer1 = new Layer1Validator();
    this.layer2 = new Layer2Validator();
    this.layer3 = new Layer3AiValidator();
  }

  // ===========================================================================
  // 1. Run Synchronous Layer 1 & 2 Validation Pass (FWS §7.1)
  // ===========================================================================
  async runLayer1And2Validation(documentId: string, orgId: string): Promise<ValidationIssue[]> {
    const doc = await this.docRepo.findDocumentById(documentId);
    if (!doc) throw new NotFoundError('Document');

    const extracted = await this.aiRepo.findLatestExtractedData(documentId);
    const fields = (extracted?.fieldsJson as Record<string, any>) || doc.manualData || {};

    // Execute Layer 1 & Layer 2 checks
    const l1Issues = this.layer1.validate(doc.category.code, fields);
    const l2Issues = this.layer2.validate(doc.category.code, fields);

    // Save Layer 1 result
    await this.repo.createValidationResult({
      documentId: doc.id,
      layer: ValidationLayer.LAYER_1,
      status: l1Issues.length > 0 ? ValidationStatus.FLAGGED : ValidationStatus.PASS,
      issuesJson: l1Issues,
    });

    // Save Layer 2 result
    await this.repo.createValidationResult({
      documentId: doc.id,
      layer: ValidationLayer.LAYER_2,
      status: l2Issues.length > 0 ? ValidationStatus.FLAGGED : ValidationStatus.PASS,
      issuesJson: l2Issues,
    });

    const combinedIssues = [...l1Issues, ...l2Issues];

    // Enqueue Layer 3 AI validation if ENABLE_AI_VALIDATION feature flag is on
    const isAiValidationEnabled = await this.flagService.isEnabled('ENABLE_AI_VALIDATION', orgId);

    if (isAiValidationEnabled) {
      try {
        await aiQueue.add(
          AI_JOB_NAMES.VALIDATE_LAYER3,
          { documentId: doc.id, organizationId: orgId },
          { jobId: `validate-l3-${doc.id}` },
        );
        logger.info({ documentId: doc.id }, 'Layer 3 AI validation enqueued on ai-queue');
      } catch (err: any) {
        logger.error({ documentId: doc.id, error: err.message }, 'Failed to enqueue Layer 3 validation');
      }
    }

    // Determine interim status (NEEDS_REVIEW if any flags, else VALIDATED)
    const targetStatus = combinedIssues.length > 0 ? DocumentStatus.NEEDS_REVIEW : DocumentStatus.VALIDATED;

    await this.docRepo.updateDocumentStatus(
      doc.id,
      targetStatus,
      `Layer 1 & 2 validation completed (${combinedIssues.length} flags)`,
    );

    return combinedIssues;
  }

  // ===========================================================================
  // 2. Run Asynchronous Layer 3 AI Validation (FWS §7.4 & Plan Phase 7)
  // ===========================================================================
  async runLayer3Validation(documentId: string, orgId: string): Promise<ValidationIssue[]> {
    const doc = await this.docRepo.findDocumentById(documentId);
    if (!doc) throw new NotFoundError('Document');

    const extracted = await this.aiRepo.findLatestExtractedData(documentId);
    const fields = (extracted?.fieldsJson as Record<string, any>) || doc.manualData || {};

    const l3Result = await this.layer3.validate(doc.id, doc.category.code, fields);

    await this.repo.createValidationResult({
      documentId: doc.id,
      layer: ValidationLayer.LAYER_3,
      status: l3Result.issues.length > 0 ? ValidationStatus.FLAGGED : ValidationStatus.PASS,
      issuesJson: l3Result.issues,
      explanationText: l3Result.explanation,
    });

    // Aggregate all layer validation results for final document status
    const allResults = await this.repo.getValidationResultsForDocument(doc.id);
    const allIssues = allResults.flatMap((r) => (r.issuesJson as unknown as ValidationIssue[]) || []);

    const finalStatus = allIssues.length > 0 ? DocumentStatus.NEEDS_REVIEW : DocumentStatus.VALIDATED;

    await this.docRepo.updateDocumentStatus(
      doc.id,
      finalStatus,
      `Layer 3 AI validation completed (${l3Result.label})`,
      'aiWorker',
    );

    logger.info({ documentId: doc.id, label: l3Result.label, finalStatus }, 'Layer 3 validation finalized');

    return allIssues;
  }

  // ===========================================================================
  // 3. Human Review Actions: Approve / Reject / Bulk Approve (FWS §8)
  // ===========================================================================
  async approveDocument(userId: string, documentId: string, reason?: string, corrections?: Record<string, any>): Promise<void> {
    const doc = await this.docRepo.findDocumentById(documentId);
    if (!doc) throw new NotFoundError('Document');

    if (corrections && Object.keys(corrections).length > 0) {
      await this.docRepo.updateDocumentManualData(documentId, corrections);
    }

    // Anti-Greenwashing & Plausibility Validation Gate
    if (corrections && corrections.quantity !== undefined) {
      const newQty = Number(corrections.quantity);
      if (isNaN(newQty) || newQty <= 0) {
        throw new ValidationError('Activity quantity must be strictly greater than zero.');
      }

      const extracted = await this.aiRepo.findLatestExtractedData(documentId);
      const extData = (extracted?.fieldsJson as Record<string, any>) || {};
      const rawOcrQty = Number(extData.quantity?.value ?? extData.quantity ?? extData.weightKg?.value ?? extData.weightKg ?? extData.kwhConsumed?.value ?? extData.kwhConsumed ?? 0);

      if (rawOcrQty > 0) {
        const floor = rawOcrQty * 0.20; // 80% maximum reduction limit
        const warningThreshold = rawOcrQty * 0.85; // 15% reduction threshold
        if (newQty < floor) {
          // If reduced below floor, require documented auditor justification
          if (!reason || reason.trim().length < 5) {
            throw new ValidationError(
              `Auditor Justification Required: Activity quantity (${newQty.toLocaleString()}) is more than 80% below document baseline (${rawOcrQty.toLocaleString()}). Please provide an explicit audit reason to confirm this override.`,
            );
          }
        } else if (newQty < warningThreshold && (!reason || reason.trim().length < 5)) {
          throw new ValidationError(
            'Auditor Justification Required: Reducing quantity below the verified document baseline requires a documented audit justification.',
          );
        }
      }
    }

    // Rule: Layer 1 HARD_BLOCK errors cannot be approved as-is without correction (FWS §7.5)
    const results = await this.repo.getValidationResultsForDocument(documentId);
    const allIssues = results.flatMap((r) => (r.issuesJson as unknown as ValidationIssue[]) || []);

    const hasHardBlock = allIssues.some((issue) => {
      if (corrections && issue.field && corrections[issue.field] !== undefined) {
        return false; // Field was explicitly corrected by human reviewer
      }
      return issue.severity === 'HARD_BLOCK';
    });

    if (hasHardBlock) {
      throw new ValidationError(
        'Records with hard-block validation errors cannot be approved. Edit the invalid fields first.',
      );
    }

    await this.docRepo.updateDocumentStatus(documentId, DocumentStatus.APPROVED, reason ?? 'Human approved', userId);

    await this.repo.createReviewAction({
      documentId,
      action: ReviewActionType.APPROVE,
      performedById: userId,
      reason: reason ?? 'Human approved',
    });

    // Enqueue calc-queue job CALCULATE_RECORD (Module 8)
    try {
      await calcQueue.add(
        CALC_JOB_NAMES.CALCULATE_RECORD,
        { documentId: doc.id, organizationId: doc.organizationId },
        { jobId: `calc-${doc.id}` },
      );
      logger.info({ documentId: doc.id, queue: 'calc-queue' }, 'Calculation job enqueued post-approval');
    } catch (err: any) {
      logger.error({ documentId: doc.id, error: err.message }, 'Failed to enqueue calculation job');
    }

    // Direct synchronous calculation fallback (Render / standalone deployments without background workers)
    try {
      const { CarbonEngineService } = await import('../carbon-engine/carbon-engine.service');
      const { CarbonEngineRepository } = await import('../carbon-engine/carbon-engine.repository');
      const { NotificationService } = await import('../../services/notification.service');
      const prisma = this.repo['prisma'];
      const calcRepo = new CarbonEngineRepository(prisma, doc.organizationId);
      const notifService = new NotificationService(prisma);
      const engineService = new CarbonEngineService(calcRepo, this.docRepo, this.aiRepo, this.orgRepo, notifService);
      await engineService.calculateApprovedRecord(doc.id, doc.organizationId);
      logger.info({ documentId: doc.id }, 'Synchronous calculation completed post-approval');
    } catch (calcErr: any) {
      logger.warn({ documentId: doc.id, error: calcErr.message }, 'Direct synchronous calculation attempt post-approval finished');
    }

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: doc.organizationId,
      action: 'DOCUMENT_APPROVED',
      entityType: 'Document',
      entityId: documentId,
      reason,
    });
  }

  async rejectDocument(userId: string, documentId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('Rejection reason is required and must be at least 10 characters long.');
    }

    const doc = await this.docRepo.findDocumentById(documentId);
    if (!doc) throw new NotFoundError('Document');

    await this.docRepo.updateDocumentStatus(documentId, DocumentStatus.REJECTED, reason, userId);

    await this.repo.createReviewAction({
      documentId,
      action: ReviewActionType.REJECT,
      performedById: userId,
      reason,
    });

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: doc.organizationId,
      action: 'DOCUMENT_REJECTED',
      entityType: 'Document',
      entityId: documentId,
      reason,
    });
  }

  async bulkApprove(
    userId: string,
    orgId: string,
    documentIds: string[],
  ): Promise<BulkApproveResponse> {
    let approvedCount = 0;
    const skippedDocumentIds: string[] = [];

    for (const docId of documentIds) {
      try {
        const results = await this.repo.getValidationResultsForDocument(docId);
        const allIssues = results.flatMap((r) => (r.issuesJson as unknown as ValidationIssue[]) || []);

        // Bulk approve enforces ZERO flags server-side per FWS §8.3
        if (allIssues.length > 0) {
          skippedDocumentIds.push(docId);
          continue;
        }

        await this.approveDocument(userId, docId, 'Bulk approved (zero flags)');
        approvedCount++;
      } catch (err: any) {
        skippedDocumentIds.push(docId);
      }
    }

    return {
      approvedCount,
      skippedCount: skippedDocumentIds.length,
      skippedDocumentIds,
    };
  }

  // ===========================================================================
  // 4. Review Queue Listing (FWS §8.3 & PRD §6)
  // ===========================================================================
  async listReviewQueue(filters: { siteId?: string; reportingPeriodId?: string; status?: DocumentStatus }, page = 1, limit = 20) {
    const { items, total } = await this.repo.listReviewQueue(filters, page, limit);

    const queueItems: ReviewQueueItemDTO[] = items.map((doc) => {
      const results = doc.validationResults || [];
      const flags = results.flatMap((r) => (r.issuesJson as unknown as ValidationIssue[]) || []);
      const hasHardBlock = flags.some((f) => f.severity === 'HARD_BLOCK');

      return {
        id: doc.id,
        organizationId: doc.organizationId,
        siteName: doc.site.name,
        reportingPeriodName: doc.reportingPeriod.name,
        categoryName: doc.category.name,
        categoryCode: doc.category.code,
        fileName: doc.fileName,
        source: doc.source,
        status: doc.status,
        hasHardBlock,
        totalFlagsCount: flags.length,
        flags,
        createdAt: doc.createdAt,
      };
    });

    return { items: queueItems, total, page, limit };
  }

  async getValidationDetails(documentId: string): Promise<ValidationResultDTO[]> {
    const results = await this.repo.getValidationResultsForDocument(documentId);
    return results.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      layer: r.layer,
      status: r.status,
      issues: (r.issuesJson as unknown as ValidationIssue[]) || [],
      explanationText: r.explanationText,
      createdAt: r.createdAt,
    }));
  }
}
