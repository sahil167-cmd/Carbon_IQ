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

    // 3. Fallback to approved standard subcategory aliases (bidirectional lookup)
    const SUBCAT_ALIASES: Record<string, string[]> = {
      // Steel & Metals
      STEEL: ['STEEL_PRIMARY', 'STEEL_RECYCLED', 'STEEL'],
      STEEL_PRIMARY: ['STEEL', 'STEEL_PRIMARY', 'STEEL_RECYCLED'],
      STEEL_RECYCLED: ['STEEL', 'STEEL_RECYCLED', 'STEEL_PRIMARY'],
      ALUMINUM: ['ALUMINUM_PRIMARY', 'ALUMINUM_RECYCLED', 'ALUMINIUM', 'ALUMINUM'],
      ALUMINIUM: ['ALUMINUM_PRIMARY', 'ALUMINUM_RECYCLED', 'ALUMINUM', 'ALUMINIUM'],
      ALUMINUM_PRIMARY: ['ALUMINUM', 'ALUMINUM_PRIMARY', 'ALUMINUM_RECYCLED'],
      ALUMINUM_RECYCLED: ['ALUMINUM', 'ALUMINUM_RECYCLED', 'ALUMINUM_PRIMARY'],
      COPPER: ['COPPER'],
      // Materials
      PAPER: ['PAPER_VIRGIN', 'PAPER_RECYCLED', 'PAPER'],
      PAPER_VIRGIN: ['PAPER', 'PAPER_VIRGIN', 'PAPER_RECYCLED'],
      PAPER_RECYCLED: ['PAPER', 'PAPER_RECYCLED', 'PAPER_VIRGIN'],
      PLASTIC: ['PLASTIC_HDPE', 'PLASTIC_PET', 'PLASTIC_LDPE', 'PLASTIC_PP', 'PLASTIC'],
      PLASTIC_HDPE: ['PLASTIC', 'PLASTIC_HDPE', 'PLASTIC_PET'],
      PLASTIC_PET: ['PLASTIC', 'PLASTIC_PET', 'PLASTIC_HDPE'],
      PLASTIC_LDPE: ['PLASTIC', 'PLASTIC_LDPE', 'PLASTIC_HDPE'],
      PLASTIC_PP: ['PLASTIC', 'PLASTIC_PP', 'PLASTIC_HDPE'],
      CEMENT: ['CEMENT_PORTLAND', 'CONCRETE', 'CEMENT'],
      CEMENT_PORTLAND: ['CEMENT', 'CEMENT_PORTLAND', 'CONCRETE'],
      CONCRETE: ['CEMENT_PORTLAND', 'CEMENT', 'CONCRETE'],
      WOOD: ['TIMBER', 'WOOD'],
      TIMBER: ['WOOD', 'TIMBER'],
      // Fuels & Combustion
      DIESEL: ['DIESEL', 'DIESEL_GALLON'],
      DIESEL_GALLON: ['DIESEL', 'DIESEL_GALLON'],
      PETROL: ['PETROL', 'GASOLINE'],
      GASOLINE: ['PETROL', 'GASOLINE'],
      NATURAL_GAS: ['NATURAL_GAS', 'NATURAL_GAS_M3', 'NATURAL_GAS_MMBTU', 'NATURAL_GAS_THERMS', 'NATURAL_GAS_GJ', 'NATURAL_GAS_KWH'],
      NATURAL_GAS_M3: ['NATURAL_GAS', 'NATURAL_GAS_M3', 'NATURAL_GAS_MMBTU'],
      NATURAL_GAS_MMBTU: ['NATURAL_GAS', 'NATURAL_GAS_MMBTU', 'NATURAL_GAS_M3', 'NATURAL_GAS_THERMS'],
      NATURAL_GAS_THERMS: ['NATURAL_GAS', 'NATURAL_GAS_THERMS', 'NATURAL_GAS_MMBTU', 'NATURAL_GAS_M3'],
      NATURAL_GAS_GJ: ['NATURAL_GAS', 'NATURAL_GAS_GJ', 'NATURAL_GAS_MMBTU'],
      NATURAL_GAS_KWH: ['NATURAL_GAS', 'NATURAL_GAS_KWH', 'NATURAL_GAS_MMBTU'],
      LPG: ['LPG'],
      PROPANE: ['PROPANE', 'LPG'],
      // Freight & Transport
      FREIGHT: ['ROAD_HEAVY_TRUCK'],
      ROAD_FREIGHT: ['ROAD_HEAVY_TRUCK'],
      ROAD_HEAVY_TRUCK: ['ROAD_HEAVY_TRUCK', 'FREIGHT', 'ROAD_FREIGHT'],
      ROAD_LIGHT_VAN: ['ROAD_LIGHT_VAN', 'ROAD_HEAVY_TRUCK'],
      AIR_FREIGHT: ['AIR_FREIGHT', 'AIR_FREIGHT_LONG', 'AIR_FREIGHT_SHORT'],
      AIR_FREIGHT_LONG: ['AIR_FREIGHT', 'AIR_FREIGHT_LONG'],
      AIR_FREIGHT_SHORT: ['AIR_FREIGHT', 'AIR_FREIGHT_SHORT'],
      OCEAN_CONTAINER: ['OCEAN_CONTAINER', 'OCEAN_FREIGHT'],
      OCEAN_FREIGHT: ['OCEAN_CONTAINER', 'OCEAN_FREIGHT'],
      RAIL_DIESEL: ['RAIL_DIESEL', 'RAIL_FREIGHT'],
      RAIL_ELECTRIC: ['RAIL_ELECTRIC', 'RAIL_FREIGHT'],
      RAIL_FREIGHT: ['RAIL_DIESEL', 'RAIL_ELECTRIC'],
      // Electricity Grids
      GRID: ['US_GRID', 'IN_GRID', 'EU_GRID', 'GLOBAL_AVG'],
      US_GRID: ['US_GRID', 'GRID', 'GLOBAL_AVG'],
      IN_GRID: ['IN_GRID', 'GRID', 'GLOBAL_AVG'],
      EU_GRID: ['EU_GRID', 'GRID', 'GLOBAL_AVG'],
      GLOBAL_AVG: ['GLOBAL_AVG', 'GRID'],
    };

    if (matches.length === 0) {
      const candidateAliases = [
        ...(SUBCAT_ALIASES[criteria.subCategory] || []),
        ...(criteria.subCategory.includes('_') ? (SUBCAT_ALIASES[criteria.subCategory.split('_')[0]] || []) : []),
      ];
      const uniqueAliases = Array.from(new Set(candidateAliases)).filter((a) => a !== criteria.subCategory);

      for (const alias of uniqueAliases) {
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
