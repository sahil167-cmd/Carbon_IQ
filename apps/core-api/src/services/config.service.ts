import { PrismaClient } from '@prisma/client';
import { createLogger } from '../core/logging/logger';

const logger = createLogger('ConfigService');

interface ConfigValue {
  string: string;
  number: number;
  boolean: boolean;
  stringArray: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
}

/**
 * ConfigService — Single source for business-tunable configuration.
 *
 * Modules MUST call configService.get(key) instead of:
 * - Reading process.env directly (use env.schema.ts for deployment secrets)
 * - Hardcoding business numbers inline (AI threshold, upload limits, etc.)
 *
 * Backed by the config_entries table — Super Admin can update via Admin Console
 * (Module 13 wires the UI; this service provides the data layer).
 *
 * Caches values in memory for 60 seconds to avoid DB queries on every request.
 */
export class ConfigService {
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly cacheTtlMs = 60_000; // 60 seconds

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get a config value by key.
   * Returns null if key is not found — callers should provide a default.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value as T;
    }

    const entry = await this.prisma.configEntry.findUnique({ where: { key } });

    if (!entry) {
      logger.warn({ key }, 'ConfigService: key not found in config_entries');
      return null;
    }

    const value = entry.valueJson as T;

    // Cache the result
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });

    return value;
  }

  /**
   * Get with a default value. Never returns null.
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.get<T>(key);
    return value ?? defaultValue;
  }

  /**
   * Update a config entry. Clears the cache for that key.
   * @param updatedBy - userId of the Super Admin performing the update
   */
  async set(key: string, value: unknown, updatedBy?: string): Promise<void> {
    await this.prisma.configEntry.upsert({
      where: { key },
      update: { valueJson: value as any, updatedBy: updatedBy ?? null },
      create: {
        key,
        valueJson: value as any,
        description: `Dynamically set by ${updatedBy ?? 'system'}`,
        updatedBy: updatedBy ?? null,
      },
    });

    // Invalidate cache
    this.cache.delete(key);
    logger.info({ key, updatedBy }, 'ConfigService: config entry updated');
  }

  /**
   * List all config entries (for Admin Console display).
   */
  async listAll() {
    return this.prisma.configEntry.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /** Clear the entire in-memory cache (useful for testing) */
  clearCache(): void {
    this.cache.clear();
  }
}
