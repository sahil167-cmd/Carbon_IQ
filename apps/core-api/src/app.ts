import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env.schema';
import { rootLogger } from './core/logging/logger';
import { requestIdMiddleware } from './core/middleware/request-id.middleware';
import { tenantContextMiddleware } from './core/middleware/tenant-context.middleware';
import { errorHandlerMiddleware } from './core/middleware/error-handler.middleware';
import { notFoundMiddleware } from './core/middleware/not-found.middleware';
import { generalRateLimiter } from './core/middleware/rate-limiter.middleware';
import { aiQueue, calcQueue } from './queues/queue.init';

// Routes
import healthRouter from './routes/health.routes';
import readyRouter from './routes/ready.routes';
import metricsRouter, { metricsMiddleware } from './routes/metrics.routes';
import notificationRouter from './routes/notification.routes';
import authRouter, { orgRouter } from './modules/auth/auth.routes';
import adminAuthRouter from './modules/auth/admin-auth.routes';
import organizationRouter, { industryRouter } from './modules/organization/organization.routes';
import siteRouter from './modules/site/site.routes';
import documentRouter, {
  categoryRouter,
  activityDataRouter,
  periodRouter,
} from './modules/document/document.routes';
import {
  aiExtractionRouter,
  internalAiRouter,
} from './modules/ai-collector/ai-collector.routes';
import validationRouter, {
  reviewQueueRouter,
} from './modules/validation/validation.routes';
import {
  emissionsRouter,
  factorRouter,
  adminFactorRouter,
  internalCalcRouter,
  carbonAuditRouter,
} from './modules/carbon-engine/carbon-engine.routes';
import {
  forecastRouter,
  internalMlRouter,
  adminMlRouter,
} from './modules/forecast/forecast.routes';
import copilotRouter from './modules/copilot/copilot.routes';
import brsrRouter from './modules/brsr/brsr.routes';
import logisticsRouter from './modules/logistics/presentation/logistics.routes';

/**
 * Express Application Factory
 * Creates and configures the Express app.
 * Separated from server.ts to allow Supertest to spin it up without binding a port.
 */
export function createApp(): Application {
  const app = express();

  // Build CORS & frame-ancestors origin list from validated env
  const corsOrigins: string[] = env.WEB_ORIGIN
    ? env.WEB_ORIGIN.split(',').map((o: string) => o.trim()).filter(Boolean)
    : [];

  // Always-allowed origin patterns (regardless of WEB_ORIGIN env var)
  const ALWAYS_ALLOWED_PATTERNS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
    /^https:\/\/carbon-iq[a-z0-9-]*\.vercel\.app$/,
    /^https:\/\/[a-z0-9-]+\.onrender\.com$/,
    /^https:\/\/[a-z0-9-]+\.pages\.dev$/,
    /^https:\/\/[a-z0-9-]+\.netlify\.app$/,
  ];

  const frameAncestors: string[] = [
    "'self'",
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://*.vercel.app',
    'https://vercel.app',
    'https://*.onrender.com',
    'https://*.pages.dev',
    'https://*.netlify.app',
    ...corsOrigins,
  ];

  // ── Security middleware ──────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'frame-ancestors': frameAncestors,
        },
      },
      frameguard: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps, server-to-server)
        if (!origin) return callback(null, true);

        // Always allow localhost, vercel.app, onrender.com, and other deployment patterns
        for (const pattern of ALWAYS_ALLOWED_PATTERNS) {
          if (pattern.test(origin)) return callback(null, true);
        }

        // Allow any explicitly configured WEB_ORIGIN values
        if (corsOrigins.includes(origin)) return callback(null, true);

        // In development: allow everything
        if (env.NODE_ENV !== 'production') return callback(null, true);

        // In production: reject unknown origin gracefully without throwing uncaught server error
        rootLogger.warn({ origin }, 'CORS request rejected from unrecognized origin');
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );


  // ── Parsing ──────────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  // ── Observability & Metrics ───────────────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);

  app.use(
    pinoHttp({
      logger: rootLogger,
      customProps: (req) => ({
        requestId: (req as any).requestId,
      }),
      // Don't log health/ready/metrics endpoints — too noisy
      autoLogging: {
        ignore: (req) =>
          ['/health', '/ready', '/metrics'].includes(req.url ?? ''),
      },
    }),
  );

  // ── Tenant Context ────────────────────────────────────────────────────────────
  // Seeds AsyncLocalStorage when req.user is set by authenticate middleware
  app.use(tenantContextMiddleware);

  // ── Infrastructure Routes (no /api/v1 prefix — spec requirement) ─────────────
  app.use('/health', healthRouter);
  app.use('/ready', readyRouter);
  app.use('/metrics', metricsRouter);

  // ── Bull Board (queue monitoring — Super Admin only in production) ────────────
  if (env.NODE_ENV !== 'production') {
    const bullBoardServerAdapter = new ExpressAdapter();
    bullBoardServerAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(aiQueue) as any, new BullMQAdapter(calcQueue) as any],

      serverAdapter: bullBoardServerAdapter,
    });

    app.use('/admin/queues', bullBoardServerAdapter.getRouter());
    rootLogger.info('Bull Board mounted at /admin/queues (dev only)');
  }

  // ── API v1 Routes ─────────────────────────────────────────────────────────────
  app.use('/api/v1', generalRateLimiter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/org', orgRouter);
  app.use('/api/v1/admin/auth', adminAuthRouter);
  app.use('/api/v1/organizations', organizationRouter);
  app.use('/api/v1/industries', industryRouter);
  app.use('/api/v1/sites', siteRouter);
  app.use('/api/v1/documents', documentRouter);
  app.use('/api/v1/documents', aiExtractionRouter);
  app.use('/api/v1/ai-collector', aiExtractionRouter);
  app.use('/api/v1/documents', validationRouter);
  app.use('/api/v1/review-queue', reviewQueueRouter);
  app.use('/api/v1/emissions', emissionsRouter);
  app.use('/api/v1/emission-factors', factorRouter);
  app.use('/api/v1/admin/emission-factors', adminFactorRouter);
  app.use('/api/v1/internal/calc', internalCalcRouter);
  app.use('/api/v1/carbon', carbonAuditRouter);
  app.use('/api/v1/document-categories', categoryRouter);
  app.use('/api/v1/activity-data', activityDataRouter);
  app.use('/api/v1/reporting-periods', periodRouter);
  app.use('/api/v1/internal/ai', internalAiRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/forecast', forecastRouter);
  app.use('/api/v1/internal/ml', internalMlRouter);
  app.use('/api/v1/admin/ml-models', adminMlRouter);
  app.use('/api/v1/copilot', copilotRouter);
  app.use('/api/v1/brsr', brsrRouter);
  app.use('/api/v1/logistics', logisticsRouter);

  // Future modules mount here (Phase 2+):
  // app.use('/api/v1/auth', authRouter);
  // app.use('/api/v1/organizations', organizationRouter);
  // app.use('/api/v1/sites', siteRouter);
  // app.use('/api/v1/documents', documentRouter);
  // app.use('/api/v1/dashboard', dashboardRouter);
  // app.use('/api/v1/copilot', copilotRouter);
  // app.use('/api/v1/reports', reportRouter);
  // app.use('/api/v1/admin', adminRouter); // Super Admin only

  // ── 404 + Error Handler (must be last) ──────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
