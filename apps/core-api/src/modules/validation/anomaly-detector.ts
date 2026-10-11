import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('HistoricalAnomalyDetector');

export interface AnomalyCheckInput {
  organizationId: string;
  siteId: string;
  category: string;
  activityValue: number;
  activityUnit: string;
  co2eKg: number;
}

export interface AnomalyIssue {
  code: string;
  severity: 'WARNING' | 'REVIEW_RECOMMENDED';
  message: string;
  multiplier?: number;
}

export class HistoricalAnomalyDetector {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Compare activity & emissions against historical verified periods for the organization/site.
   * Detects 10x, 100x, 1000x magnitude shifts and OCR decimal errors.
   */
  public async detectAnomalies(input: AnomalyCheckInput): Promise<AnomalyIssue[]> {
    const issues: AnomalyIssue[] = [];

    // Query historical calculated emissions for same org and site
    const pastRecords = await this.prisma.calculatedEmissions.findMany({
      where: {
        organizationId: input.organizationId,
        siteId: input.siteId,
        validationStatus: 'VERIFIED',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (pastRecords.length === 0) return issues;

    // Calculate historical mean activity value
    const sumVal = pastRecords.reduce((acc, r) => acc + r.activityValue, 0);
    const avgVal = sumVal / pastRecords.length;

    if (avgVal <= 0) return issues;

    const ratio = input.activityValue / avgVal;

    // Detect 10x, 100x, 1000x OCR magnitude errors
    if (ratio >= 8.0) {
      const multiplier = ratio >= 800 ? 1000 : ratio >= 80 ? 100 : 10;
      issues.push({
        code: 'HISTORICAL_MAGNITUDE_SHIFT',
        severity: 'REVIEW_RECOMMENDED',
        multiplier,
        message: `Potential ${multiplier}x OCR magnitude error detected: current activity (${input.activityValue.toLocaleString()} ${input.activityUnit}) is ${ratio.toFixed(1)}x higher than historical site baseline (${Math.round(avgVal).toLocaleString()} ${input.activityUnit}).`,
      });
      logger.warn(
        { orgId: input.organizationId, siteId: input.siteId, ratio, multiplier },
        'Historical magnitude shift anomaly flagged'
      );
    } else if (ratio <= 0.05 && input.activityValue > 0) {
      issues.push({
        code: 'HISTORICAL_MAGNITUDE_DROP',
        severity: 'WARNING',
        message: `Current activity (${input.activityValue.toLocaleString()}) is significantly lower (${(ratio * 100).toFixed(1)}%) than historical site average (${Math.round(avgVal).toLocaleString()}).`,
      });
    }

    return issues;
  }
}
