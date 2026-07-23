import { Request } from 'express';

/**
 * Express type augmentations for Carbon OS.
 * Extends the Request interface with project-specific properties.
 */
declare global {
  namespace Express {
    interface Request {
      /** UUID attached by requestIdMiddleware — present on every request */
      requestId: string;
      /** Authenticated user — set by authenticate.middleware.ts (Phase 2) */
      user?: {
        id: string;
        email: string;
        role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ORG_MEMBER';
        organizationId: string | null;
      };
    }
  }
}

export {};
