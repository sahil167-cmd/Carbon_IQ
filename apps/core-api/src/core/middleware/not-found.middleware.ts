import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../utils/response.util';

/**
 * Not Found Middleware
 * Catches all requests to undefined routes.
 * Returns a 404 with the standard error envelope.
 * Must be registered AFTER all routes but BEFORE the error handler.
 */
export function notFoundMiddleware(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json(
    errorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`, undefined, req.requestId),
  );
}
