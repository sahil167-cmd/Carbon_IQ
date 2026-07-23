import {
  PrismaClient,
  CalculatedEmissions,
  CalculationLog,
  EmissionsAggregate,
  EmissionFactor,
  ScopeType,
} from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class CarbonEngineRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId);
  }

  // ── Calculated Emissions Operations ─────────────────────────────────────────
  async findCalculatedEmissionsByDocumentId(documentId: string): Promise<CalculatedEmissions | null> {
    return this.prisma.calculatedEmissions.findFirst({
      where: { documentId },
      include: {
        emissionFactor: true,
        calculationLogs: { orderBy: { createdAt: 'desc' } },
        document: { include: { category: true, site: true, reportingPeriod: true } },
      },
    });
  }

  async findCalculatedEmissionsById(id: string): Promise<CalculatedEmissions | null> {
    return this.prisma.calculatedEmissions.findFirst({
      where: this.scopedWhere({ id }),
      include: {
        emissionFactor: true,
        calculationLogs: { orderBy: { createdAt: 'desc' } },
        document: { include: { category: true, site: true, reportingPeriod: true } },
      },
    });
  }

  async saveCalculationResult(data: {
    organizationId: string;
    siteId: string;
    reportingPeriodId: string;
    documentId: string;
    emissionFactorId: string;
    scope: ScopeType;
    co2e: number;
    co2eLocation?: number | null;
    co2eMarket?: number | null;
    activityValue: number;
    activityUnit: string;
    calculationMethod: string;
    inputSnapshot: unknown;
    factorVersion: number;
    formulaUsed: string;
    triggeredBy?: string;
  }): Promise<CalculatedEmissions> {
    return this.prisma.$transaction(async (tx) => {
      const co2eVal = isNaN(data.co2e) ? 0 : data.co2e;
      const activityVal = isNaN(data.activityValue) ? 0 : data.activityValue;
      const co2eLoc = data.co2eLocation && !isNaN(data.co2eLocation) ? data.co2eLocation : null;
      const co2eMkt = data.co2eMarket && !isNaN(data.co2eMarket) ? data.co2eMarket : null;

      const existing = await tx.calculatedEmissions.findFirst({
        where: { documentId: data.documentId },
      });

      let calculated;
      if (existing) {
        calculated = await tx.calculatedEmissions.update({
          where: { id: existing.id },
          data: {
            emissionFactorId: data.emissionFactorId,
            scope: data.scope,
            co2e: co2eVal,
            co2eLocation: co2eLoc,
            co2eMarket: co2eMkt,
            activityValue: activityVal,
            activityUnit: data.activityUnit,
            calculationMethod: data.calculationMethod,
          },
        });
      } else {
        calculated = await tx.calculatedEmissions.create({
          data: {
            organization: { connect: { id: data.organizationId } },
            site: { connect: { id: data.siteId } },
            reportingPeriod: { connect: { id: data.reportingPeriodId } },
            document: { connect: { id: data.documentId } },
            emissionFactor: { connect: { id: data.emissionFactorId } },
            scope: data.scope,
            co2e: co2eVal,
            co2eLocation: co2eLoc,
            co2eMarket: co2eMkt,
            activityValue: activityVal,
            activityUnit: data.activityUnit,
            calculationMethod: data.calculationMethod,
          },
        });
      }

      // Insert immutable audit log entry in calculation_logs
      await tx.calculationLog.create({
        data: {
          calculatedEmissionsId: calculated.id,
          documentId: data.documentId,
          inputSnapshot: data.inputSnapshot as any,
          factorVersion: data.factorVersion,
          formulaVersion: 'v1.0-GLEC-GHG',
          formulaUsed: data.formulaUsed,
          triggeredBy: data.triggeredBy ?? 'calcWorker',
        },
      });

      // Refresh EmissionsAggregate rollup totals
      await this.refreshEmissionsAggregate(tx, data.organizationId, data.siteId, data.reportingPeriodId);

      return calculated;
    });
  }

  // ── Rollup Aggregate Calculations ─────────────────────────────────────────
  private async refreshEmissionsAggregate(
    tx: any,
    organizationId: string,
    siteId: string,
    reportingPeriodId: string,
  ): Promise<EmissionsAggregate> {
    const allCalculations = await tx.calculatedEmissions.findMany({
      where: { organizationId, siteId, reportingPeriodId },
    });

    let scope1Total = 0;
    let scope2LocationTotal = 0;
    let scope2MarketTotal = 0;
    let scope3Total = 0;

    for (const calc of allCalculations) {
      if (calc.scope === ScopeType.SCOPE_1) {
        scope1Total += calc.co2e;
      } else if (calc.scope === ScopeType.SCOPE_2) {
        scope2LocationTotal += calc.co2eLocation ?? calc.co2e;
        scope2MarketTotal += calc.co2eMarket ?? calc.co2e;
      } else if (calc.scope === ScopeType.SCOPE_3) {
        scope3Total += calc.co2e;
      }
    }

    const grandTotal = Number((scope1Total + scope2LocationTotal + scope3Total).toFixed(4));

    return tx.emissionsAggregate.upsert({
      where: {
        organizationId_siteId_reportingPeriodId: {
          organizationId,
          siteId,
          reportingPeriodId,
        },
      },
      update: {
        scope1Total: Number(scope1Total.toFixed(4)),
        scope2LocationTotal: Number(scope2LocationTotal.toFixed(4)),
        scope2MarketTotal: Number(scope2MarketTotal.toFixed(4)),
        scope3Total: Number(scope3Total.toFixed(4)),
        grandTotal,
      },
      create: {
        organizationId,
        siteId,
        reportingPeriodId,
        scope1Total: Number(scope1Total.toFixed(4)),
        scope2LocationTotal: Number(scope2LocationTotal.toFixed(4)),
        scope2MarketTotal: Number(scope2MarketTotal.toFixed(4)),
        scope3Total: Number(scope3Total.toFixed(4)),
        grandTotal,
      },
    });
  }

  // ── Emission Factors Operations ───────────────────────────────────────────
  async listEmissionFactors(): Promise<EmissionFactor[]> {
    return this.prisma.emissionFactor.findMany({
      orderBy: [{ category: 'asc' }, { subCategory: 'asc' }, { version: 'desc' }],
    });
  }

  async createEmissionFactor(data: {
    category: string;
    subCategory: string;
    region?: string;
    factorValue: number;
    unit: string;
    co2eUnit?: string;
    sourceSet?: string;
    createdBy: string;
  }): Promise<EmissionFactor> {
    const region = data.region ?? 'GLOBAL';
    const sourceSet = data.sourceSet ?? 'GLEC_2023';

    // Find latest version number to increment additively (FWS §9.4 Rule 2)
    const latest = await this.prisma.emissionFactor.findFirst({
      where: { category: data.category, subCategory: data.subCategory, region, sourceSet },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    return this.prisma.emissionFactor.create({
      data: {
        category: data.category,
        subCategory: data.subCategory,
        region,
        factorValue: data.factorValue,
        unit: data.unit,
        co2eUnit: data.co2eUnit ?? 'kgCO2e',
        sourceSet,
        version: nextVersion,
        createdBy: data.createdBy,
      },
    });
  }
}
