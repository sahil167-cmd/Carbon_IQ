import {
  PrismaClient,
  ExtractedData,
  ExtractionJob,
  ExtractionJobStatus,
  AiLog,
  AiFeature,
} from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class AiCollectorRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId);
  }

  // ── Extracted Data Operations ───────────────────────────────────────────────
  async findLatestExtractedData(documentId: string): Promise<ExtractedData | null> {
    return this.prisma.extractedData.findFirst({
      where: { documentId },
      orderBy: { extractionVersion: 'desc' },
    });
  }

  async getLatestExtractionVersion(documentId: string): Promise<number> {
    const latest = await this.prisma.extractedData.findFirst({
      where: { documentId },
      orderBy: { extractionVersion: 'desc' },
      select: { extractionVersion: true },
    });
    return latest?.extractionVersion ?? 0;
  }

  async createExtractedData(data: {
    documentId: string;
    extractionVersion: number;
    fieldsJson: unknown;
    fieldConfidenceJson: unknown;
    modelVersion?: string;
    status: ExtractionJobStatus;
  }): Promise<ExtractedData> {
    return this.prisma.extractedData.create({
      data: {
        documentId: data.documentId,
        extractionVersion: data.extractionVersion,
        fieldsJson: data.fieldsJson as any,
        fieldConfidenceJson: data.fieldConfidenceJson as any,
        modelVersion: data.modelVersion ?? 'tesseract-v5+langchain',
        status: data.status,
      },
    });
  }

  async updateExtractedDataFields(
    id: string,
    fieldsJson: unknown,
    fieldConfidenceJson: unknown,
  ): Promise<ExtractedData> {
    return this.prisma.extractedData.update({
      where: { id },
      data: {
        fieldsJson: fieldsJson as any,
        fieldConfidenceJson: fieldConfidenceJson as any,
      },
    });
  }

  // ── Extraction Jobs Operations ──────────────────────────────────────────────
  async createExtractionJob(documentId: string): Promise<ExtractionJob> {
    return this.prisma.extractionJob.create({
      data: {
        documentId,
        status: ExtractionJobStatus.PENDING,
        attemptCount: 1,
        startedAt: new Date(),
      },
    });
  }

  async updateExtractionJobStatus(
    jobId: string,
    status: ExtractionJobStatus,
    error?: string,
  ): Promise<ExtractionJob> {
    return this.prisma.extractionJob.update({
      where: { id: jobId },
      data: {
        status,
        lastError: error ?? null,
        completedAt: new Date(),
      },
    });
  }

  // ── AI Audit Logs (PRD §5.5) ────────────────────────────────────────────────
  async logAiExecution(data: {
    feature: AiFeature;
    organizationId?: string;
    inputRef?: string;
    promptText?: string;
    responseText?: string;
    tokensUsed?: number;
    latencyMs?: number;
    costEstimate?: number;
  }): Promise<AiLog> {
    return this.prisma.aiLog.create({
      data: {
        feature: data.feature,
        organizationId: data.organizationId ?? this.organizationId ?? null,
        inputRef: data.inputRef ?? null,
        promptText: data.promptText ?? null,
        responseText: data.responseText ?? null,
        tokensUsed: data.tokensUsed ?? null,
        latencyMs: data.latencyMs ?? null,
        costEstimate: data.costEstimate ?? null,
      },
    });
  }
}
