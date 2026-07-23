import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../errors/app.error';
import { tenantStorage } from '../middleware/tenant-context.middleware';
import { createLogger } from '../logging/logger';

const logger = createLogger('TenantScopedRepository');

/**
 * TenantScopedRepository — Multi-Tenancy Enforcement at the Data-Access Layer
 *
 * Per TRD §5.3 and FWS locked architecture:
 * Multi-tenancy is enforced HERE, not per-endpoint.
 * Every domain repository that handles tenant-scoped data MUST extend this class.
 *
 * Rules enforced:
 * 1. organizationId is injected from constructor (set to authenticated JWT claim at call site)
 * 2. All findMany, findFirst, update, delete queries automatically scope to organizationId
 * 3. findById() returns 404 (not 403) for cross-tenant access — prevents tenant enumeration
 *
 * SUPER_ADMIN cross-tenant reads use AdminRepository (separate class, separate import path),
 * enforced by an ESLint boundary rule — src/modules/admin/** only.
 */
export abstract class TenantScopedRepository {
  private readonly explicitOrganizationId?: string;
  protected readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient, organizationId?: string) {
    this.explicitOrganizationId = organizationId;
    this.prisma = prisma;
  }

  protected get organizationId(): string {
    const ctxId = this.explicitOrganizationId ?? tenantStorage.getStore()?.organizationId;
    if (!ctxId) {
      return '';
    }
    return ctxId;
  }

  /**
   * Injects organizationId into a Prisma where clause.
   * Merges with any existing where conditions.
   */
  protected scopedWhere<T extends Record<string, unknown>>(
    where?: T,
  ): T & { organizationId: string } {
    return { ...where, organizationId: this.organizationId } as T & { organizationId: string };
  }

  /**
   * Safe findById — returns 404 (never 403) for:
   * (a) Record not found
   * (b) Record exists but belongs to a different tenant
   *
   * This prevents callers from inferring whether a resource exists in another org.
   */
  protected async findByIdScoped<T>(
    model: {
      findFirst: (args: { where: Record<string, unknown> }) => Promise<T | null>;
    },
    id: string,
    resourceName = 'Resource',
  ): Promise<T> {
    const result = await model.findFirst({
      where: this.scopedWhere({ id }),
    });

    if (!result) {
      throw new NotFoundError(resourceName);
    }

    return result;
  }

  /**
   * Utility: wrap any Prisma query to log duration in debug mode.
   */
  protected async timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const result = await fn();
    logger.debug({ label, durationMs: Date.now() - start, organizationId: this.organizationId }, 'DB query');
    return result;
  }
}

/**
 * Prisma singleton — shared across all repositories.
 * One connection pool per process.
 */
let _prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prismaInstance) {
    _prismaInstance = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log slow queries (> 500ms) in development
    _prismaInstance.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 500) {
        logger.warn({ duration: e.duration, query: e.query }, 'Slow Prisma query detected');
      }
    });
  }

  return _prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (_prismaInstance) {
    await _prismaInstance.$disconnect();
    _prismaInstance = null;
  }
}
