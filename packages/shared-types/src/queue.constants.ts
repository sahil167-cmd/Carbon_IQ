/**
 * BullMQ Queue Names — single source of truth.
 * Per FWS locked architecture: exactly 2 queues platform-wide.
 * DO NOT add additional queue names without updating the TRD/FWS.
 */
export const QUEUE_NAMES = {
  AI: 'ai-queue',
  CALC: 'calc-queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Job names for the AI queue (ai-queue).
 * Handlers are added per-module phase in aiWorker.ts.
 */
export const AI_JOB_NAMES = {
  EXTRACT_DOCUMENT: 'EXTRACT_DOCUMENT',
  VALIDATE_LAYER3: 'VALIDATE_LAYER3',
  DRAFT_COMPLIANCE_SECTION: 'DRAFT_COMPLIANCE_SECTION',
} as const;

export type AiJobName = (typeof AI_JOB_NAMES)[keyof typeof AI_JOB_NAMES];

/**
 * Job names for the calculation queue (calc-queue).
 * Handlers are added per-module phase in calcWorker.ts.
 */
export const CALC_JOB_NAMES = {
  CALCULATE_RECORD: 'CALCULATE_RECORD',
  RECALCULATE_PERIOD: 'RECALCULATE_PERIOD',
} as const;

export type CalcJobName = (typeof CALC_JOB_NAMES)[keyof typeof CALC_JOB_NAMES];
