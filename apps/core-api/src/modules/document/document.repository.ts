import {
  PrismaClient,
  Document,
  DocumentCategory,
  DocumentStatus,
  DocumentSource,
  DocumentStatusHistory,
  ReportingPeriod,
  ReportingPeriodStatus,
} from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class DocumentRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId);
  }

  // ── Document Category Operations ────────────────────────────────────────────
  async listCategories(): Promise<DocumentCategory[]> {
    return this.prisma.documentCategory.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findCategoryById(id: string): Promise<DocumentCategory | null> {
    return this.prisma.documentCategory.findUnique({ where: { id } });
  }

  async findCategoryByCode(code: string): Promise<DocumentCategory | null> {
    return this.prisma.documentCategory.findUnique({ where: { code } });
  }

  // ── Document Operations ─────────────────────────────────────────────────────
  async findDocumentById(id: string): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: this.scopedWhere({ id }),
      include: {
        category: true,
        site: true,
        reportingPeriod: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createUploadedDocument(data: {
    siteId: string;
    reportingPeriodId: string;
    categoryId: string;
    uploadedById: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    s3Key: string;
  }): Promise<Document> {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          organizationId: this.organizationId,
          siteId: data.siteId,
          reportingPeriodId: data.reportingPeriodId,
          categoryId: data.categoryId,
          uploadedById: data.uploadedById,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          s3Key: data.s3Key,
          source: DocumentSource.UPLOAD,
          status: DocumentStatus.UPLOADED,
        },
      });

      await tx.documentStatusHistory.create({
        data: {
          documentId: doc.id,
          fromStatus: null,
          toStatus: DocumentStatus.UPLOADED,
          reason: 'Initial file upload metadata registered',
          changedById: data.uploadedById,
        },
      });

      return doc;
    });
  }

  async createManualDocument(data: {
    siteId: string;
    reportingPeriodId: string;
    categoryId: string;
    uploadedById: string;
    manualData: unknown;
  }): Promise<Document> {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.documentCategory.findUnique({
        where: { id: data.categoryId },
      });

      const doc = await tx.document.create({
        data: {
          organizationId: this.organizationId,
          siteId: data.siteId,
          reportingPeriodId: data.reportingPeriodId,
          categoryId: data.categoryId,
          uploadedById: data.uploadedById,
          fileName: `Manual Entry — ${category?.name ?? 'Category'}`,
          fileSize: 0,
          mimeType: 'application/json',
          s3Key: `manual/${this.organizationId}/${data.siteId}/${Date.now()}.json`,
          source: DocumentSource.MANUAL,
          status: DocumentStatus.EXTRACTED, // Manual entries skip OCR/LLM directly to EXTRACTED
          manualData: data.manualData as any,
        },
      });

      await tx.documentStatusHistory.create({
        data: {
          documentId: doc.id,
          fromStatus: null,
          toStatus: DocumentStatus.EXTRACTED,
          reason: 'Manual activity data entry submitted',
          changedById: data.uploadedById,
        },
      });

      return doc;
    });
  }

  async updateDocumentStatus(
    documentId: string,
    toStatus: DocumentStatus,
    reason?: string,
    changedById?: string,
  ): Promise<Document> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.document.findUnique({
        where: { id: documentId },
      });

      const updated = await tx.document.update({
        where: { id: documentId },
        data: { status: toStatus },
      });

      await tx.documentStatusHistory.create({
        data: {
          documentId,
          fromStatus: current?.status ?? null,
          toStatus,
          reason: reason ?? null,
          changedById: changedById ?? null,
        },
      });

      return updated;
    });
  }

  async listDocuments(
    filters: {
      siteId?: string;
      reportingPeriodId?: string;
      categoryId?: string;
      status?: DocumentStatus;
    },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = this.scopedWhere({
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.reportingPeriodId ? { reportingPeriodId: filters.reportingPeriodId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    });

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          category: true,
          site: true,
          reportingPeriod: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total };
  }

  // ── Reporting Period Progress Queries ───────────────────────────────────────
  async findReportingPeriodById(id: string): Promise<ReportingPeriod | null> {
    return this.prisma.reportingPeriod.findFirst({
      where: this.scopedWhere({ id }),
    });
  }

  async updateReportingPeriodStatus(
    id: string,
    status: ReportingPeriodStatus,
  ): Promise<ReportingPeriod> {
    return this.prisma.reportingPeriod.update({
      where: { id },
      data: { status },
    });
  }

  async getApprovedCategoriesCount(siteId: string, reportingPeriodId: string): Promise<string[]> {
    const approvedDocs = await this.prisma.document.findMany({
      where: this.scopedWhere({
        siteId,
        reportingPeriodId,
        status: DocumentStatus.APPROVED,
      }),
      select: { categoryId: true },
      distinct: ['categoryId'],
    });

    return approvedDocs.map((d) => d.categoryId);
  }

  async listActiveReportingPeriods(): Promise<ReportingPeriod[]> {
    return this.prisma.reportingPeriod.findMany({
      where: this.scopedWhere({ status: ReportingPeriodStatus.OPEN }),
      orderBy: { startDate: 'desc' },
    });
  }

  async listReportingPeriods(): Promise<ReportingPeriod[]> {
    return this.prisma.reportingPeriod.findMany({
      where: this.scopedWhere({}),
      orderBy: { startDate: 'desc' },
    });
  }

  async createReportingPeriod(data: {
    name: string;
    startDate: Date;
    endDate: Date;
  }): Promise<ReportingPeriod> {
    return this.prisma.reportingPeriod.create({
      data: {
        organizationId: this.organizationId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: ReportingPeriodStatus.OPEN,
      },
    });
  }
}
