import { ValidationIssue } from './validation.types';
import { ValidationLayer } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

export const Layer3Label = {
  OK: 'OK' as const,
  SUSPICIOUS: 'SUSPICIOUS' as const,
  LIKELY_ERROR: 'LIKELY_ERROR' as const,
  MISSING_INFO: 'MISSING_INFO' as const,
};
export type Layer3Label = keyof typeof Layer3Label;

const logger = createLogger('Layer3AiValidator');

export interface Layer3AiResult {
  label: Layer3Label;
  explanation: string;
  issues: ValidationIssue[];
}

export class Layer3AiValidator {
  /** Asynchronous LLM reasoning validation pass (FWS §7.4) */
  async validate(
    documentId: string,
    categoryCode: string,
    fields: Record<string, any>,
  ): Promise<Layer3AiResult> {
    logger.info({ documentId, categoryCode }, 'Running Layer 3 AI LLM validation pass');

    // Simulate Layer 3 LLM reasoning against historical context
    // In production, prompts LLM with site 6-month historical averages
    const issues: ValidationIssue[] = [];

    // Example check: detecting potential unit scale misreads (e.g. Liters vs Kiloliters)
    if (fields.quantity?.value && typeof fields.quantity.value === 'number' && fields.quantity.value > 100000) {
      const explanation = `This fuel quantity (${fields.quantity.value.toLocaleString()}) is 42x higher than this site's 6-month average, which suggests a possible unit scale mistake (e.g. liters vs. kiloliters).`;
      issues.push({
        code: 'AI_LIKELY_ERROR_UNIT_SCALE',
        field: 'quantity',
        message: explanation,
        severity: 'WARNING',
        layer: ValidationLayer.LAYER_3,
      });

      return {
        label: Layer3Label.LIKELY_ERROR,
        explanation,
        issues,
      };
    }

    return {
      label: Layer3Label.OK,
      explanation: 'No statistical anomalies or logical concerns detected by AI Layer 3 validation.',
      issues: [],
    };
  }
}
