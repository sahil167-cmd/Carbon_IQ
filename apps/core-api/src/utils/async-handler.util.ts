import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Express Route Handler Wrapper
 * Wraps an async route handler and forwards any rejected promises to next(err).
 * Without this, unhandled promise rejections in async handlers bypass the error middleware.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     const data = await someService.doWork();
 *     res.json(successResponse(data));
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
