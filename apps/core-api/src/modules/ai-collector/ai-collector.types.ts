import { ExtractionJobStatus, AiFeature } from '@prisma/client';

export interface BoundingBox {
  page: number;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  width: number;
  height: number;
}

export interface ExtractedFieldValue<T = unknown> {
  value: T;
  confidence: number; // 0.0 - 1.0
  needsReview: boolean;
  boundingBox?: BoundingBox;
}

export interface ExtractedDataDTO {
  id: string;
  documentId: string;
  extractionVersion: number;
  fields: Record<string, ExtractedFieldValue>;
  fieldsJson?: Record<string, ExtractedFieldValue>;
  modelVersion: string;
  status: ExtractionJobStatus;
  createdAt: Date;
}

export interface OcrResult {
  rawText: string;
  confidence: number;
  pageCount: number;
  boundingBoxes: Array<{
    text: string;
    boundingBox: BoundingBox;
  }>;
}

export interface ExtractionJobDTO {
  id: string;
  documentId: string;
  status: ExtractionJobStatus;
  attemptCount: number;
  lastError: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface AiLogDTO {
  id: string;
  feature: AiFeature;
  organizationId: string | null;
  inputRef: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  costEstimate: number | null;
  createdAt: Date;
}
