/**
 * AI Worker — consumes the 'ai-queue'
 *
 * This worker handles all AI/LLM/OCR processing asynchronously.
 * NEVER runs inside an HTTP request handler (per TRD/FWS non-negotiable rule 3).
 *
 * Current Phase 0 behaviour:
 * - Logs job received with jobId and job name
 * - Acknowledges (completes) the job
 *
 * Real handlers are added per-module:
 * - Phase 6 (Module 5): EXTRACT_DOCUMENT handler (OCR → LangGraph extraction)
 * - Phase 7 (Module 6): VALIDATE_LAYER3 handler (AI validation)
 * - Phase 12 (Module 11): DRAFT_COMPLIANCE_SECTION handler (LangGraph drafting)
 *
 * Entry point: pnpm worker:ai (runs this file directly)
 */
import 'dotenv/config'; // Load env before anything else
import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, AI_JOB_NAMES, AiJobName } from '@carbon-iq/shared-types';
import { workerConnection } from '../queues/queue.init';
import { createLogger } from '../core/logging/logger';

const logger = createLogger('aiWorker');

/** Route job to the correct handler by name */
async function handleJob(job: Job): Promise<void> {
  const jobName = job.name as AiJobName;
  const jobId = job.id;
  const childLogger = logger.child({ jobId, jobName, queue: QUEUE_NAMES.AI });

  childLogger.info('AI job received');

  switch (jobName) {
    case AI_JOB_NAMES.EXTRACT_DOCUMENT: {
      const { documentId, organizationId } = job.data as { documentId?: string; organizationId?: string };
      childLogger.info({ documentId, organizationId }, 'Processing EXTRACT_DOCUMENT job via LangGraph AI Extraction pipeline');

      if (documentId && organizationId) {
        try {
          const { AiCollectorService } = await import('../modules/ai-collector/ai-collector.service');
          const { AiCollectorRepository } = await import('../modules/ai-collector/ai-collector.repository');
          const { DocumentRepository } = await import('../modules/document/document.repository');
          const { OrganizationRepository } = await import('../modules/organization/organization.repository');
          const { FeatureFlagService } = await import('../services/feature-flag.service');
          const { ConfigService } = await import('../services/config.service');
          const { NotificationService } = await import('../services/notification.service');
          const { getPrismaClient } = await import('../core/repository/tenant-scoped.repository');

          const prisma = getPrismaClient();
          const repo = new AiCollectorRepository(prisma, organizationId);
          const docRepo = new DocumentRepository(prisma, organizationId);
          const orgRepo = new OrganizationRepository(prisma, organizationId);
          const flagService = new FeatureFlagService(prisma);
          const configService = new ConfigService(prisma);
          const notifService = new NotificationService(prisma);

          const service = new AiCollectorService(repo, docRepo, orgRepo, flagService, configService);

          // Transition to EXTRACTING
          await docRepo.updateDocumentStatus(documentId, 'EXTRACTING', 'Picked up by aiWorker for OCR/Extraction', 'aiWorker');

          // Process extraction graph
          const result = await service.processDocumentExtraction(documentId, organizationId);

          if (result) {
            childLogger.info({ documentId, version: result.extractionVersion }, 'Document extraction completed successfully — running validation pass');

            // Auto-trigger Validation & Calc Engine
            const { ValidationService } = await import('../modules/validation/validation.service');
            const { ValidationRepository } = await import('../modules/validation/validation.repository');
            const valRepo = new ValidationRepository(prisma, organizationId);
            const valService = new ValidationService(valRepo, docRepo, repo, orgRepo, flagService);

            const issues = await valService.runLayer1And2Validation(documentId, organizationId);
            childLogger.info({ documentId, flagCount: issues.length }, 'Validation pass complete');

            // If 0 validation issues, auto-approve and trigger calculation
            if (issues.length === 0) {
              const systemUser = await prisma.user.findFirst({
                where: { organizationId, role: 'ORG_ADMIN' },
                select: { id: true },
              });
              const adminId = systemUser?.id || 'system';
              await valService.approveDocument(adminId, documentId, 'Auto-approved clean AI extraction');
              childLogger.info({ documentId }, 'Auto-approved clean record — calculation enqueued on calc-queue');
            }
          } else {
            childLogger.warn({ documentId }, 'Document extraction skipped or returned null');
          }
        } catch (err: any) {
          childLogger.error({ documentId, error: err.message }, 'AI Extraction failed inside worker');
        }
      }
      break;
    }

    case AI_JOB_NAMES.VALIDATE_LAYER3: {
      const { documentId, organizationId } = job.data as { documentId?: string; organizationId?: string };
      childLogger.info({ documentId, organizationId }, 'Processing VALIDATE_LAYER3 job via Layer 3 AI Validator');

      if (documentId && organizationId) {
        try {
          const { ValidationService } = await import('../modules/validation/validation.service');
          const { ValidationRepository } = await import('../modules/validation/validation.repository');
          const { DocumentRepository } = await import('../modules/document/document.repository');
          const { AiCollectorRepository } = await import('../modules/ai-collector/ai-collector.repository');
          const { OrganizationRepository } = await import('../modules/organization/organization.repository');
          const { FeatureFlagService } = await import('../services/feature-flag.service');
          const { getPrismaClient } = await import('../core/repository/tenant-scoped.repository');

          const prisma = getPrismaClient();
          const valRepo = new ValidationRepository(prisma, organizationId);
          const docRepo = new DocumentRepository(prisma, organizationId);
          const aiRepo = new AiCollectorRepository(prisma, organizationId);
          const orgRepo = new OrganizationRepository(prisma, organizationId);
          const flagService = new FeatureFlagService(prisma);

          const service = new ValidationService(valRepo, docRepo, aiRepo, orgRepo, flagService);

          const issues = await service.runLayer3Validation(documentId, organizationId);
          childLogger.info({ documentId, flagCount: issues.length }, 'Layer 3 AI validation job completed successfully');
        } catch (err: any) {
          childLogger.error({ documentId, error: err.message }, 'Layer 3 AI validation failed inside worker');
        }
      }
      break;
    }

    case AI_JOB_NAMES.DRAFT_COMPLIANCE_SECTION:
      // TODO (Phase 12 — Module 11): Wire LangGraph compliance drafting here
      childLogger.info('DRAFT_COMPLIANCE_SECTION handler not yet implemented (Phase 12)');
      break;

    default:
      childLogger.warn({ jobName }, 'Unknown job type received — acking without processing');
  }

  childLogger.info('AI job completed');
}

const aiWorker = new Worker(QUEUE_NAMES.AI, handleJob, {
  ...workerConnection,
  concurrency: 5, // Configurable — AI jobs are I/O-bound (LLM network calls)
});

aiWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'AI job completed successfully');
});

aiWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(
    { jobId: job?.id, jobName: job?.name, error: err.message, stack: err.stack },
    'AI job failed',
  );
});

aiWorker.on('error', (err: Error) => {
  logger.error({ error: err.message }, 'AI worker error');
});

logger.info({ queue: QUEUE_NAMES.AI, concurrency: 5 }, 'AI worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — closing AI worker...');
  await aiWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received — closing AI worker...');
  await aiWorker.close();
  process.exit(0);
});
