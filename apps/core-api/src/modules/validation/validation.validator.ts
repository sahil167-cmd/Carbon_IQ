import { z } from 'zod';
import { DocumentStatus } from '@prisma/client';

export const approveDocumentSchema = z.object({
  reason: z.string().max(250).optional(),
});

export const rejectDocumentSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters long').max(500),
});

export const bulkApproveSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1, 'At least one document ID is required'),
});

export const listReviewQueueQuerySchema = z.object({
  siteId: z.string().optional(),
  reportingPeriodId: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});

export type ApproveDocumentInput = z.infer<typeof approveDocumentSchema>;
export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>;
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;
export type ListReviewQueueQuery = z.infer<typeof listReviewQueueQuerySchema>;
