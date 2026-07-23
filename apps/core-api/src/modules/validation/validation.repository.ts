import {
  PrismaClient,
  ValidationResult,
  ValidationLayer,
  ValidationStatus,
  ReviewAction,
  ReviewActionType,
  DocumentStatus,
} from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class ValidationRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId);
  }

  // ── Validation Result Operations ───────────────────────────────────────────
  async createValidationResult(data: {
    documentId: string;
    layer: ValidationLayer;
    status: ValidationStatus;
    issuesJson: unknown;
    explanationText?: string | null;
  }): Promise<ValidationResult> {
    return this.prisma.validationResult.create({
      data: {
        documentId: data.documentId,
        layer: data.layer,
        status: data.status,
        issuesJson: data.issuesJson as any,
        explanationText: data.explanationText ?? null,
      },
    });
  }

  async getValidationResultsForDocument(documentId: string): Promise<ValidationResult[]> {
    return this.prisma.validationResult.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Review Queue Queries (PRD §6 & FWS §8) ────────────────────────────────
  async listReviewQueue(
    filters: { siteId?: string; reportingPeriodId?: string; status?: DocumentStatus },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where = this.scopedWhere({
      status: filters.status
        ? filters.status
        : { in: [DocumentStatus.NEEDS_REVIEW, DocumentStatus.VALIDATED, DocumentStatus.EXTRACTED] },
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.reportingPeriodId ? { reportingPeriodId: filters.reportingPeriodId } : {}),
    });

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          category: true,
          site: true,
          reportingPeriod: true,
          validationResults: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total };
  }

  // ── Review Actions Audit ──────────────────────────────────────────────────
  async createReviewAction(data: {
    documentId: string;
    action: ReviewActionType;
    performedById: string;
    reason?: string | null;
    previousValuesJson?: unknown;
  }): Promise<ReviewAction> {
    return this.prisma.reviewAction.create({
      data: {
        documentId: data.documentId,
        action: data.action,
        performedById: data.performedById,
        reason: data.reason ?? null,
        previousValuesJson: data.previousValuesJson as any,
      },
    });
  }
}
