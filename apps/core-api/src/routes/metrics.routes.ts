import { Router, Request, Response, NextFunction } from 'express';
import { collectDefaultMetrics, Registry, Counter, Histogram, Gauge } from 'prom-client';
import { aiQueue, calcQueue } from '../queues/queue.init';
import { QUEUE_NAMES } from '@carbon-os/shared-types';

const router = Router();

// Create a dedicated registry to avoid polluting the default one
const registry = new Registry();

// Default Node.js metrics (CPU, memory, GC, event loop lag, etc.)
collectDefaultMetrics({ register: registry });

// --- HTTP Request Metrics ---
export const httpRequestDuration = new Histogram({
  name: 'carbon_os_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestTotal = new Counter({
  name: 'carbon_os_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// --- BullMQ Queue Metrics ---
const aiQueueDepth = new Gauge({
  name: `carbon_os_queue_depth`,
  help: 'Current BullMQ queue depth (waiting jobs)',
  labelNames: ['queue'],
  registers: [registry],
});

/**
 * Metrics Middleware
 * Records request latency histogram and total request counter per endpoint.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const durationSeconds = (Date.now() - start) / 1000;
    const route = req.route ? (req.route.path as string) : req.path;
    const statusCode = res.statusCode.toString();
    httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, durationSeconds);
    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
  });
  next();
}

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint.
 * Exposes: HTTP request latency histograms, BullMQ queue depths, Node.js defaults.
 *
 * In production this endpoint should be behind network-level access control
 * (not exposed publicly — only to internal Prometheus scraper).
 */
router.get('/', async (_req: Request, res: Response) => {
  // Refresh queue depths
  try {
    const [aiWaiting, calcWaiting] = await Promise.all([
      aiQueue.getWaitingCount(),
      calcQueue.getWaitingCount(),
    ]);
    aiQueueDepth.set({ queue: QUEUE_NAMES.AI }, aiWaiting);
    aiQueueDepth.set({ queue: QUEUE_NAMES.CALC }, calcWaiting);
  } catch {
    // Non-fatal — continue serving metrics even if queue depth fails
  }

  const metrics = await registry.metrics();
  res.set('Content-Type', registry.contentType);
  res.end(metrics);
});

export { registry };
export default router;

