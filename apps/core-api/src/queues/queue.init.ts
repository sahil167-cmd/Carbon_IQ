import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@carbon-os/shared-types';
import { env } from '../config/env.schema';
import { createLogger } from '../core/logging/logger';

const logger = createLogger('QueueInit');

/**
 * Redis connection shared by BullMQ queues and workers.
 * Using ioredis — BullMQ's recommended client.
 * maxRetriesPerRequest=null required by BullMQ for blocking commands.
 */
export const redisClient = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 3000);
    logger.warn({ attempt: times, delayMs: delay }, 'Redis reconnecting...');
    return delay;
  },
});

redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('error', (err) => logger.error({ err: err.message }, 'Redis connection error'));

const bullMQConnection = { connection: redisClient };

// =============================================================================
// QUEUE INSTANCES
// Exactly 2 queues — per FWS locked architecture.
// DO NOT add additional queues without updating TRD/FWS.
// =============================================================================

/** AI queue: document extraction, Layer-3 AI validation, compliance drafting */
export const aiQueue = new Queue(QUEUE_NAMES.AI, {
  ...bullMQConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

/** Calculation queue: emissions calculation, recalculation */
export const calcQueue = new Queue(QUEUE_NAMES.CALC, {
  ...bullMQConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

/** Queue events for monitoring / observability */
export const aiQueueEvents = new QueueEvents(QUEUE_NAMES.AI, bullMQConnection);
export const calcQueueEvents = new QueueEvents(QUEUE_NAMES.CALC, bullMQConnection);

/** Connection config for workers (separate from Queue instances) */
export const workerConnection = bullMQConnection;

logger.info({ queues: [QUEUE_NAMES.AI, QUEUE_NAMES.CALC] }, 'BullMQ queues initialized');
