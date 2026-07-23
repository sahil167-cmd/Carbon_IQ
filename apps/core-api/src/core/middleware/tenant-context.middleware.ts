import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant Context — AsyncLocalStorage
 * Holds the authenticated organization ID for the current request lifecycle.
 * Workers read this when it's seeded by the job payload (not HTTP request).
 *
 * This avoids threading organizationId explicitly through every function call.
 * Repositories read it via getTenantId() without it being passed as an argument.
 */
export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant context.
 * Returns null if called outside an authenticated request or worker job.
 */
export function getTenantContext(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Get current organizationId — throws if not in tenant context.
 * Use in repositories/services that REQUIRE tenant scope.
 */
export function requireTenantId(): string {
  const ctx = tenantStorage.getStore();
  if (!ctx?.organizationId) {
    throw new Error(
      'TenantContext not initialized. This function must be called within an authenticated request.',
    );
  }
  return ctx.organizationId;
}

export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const reqAny = req as any;
  if (reqAny.user?.organizationId) {
    tenantStorage.run(
      {
        organizationId: reqAny.user.organizationId,
        userId: reqAny.user.id,
        role: reqAny.user.role,
      },
      next,
    );
  } else {
    next();
  }
}

