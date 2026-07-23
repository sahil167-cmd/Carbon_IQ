import { DocumentStatus, DocumentSource, ScopeType } from '@prisma/client';

export interface DocumentCategoryDTO {
  id: string;
  code: string;
  name: string;
  scope: ScopeType;
  description: string;
  requiredByDefault: boolean;
  acceptedMimeTypes: string[];
}

export interface PresignedUploadUrlRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface PresignedUploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresInSeconds: number;
}

export interface DocumentDTO {
  id: string;
  organizationId: string;
  siteId: string;
  reportingPeriodId: string;
  categoryId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  source: DocumentSource;
  status: DocumentStatus;
  manualData: unknown;
  downloadUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentStatusHistoryDTO {
  id: string;
  documentId: string;
  fromStatus: DocumentStatus | null;
  toStatus: DocumentStatus;
  reason: string | null;
  changedById: string | null;
  createdAt: Date;
}

export interface PeriodProgressSummary {
  siteId: string;
  reportingPeriodId: string;
  totalCategories: number;
  completedCategories: number;
  requiredCategories: number;
  requiredCompleted: number;
  percentComplete: number;
  isReadyForCalculation: boolean;
  missingCategoryCodes: string[];
}
