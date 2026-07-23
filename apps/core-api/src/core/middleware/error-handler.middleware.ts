import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';
import { createLogger } from '../logging/logger';
import { errorResponse } from '../../utils/response.util';

const logger = createLogger('errorHandler');

/**
 * Global Error Handler Middleware
 * Must be the LAST middleware registered in app.ts.
 *
 * Behaviour by error type:
 * - AppError (isOperational=true) → log at 'warn', return structured error envelope
 * - AppError (isOperational=false) → log at 'error' with stack, return 500
 * - Unknown Error → log at 'error' with stack, return 500 (never leak internals)
 *
 * Per TRD §14: 4xx errors logged at 'warn' (no stack). 5xx at 'error' (with stack).
 * Stack traces are NEVER returned to the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    if (err.isOperational) {
      // 4xx / operational errors — warn level, no stack
      logger.warn({
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        path: req.path,
        method: req.method,
      }, 'Operational error');
    } else {
      // 5xx / non-operational — full stack
      logger.error({
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      }, 'Non-operational application error');
    }

    res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details, requestId),
    );
    return;
  }

  // Unknown / unexpected error — never leak internals
  logger.error(
    {
      requestId,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    'Unhandled error',
  );

  res.status(500).json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', undefined, requestId),
  );
}
