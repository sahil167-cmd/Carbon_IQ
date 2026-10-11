import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Fallback to local .env if present

import { createApp } from './src/app';
import { env } from './src/config/env.schema';
import { rootLogger } from './src/core/logging/logger';
import { getPrismaClient, disconnectPrisma } from './src/core/repository/tenant-scoped.repository';
import { redisClient } from './src/queues/queue.init';

const app = createApp();
const prisma = getPrismaClient();

async function start(): Promise<void> {
  // Validate DB connection before accepting traffic
  try {
    await prisma.$connect();
    rootLogger.info('PostgreSQL connected');
  } catch (err) {
    rootLogger.error({ err }, 'Failed to connect to PostgreSQL — aborting startup');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    rootLogger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        health: `http://localhost:${env.PORT}/health`,
        ready: `http://localhost:${env.PORT}/ready`,
        metrics: `http://localhost:${env.PORT}/metrics`,
        bullBoard: env.NODE_ENV !== 'production' ? `http://localhost:${env.PORT}/admin/queues` : 'disabled',
      },
      '🚀 CarbonIQ core-api started',
    );
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    rootLogger.info({ signal }, 'Graceful shutdown initiated...');

    server.close(async () => {
      rootLogger.info('HTTP server closed');

      try {
        await disconnectPrisma();
        rootLogger.info('Prisma disconnected');
      } catch (err) {
        rootLogger.error({ err }, 'Error disconnecting Prisma');
      }

      try {
        await redisClient.quit();
        rootLogger.info('Redis disconnected');
      } catch (err) {
        rootLogger.error({ err }, 'Error disconnecting Redis');
      }

      rootLogger.info('Shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      rootLogger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    rootLogger.error({ err: err.message, stack: err.stack }, 'Uncaught exception — shutting down');
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    rootLogger.error({ reason }, 'Unhandled promise rejection — shutting down');
    void shutdown('unhandledRejection');
  });
}

void start();
