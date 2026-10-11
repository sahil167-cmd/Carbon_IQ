import { PrismaClient } from '@prisma/client';
import { createLogger } from '../core/logging/logger';
import { UnprocessableError } from '../core/errors/app.error';
import { ERROR_CODES } from '@carbon-iq/shared-types';

const logger = createLogger('FeatureFlagService');

/** Named flag keys — must match seed.ts */
export const FLAG_KEYS = {
  ENABLE_FORECAST: 'ENABLE_FORECAST',
  ENABLE_RAG: 'ENABLE_RAG',
  ENABLE_COMPLIANCE: 'ENABLE_COMPLIANCE',
  ENABLE_OCR: 'ENABLE_OCR',
  ENABLE_AI_VALIDATION: 'ENABLE_AI_VALIDATION',
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

interface CachedFlag {
  isEnabled: boolean;
  expiresAt: number;
}

/**
 * FeatureFlagService — Per FWS locked architecture and Implementation Plan §5 item 6.
 *
 * Every module with an optional feature MUST call isEnabled() as a guard clause.
 * This allows any feature to be switched off in production without a redeploy.
 *
 * Supported scopes:
 * - GLOBAL: applies to all organizations
 * - ORG: overrides global for a specific organization
 *
 * Resolution order: ORG-scoped flag > GLOBAL flag > default (true)
 *
 * Caches flags for 30 seconds to avoid per-request DB queries.
 */
export class FeatureFlagService {
  private readonly globalCache = new Map<string, CachedFlag>();
  private readonly orgCache = new Map<string, CachedFlag>(); // key: `${flagKey}:${orgId}`
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Check if a feature flag is enabled.
   * @param key - Flag key from FLAG_KEYS
   * @param organizationId - Optional; if provided, checks ORG-scoped override first
   * @returns true if enabled, false if disabled
   */
  async isEnabled(key: FlagKey | string, organizationId?: string): Promise<boolean> {
    // 1. Check ORG-scoped override if organizationId provided
    if (organizationId) {
      const orgResult = await this.getOrgFlag(key, organizationId);
      if (orgResult !== null) return orgResult;
    }

    // 2. Check GLOBAL flag
    return this.getGlobalFlag(key);
  }

  /**
   * Guard: throws UnprocessableError if the flag is disabled.
   * Use at the start of feature-specific service methods.
   */
  async requireEnabled(key: FlagKey | string, organizationId?: string): Promise<void> {
    const enabled = await this.isEnabled(key, organizationId);
    if (!enabled) {
      logger.info({ flag: key, organizationId }, 'Feature flag disabled — request blocked');
      throw new UnprocessableError(
        `Feature '${key}' is currently disabled. Contact your administrator.`,
        ERROR_CODES.FEATURE_DISABLED,
      );
    }
  }

  private async getGlobalFlag(key: string): Promise<boolean> {
    const cached = this.globalCache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.isEnabled;

    const flag = await this.prisma.featureFlag.findFirst({
      where: { key, scope: 'GLOBAL' },
    });

    const isEnabled = flag?.isEnabled ?? true; // Default: enabled if not found
    this.globalCache.set(key, { isEnabled, expiresAt: Date.now() + this.cacheTtlMs });
    return isEnabled;
  }

  private async getOrgFlag(key: string, organizationId: string): Promise<boolean | null> {
    const cacheKey = `${key}:${organizationId}`;
    const cached = this.orgCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.isEnabled;

    const flag = await this.prisma.featureFlag.findFirst({
      where: { key, scope: 'ORG', organizationId },
    });

    if (!flag) return null; // No ORG override — fall through to GLOBAL

    this.orgCache.set(cacheKey, { isEnabled: flag.isEnabled, expiresAt: Date.now() + this.cacheTtlMs });
    return flag.isEnabled;
  }

  /** Set a flag value (Super Admin only — enforced at route level) */
  async setFlag(
    key: string,
    isEnabled: boolean,
    organizationId?: string,
  ): Promise<void> {
    const scope = organizationId ? 'ORG' : 'GLOBAL';

    await this.prisma.featureFlag.upsert({
      where: { key },
      update: { isEnabled },
      create: {
        key,
        isEnabled,
        description: `Flag set programmatically`,
        scope,
        organizationId: organizationId ?? null,
      },
    });

    // Invalidate caches
    this.globalCache.delete(key);
    if (organizationId) this.orgCache.delete(`${key}:${organizationId}`);

    logger.info({ flag: key, isEnabled, scope, organizationId }, 'Feature flag updated');
  }

  clearCache(): void {
    this.globalCache.clear();
    this.orgCache.clear();
  }
}
