import { PrismaClient, EmissionFactor } from '@prisma/client';
import { ConflictError } from '../../core/errors/app.error';

export class AmbiguousFactorError extends ConflictError {
  constructor(category: string, subCategory: string, region: string) {
    super(
      `Multiple active emission factors matched for ${category}:${subCategory} in region ${region}. Resolving ambiguous matches is prohibited to prevent silent miscalculations.`,
      'AMBIGUOUS_FACTOR_MATCH',
    );
  }
}

export interface FactorResolveCriteria {
  category: string;
  subCategory: string;
  region?: string;
  sourceSet?: string;
  asOfDate?: Date;
}

export interface IEmissionFactorProvider {
  resolveFactor(criteria: FactorResolveCriteria): Promise<EmissionFactor | null>;
}

export class PostgresEmissionFactorProvider implements IEmissionFactorProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async resolveFactor(criteria: FactorResolveCriteria): Promise<EmissionFactor | null> {
    const asOfDate = criteria.asOfDate ?? new Date();
    const region = criteria.region ?? 'GLOBAL';

    // 1. First attempt exact category + subCategory + region match
    let matches = await this.prisma.emissionFactor.findMany({
      where: {
        category: criteria.category,
        subCategory: criteria.subCategory,
        region: region,
        effectiveFrom: { lte: asOfDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
      },
      orderBy: { version: 'desc' },
    });

    // 2. Fallback to GLOBAL region if specific country region factor not found
    if (matches.length === 0 && region !== 'GLOBAL') {
      matches = await this.prisma.emissionFactor.findMany({
        where: {
          category: criteria.category,
          subCategory: criteria.subCategory,
          region: 'GLOBAL',
          effectiveFrom: { lte: asOfDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
        },
        orderBy: { version: 'desc' },
      });
    }

    // 3. Fallback to category-level match if exact subCategory not found
    if (matches.length === 0) {
      matches = await this.prisma.emissionFactor.findMany({
        where: {
          category: criteria.category,
          effectiveFrom: { lte: asOfDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
        },
        orderBy: { version: 'desc' },
      });
    }

    // 4. Fallback for transport/freight category aliases (ROAD_FREIGHT, MOBILE_COMBUSTION)
    if (matches.length === 0 && (criteria.category.includes('TRANSPORT') || criteria.category.includes('FREIGHT'))) {
      matches = await this.prisma.emissionFactor.findMany({
        where: {
          category: 'ROAD_FREIGHT',
          effectiveFrom: { lte: asOfDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
        },
        orderBy: { version: 'desc' },
      });
    }

    if (matches.length === 0) {
      return null; // Zero matches -> caller sets CALCULATION_BLOCKED per FWS §9.2
    }

    // Check for ambiguous factor matches in same version/set (only if subCategory was explicitly specified)
    if (criteria.subCategory) {
      const topVersion = matches[0].version;
      const sameSubCatMatches = matches.filter((m) => m.version === topVersion && m.subCategory === criteria.subCategory);

      if (sameSubCatMatches.length > 1) {
        throw new AmbiguousFactorError(criteria.category, criteria.subCategory, region);
      }
    }

    return matches[0];
  }
}
