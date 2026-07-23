import { z } from 'zod';
import { DocumentStatus } from '@prisma/client';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB per TRD §8.1 & PRD FR-4.3

export const singleUploadUrlSchema = z.object({
  fileName: z.string().min(1, 'fileName is required').max(255),
  fileSize: z
    .number()
    .int()
    .positive('fileSize must be a positive integer')
    .max(MAX_FILE_SIZE_BYTES, 'File size exceeds maximum limit of 20MB'),
  mimeType: z.enum([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ], { invalid_type_error: 'Unsupported file type. Allowed: PDF, PNG, JPG, TIFF, CSV, XLSX' }),
});

export const requestUploadUrlsSchema = z.object({
  files: z
    .array(singleUploadUrlSchema)
    .min(1, 'At least one file is required')
    .max(25, 'Maximum batch size is 25 files'), // Batch limit per PRD FR-4.3
});

export const registerDocumentSchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  reportingPeriodId: z.string().min(1, 'reportingPeriodId is required'),
  categoryId: z.string().min(1, 'categoryId is required'),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  mimeType: z.string(),
  s3Key: z.string().min(1, 's3Key is required'),
});

export const submitManualDataSchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  reportingPeriodId: z.string().min(1, 'reportingPeriodId is required'),
  categoryId: z.string().min(1, 'categoryId is required'),
  manualData: z.record(z.unknown()), // Structured JSON form fields per category schema
});

export const listDocumentsQuerySchema = z.object({
  siteId: z.string().optional(),
  reportingPeriodId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});

export const lockPeriodSchema = z.object({
  reason: z.string().max(250).optional(),
});

export type SingleUploadUrlInput = z.infer<typeof singleUploadUrlSchema>;
export type RequestUploadUrlsInput = z.infer<typeof requestUploadUrlsSchema>;
export type RegisterDocumentInput = z.infer<typeof registerDocumentSchema>;
export type SubmitManualDataInput = z.infer<typeof submitManualDataSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
