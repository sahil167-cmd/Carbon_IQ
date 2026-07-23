import { z } from 'zod';

export const patchExtractedFieldSchema = z.object({
  fieldName: z.string().min(1, 'fieldName is required'),
  newValue: z.unknown(), // String, number, or boolean replacement
  reason: z.string().max(250).optional(),
});

export const reprocessDocumentSchema = z.object({
  reason: z.string().max(250).optional().default('Manual user reprocess trigger'),
});

export const internalExtractSchema = z.object({
  documentId: z.string().min(1, 'documentId is required'),
  organizationId: z.string().min(1, 'organizationId is required'),
});

export type PatchExtractedFieldInput = z.infer<typeof patchExtractedFieldSchema>;
export type ReprocessDocumentInput = z.infer<typeof reprocessDocumentSchema>;
export type InternalExtractInput = z.infer<typeof internalExtractSchema>;
