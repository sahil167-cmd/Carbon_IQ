import pino from 'pino';
import { env } from '../../config/env.schema';

/**
 * Pino logger factory.
 * Every module/service/worker creates a child logger via createLogger(moduleName).
 * This ensures every log line includes the `module` field for easy filtering.
 *
 * Log line includes: level, time, requestId (if set), jobId (if set), module, msg
 */

const baseLogger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  // In production, output raw JSON — collected by log aggregator (Loki, CloudWatch, etc.)
  base: {
    env: env.NODE_ENV,
    version: process.env.npm_package_version ?? '0.0.0',
  },
  // Never log sensitive fields
  redact: {
    paths: ['*.password', '*.passwordHash', '*.refreshToken', '*.accessToken', '*.secret'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger bound to a specific module.
 * @param module - module name, e.g. 'ConfigService', 'aiWorker', 'notification.routes'
 */
export function createLogger(module: string) {
  return baseLogger.child({ module });
}

export const rootLogger = baseLogger;
