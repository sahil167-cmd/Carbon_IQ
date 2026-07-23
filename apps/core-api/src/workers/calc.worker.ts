/**
 * Calc Worker — consumes the 'calc-queue'
 *
 * This worker handles all deterministic carbon emissions calculation.
 * The Carbon Accounting Engine (Module 7) runs ONLY here.
 * NEVER runs inline in an HTTP handler.
 *
 * Current Phase 0 behaviour:
 * - Logs job received with jobId and job name
 * - Acknowledges (completes) the job
 *
 * Real handlers are added in Phase 8 (Module 7):
 * - CALCULATE_RECORD: deterministic CO2e calculation for a single approved document
 * - RECALCULATE_PERIOD: recalculates all records in a reporting period
 *
 * Entry point: pnpm worker:calc (runs this file directly)
 */
import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, CALC_JOB_NAMES, CalcJobName } from '@carbon-os/shared-types';
import { workerConnection } from '../queues/queue.init';
import { createLogger } from '../core/logging/logger';

const logger = createLogger('calcWorker');

async function handleJob(job: Job): Promise<void> {
  const jobName = job.name as CalcJobName;
  const { jobId } = job;
  const childLogger = logger.child({ jobId, jobName, queue: QUEUE_NAMES.CALC });

  childLogger.info('Calc job received');

  // Idempotency: first action in real handlers will be a status check.
  // A duplicate/retried job must never double-create calculation rows.
  // See TRD §8.2 Idempotency guarantee.

  switch (jobName) {
    case CALC_JOB_NAMES.CALCULATE_RECORD: {
      const { documentId, organizationId } = job.data as { documentId?: string; organizationId?: string };
      childLogger.info({ documentId, organizationId }, 'Processing CALCULATE_RECORD job via deterministic Carbon Accounting Engine');

      if (documentId && organizationId) {
        try {
          const { CarbonEngineService } = await import('../modules/carbon-engine/carbon-engine.service');
          const { CarbonEngineRepository } = await import('../modules/carbon-engine/carbon-engine.repository');
          const { DocumentRepository } = await import('../modules/document/document.repository');
          const { AiCollectorRepository } = await import('../modules/ai-collector/ai-collector.repository');
          const { OrganizationRepository } = await import('../modules/organization/organization.repository');
          const { NotificationService } = await import('../services/notification.service');
          const { getPrismaClient } = await import('../core/repository/tenant-scoped.repository');

          const prisma = getPrismaClient();
          const repo = new CarbonEngineRepository(prisma, organizationId);
          const docRepo = new DocumentRepository(prisma, organizationId);
          const aiRepo = new AiCollectorRepository(prisma, organizationId);
          const orgRepo = new OrganizationRepository(prisma, organizationId);
          const notifService = new NotificationService(prisma);

          const service = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, notifService);

          const result = await service.calculateApprovedRecord(documentId, organizationId);
          if (result) {
            childLogger.info({ documentId, co2e: result.co2e, scope: result.scope }, 'Calculation completed successfully');
          }
        } catch (err: any) {
          childLogger.error({ documentId, error: err.message }, 'Calculation failed inside worker');
        }
      }
      break;
    }

    case CALC_JOB_NAMES.RECALCULATE_PERIOD: {
      const { periodId, organizationId, userId, reason } = job.data as { periodId?: string; organizationId?: string; userId?: string; reason?: string };
      childLogger.info({ periodId, organizationId }, 'Processing RECALCULATE_PERIOD job');

      if (periodId && organizationId && userId) {
        try {
          const { CarbonEngineService } = await import('../modules/carbon-engine/carbon-engine.service');
          const { CarbonEngineRepository } = await import('../modules/carbon-engine/carbon-engine.repository');
          const { DocumentRepository } = await import('../modules/document/document.repository');
          const { AiCollectorRepository } = await import('../modules/ai-collector/ai-collector.repository');
          const { OrganizationRepository } = await import('../modules/organization/organization.repository');
          const { NotificationService } = await import('../services/notification.service');
          const { getPrismaClient } = await import('../core/repository/tenant-scoped.repository');

          const prisma = getPrismaClient();
          const repo = new CarbonEngineRepository(prisma, organizationId);
          const docRepo = new DocumentRepository(prisma, organizationId);
          const aiRepo = new AiCollectorRepository(prisma, organizationId);
          const orgRepo = new OrganizationRepository(prisma, organizationId);
          const notifService = new NotificationService(prisma);

          const service = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, notifService);

          const count = await service.recalculatePeriod(userId, organizationId, periodId, reason || 'Bulk recalculation');
          childLogger.info({ periodId, count }, 'Period recalculation completed successfully');
        } catch (err: any) {
          childLogger.error({ periodId, error: err.message }, 'Period recalculation failed inside worker');
        }
      }
      break;
    }

    default:
      childLogger.warn({ jobName }, 'Unknown calc job type — acking without processing');
  }

  childLogger.info('Calc job completed');
}

const calcWorker = new Worker(QUEUE_NAMES.CALC, handleJob, {
  ...workerConnection,
  concurrency: 10, // Calc jobs are CPU-bound but fast; higher concurrency than AI
});

calcWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Calc job completed successfully');
});

calcWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(
    { jobId: job?.id, jobName: job?.name, error: err.message, stack: err.stack },
    'Calc job failed',
  );
});

calcWorker.on('error', (err: Error) => {
  logger.error({ error: err.message }, 'Calc worker error');
});

logger.info({ queue: QUEUE_NAMES.CALC, concurrency: 10 }, 'Calc worker started');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — closing calc worker...');
  await calcWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received — closing calc worker...');
  await calcWorker.close();
  process.exit(0);
});
