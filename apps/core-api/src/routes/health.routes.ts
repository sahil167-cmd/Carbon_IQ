import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Liveness check — returns 200 if the process is alive.
 * Does NOT check DB or Redis (use /ready for that).
 * Used by container orchestrators (K8s, ECS) for liveness probes.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.0',
    },
  });
});

export default router;
