import { z } from 'zod';

export const createEmissionFactorSchema = z.object({
  category: z.string().min(1, 'category is required'),
  subCategory: z.string().min(1, 'subCategory is required'),
  region: z.string().default('GLOBAL'),
  factorValue: z.number().positive('factorValue must be positive'),
  unit: z.string().min(1, 'unit is required'),
  co2eUnit: z.string().default('kgCO2e'),
  sourceSet: z.enum(['GLEC_2023', 'GHG_PROTOCOL_2023', 'DEFRA_2023']).default('GLEC_2023'),
});

export const recalculatePeriodSchema = z.object({
  reason: z.string().min(1, 'Reason for period recalculation is required').max(500),
});

export const internalCalcSchema = z.object({
  documentId: z.string().min(1, 'documentId is required'),
  organizationId: z.string().min(1, 'organizationId is required'),
});

export type CreateEmissionFactorInput = z.infer<typeof createEmissionFactorSchema>;
export type RecalculatePeriodInput = z.infer<typeof recalculatePeriodSchema>;
export type InternalCalcInput = z.infer<typeof internalCalcSchema>;
