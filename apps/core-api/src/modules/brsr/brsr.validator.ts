import { z } from 'zod';

export const createBrsrReportSchema = z.object({
  financialYear: z.string().default('FY 2025-26'),
  reportingPeriodId: z.string().optional(),
  boundary: z.enum(['STANDALONE', 'CONSOLIDATED']).default('STANDALONE'),
});

export const updateBrsrReportSchema = z.object({
  sectionAData: z.record(z.any()).optional(),
  sectionBData: z.record(z.any()).optional(),
  sectionCData: z.record(z.any()).optional(),
  environmentalData: z.record(z.any()).optional(),
  isAssured: z.boolean().optional(),
  assuranceProvider: z.string().nullish(),
  assuranceType: z.enum(['LIMITED', 'REASONABLE']).nullish(),
  assuranceReportUrl: z.string().nullish(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'READY_FOR_GENERATION', 'FINALIZED', 'ARCHIVED']).optional(),
});

export const generateBrsrReportSchema = z.object({
  version: z.number().int().positive().optional(),
});
