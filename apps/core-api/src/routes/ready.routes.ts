import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../core/repository/tenant-scoped.repository';
import { redisClient } from '../queues/queue.init';
import { createLogger } from '../core/logging/logger';

const router = Router();
const logger = createLogger('ready.routes');

/**
 * GET /ready
 * Readiness check — verifies DB and Redis are reachable.
 * Returns 200 only when the service can handle traffic.
 * Returns 503 if any dependency is unhealthy.
 *
 * Used by container orchestrators for readiness probes.
 * Load balancers stop sending traffic to a pod that returns 503 here.
 */
router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};
  let overallStatus: 'ok' | 'degraded' = 'ok';

  // --- PostgreSQL check ---
  const dbStart = Date.now();
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    const e = err as Error;
    logger.error({ error: e.message }, 'Ready check: database unreachable');
    checks.database = { status: 'error', error: 'Database unreachable' };
    overallStatus = 'degraded';
  }

  // --- Redis check ---
  const redisStart = Date.now();
  try {
    await redisClient.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch (err) {
    const e = err as Error;
    logger.error({ error: e.message }, 'Ready check: Redis unreachable');
    checks.redis = { status: 'error', error: 'Redis unreachable' };
    overallStatus = 'degraded';
  }

  const httpStatus = overallStatus === 'ok' ? 200 : 503;

  res.status(httpStatus).json({
    success: overallStatus === 'ok',
    data: {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
  });
});

export default router;
