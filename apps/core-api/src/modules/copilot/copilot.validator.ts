import { z } from 'zod';

/**
 * Copilot Module — Request Validation Schemas
 */

export const copilotQuerySchema = z.object({
  sessionId: z.string().nullish(),
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be 2000 characters or fewer')
    .trim(),
});

export type CopilotQueryInput = z.infer<typeof copilotQuerySchema>;

export const createSessionSchema = z.object({
  title: z.string().max(200).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const sessionIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const ingestDocumentSchema = z.object({
  documentId: z.string().cuid(),
  organizationId: z.string().cuid().optional(),
});

export type IngestDocumentInput = z.infer<typeof ingestDocumentSchema>;
