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

    // 3. Fallback to approved standard subcategory aliases (e.g. STEEL -> STEEL_PRIMARY, PAPER -> PAPER_VIRGIN)
    const SUBCAT_ALIASES: Record<string, string[]> = {
      STEEL: ['STEEL_PRIMARY', 'STEEL_RECYCLED'],
      PAPER: ['PAPER_VIRGIN', 'PAPER_RECYCLED'],
      ALUMINUM: ['ALUMINUM_PRIMARY', 'ALUMINUM_RECYCLED'],
      ALUMINIUM: ['ALUMINUM_PRIMARY', 'ALUMINUM_RECYCLED'],
      PLASTIC: ['PLASTIC_HDPE', 'PLASTIC_PET', 'PLASTIC_LDPE', 'PLASTIC_PP'],
      CEMENT: ['CEMENT_PORTLAND'],
      WOOD: ['TIMBER'],
      DIESEL: ['DIESEL', 'DIESEL_GALLON'],
      PETROL: ['PETROL'],
      GASOLINE: ['PETROL'],
      NATURAL_GAS: ['NATURAL_GAS', 'NATURAL_GAS_M3', 'NATURAL_GAS_MMBTU', 'NATURAL_GAS_THERMS'],
      FREIGHT: ['ROAD_HEAVY_TRUCK'],
      ROAD_FREIGHT: ['ROAD_HEAVY_TRUCK'],
      AIR_FREIGHT: ['AIR_FREIGHT', 'AIR_FREIGHT_LONG', 'AIR_FREIGHT_SHORT'],
      OCEAN_FREIGHT: ['OCEAN_CONTAINER', 'OCEAN_FREIGHT'],
      RAIL_FREIGHT: ['RAIL_DIESEL', 'RAIL_ELECTRIC'],
      GRID: ['US_GRID', 'IN_GRID', 'EU_GRID', 'GLOBAL_AVG'],
    };

    if (matches.length === 0 && SUBCAT_ALIASES[criteria.subCategory]) {
      for (const alias of SUBCAT_ALIASES[criteria.subCategory]) {
        matches = await this.prisma.emissionFactor.findMany({
          where: {
            category: criteria.category,
            subCategory: alias,
            effectiveFrom: { lte: asOfDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
          },
          orderBy: { version: 'desc' },
        });
        if (matches.length > 0) break;
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Check for ambiguous factor matches in same version/set
    if (criteria.subCategory) {
      const topVersion = matches[0].version;
      const sameSubCatMatches = matches.filter(
        (m) => m.version === topVersion && m.subCategory === criteria.subCategory && m.region === matches[0].region
      );

      if (sameSubCatMatches.length > 1) {
        throw new AmbiguousFactorError(criteria.category, criteria.subCategory, matches[0].region);
      }
    }

    return matches[0];
  }
}
