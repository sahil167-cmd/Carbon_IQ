import {
  ValidationLayer,
  ValidationStatus,
  ReviewActionType,
  Layer3Label,
  DocumentStatus,
} from '@prisma/client';

export type IssueSeverity = 'HARD_BLOCK' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  code: string;
  field?: string;
  message: string;
  severity: IssueSeverity;
  layer: ValidationLayer;
}

export interface ValidationResultDTO {
  id: string;
  documentId: string;
  layer: ValidationLayer;
  status: ValidationStatus;
  issues: ValidationIssue[];
  explanationText: string | null;
  createdAt: Date;
}

export interface ReviewActionDTO {
  id: string;
  documentId: string;
  action: ReviewActionType;
  performedById: string;
  reason: string | null;
  previousValues: unknown;
  createdAt: Date;
}

export interface ReviewQueueItemDTO {
  id: string; // documentId
  organizationId: string;
  siteName: string;
  reportingPeriodName: string;
  categoryName: string;
  categoryCode: string;
  fileName: string;
  source: string;
  status: DocumentStatus;
  hasHardBlock: boolean;
  totalFlagsCount: number;
  flags: ValidationIssue[];
  createdAt: Date;
}

export interface BulkApproveResponse {
  approvedCount: number;
  skippedCount: number;
  skippedDocumentIds: string[];
}
