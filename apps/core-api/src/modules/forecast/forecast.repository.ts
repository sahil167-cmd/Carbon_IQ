import { PrismaClient, MlModel, MlModelStatus, MlModelType, MlPrediction } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('ForecastRepository');

export interface MonthlyEmissionsAggregate {
  month: Date;
  scope1: number;
  scope2: number;
  scope3: number;
  totalCo2e: number;
  docCount: number;
  avgActivityValue: number;
}

export class ForecastRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get distinct approved historical months count for an organization
   */
  async getApprovedMonthCount(organizationId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT DATE_TRUNC('month', ce."createdAt")) as count
      FROM calculated_emissions ce
      WHERE ce."organizationId" = ${organizationId} AND ce.co2e > 0
    `;

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Get latest creation/update timestamp of emissions records for an organization
   */
  async getMaxEmissionsTimestamp(organizationId: string): Promise<Date | null> {
    const result = await this.prisma.calculatedEmissions.aggregate({
      where: { organizationId },
      _max: { updatedAt: true, createdAt: true },
    });

    const maxUpdated = result._max.updatedAt;
    const maxCreated = result._max.createdAt;

    if (!maxUpdated) return maxCreated;
    if (!maxCreated) return maxUpdated;
    return maxUpdated > maxCreated ? maxUpdated : maxCreated;
  }

  /**
   * Get monthly emissions aggregate history for an organization
   */
  async getMonthlyAggregates(organizationId: string): Promise<MonthlyEmissionsAggregate[]> {
    const raw = await this.prisma.$queryRaw<
      {
        month: Date;
        scope1: number;
        scope2: number;
        scope3: number;
        totalCo2e: number;
        docCount: bigint;
        avgActivityValue: number;
      }[]
    >`
      SELECT
        DATE_TRUNC('month', ce."createdAt") AS month,
        SUM(CASE WHEN ce.scope = 'SCOPE_1' THEN ce.co2e ELSE 0 END) AS scope1,
        SUM(CASE WHEN ce.scope = 'SCOPE_2' THEN ce.co2e ELSE 0 END) AS scope2,
        SUM(CASE WHEN ce.scope = 'SCOPE_3' THEN ce.co2e ELSE 0 END) AS scope3,
        SUM(ce.co2e) AS "totalCo2e",
        COUNT(DISTINCT ce."documentId") AS "docCount",
        AVG(ce."activityValue") AS "avgActivityValue"
      FROM calculated_emissions ce
      WHERE ce."organizationId" = ${organizationId} AND ce.co2e > 0
      GROUP BY DATE_TRUNC('month', ce."createdAt")
      ORDER BY month ASC
    `;

    return raw.map((r) => ({
      month: new Date(r.month),
      scope1: Number(r.scope1 || 0),
      scope2: Number(r.scope2 || 0),
      scope3: Number(r.scope3 || 0),
      totalCo2e: Number(r.totalCo2e || 0),
      docCount: Number(r.docCount || 0),
      avgActivityValue: Number(r.avgActivityValue || 0),
    }));
  }

  /**
   * Find the currently deployed model for an organization
   */
  async getLatestDeployedModel(organizationId: string): Promise<MlModel | null> {
    return this.prisma.mlModel.findFirst({
      where: {
        organizationId,
        status: MlModelStatus.DEPLOYED,
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Get latest cached predictions for an organization
   */
  async getLatestPredictions(organizationId: string, limit: number = 6): Promise<MlPrediction[]> {
    const latestModel = await this.getLatestDeployedModel(organizationId);
    if (!latestModel) return [];

    return this.prisma.mlPrediction.findMany({
      where: {
        organizationId,
        modelId: latestModel.id,
      },
      orderBy: { predictedMonth: 'asc' },
      take: limit,
    });
  }

  /**
   * Create a new MlModel record
   */
  async createModel(data: {
    organizationId: string;
    modelType: MlModelType;
    status: MlModelStatus;
    version: number;
    mapeScore?: number;
    rmseScore?: number;
    featureImportance?: any;
    artifactPath?: string;
  }): Promise<MlModel> {
    return this.prisma.mlModel.create({
      data: {
        organizationId: data.organizationId,
        modelType: data.modelType,
        status: data.status,
        version: data.version,
        mapeScore: data.mapeScore,
        rmseScore: data.rmseScore,
        featureImportance: data.featureImportance,
        artifactPath: data.artifactPath,
        trainedAt: new Date(),
      },
    });
  }

  /**
   * Promote a model to DEPLOYED status and retire existing deployed models
   */
  async promoteModel(modelId: string, organizationId: string): Promise<void> {
    await this.prisma.$transaction([
      // Retire existing deployed models
      this.prisma.mlModel.updateMany({
        where: {
          organizationId,
          status: MlModelStatus.DEPLOYED,
        },
        data: { status: MlModelStatus.RETIRED },
      }),
      // Promote target model
      this.prisma.mlModel.update({
        where: { id: modelId },
        data: { status: MlModelStatus.DEPLOYED },
      }),
    ]);
  }

  /**
   * Save a training run record
   */
  async saveTrainingRun(data: {
    modelId: string;
    organizationId: string;
    monthsUsed: number;
    trainingSamples: number;
    validationSamples: number;
    mapeScore?: number;
    rmseScore?: number;
    promoted: boolean;
    durationMs?: number;
    errorMessage?: string;
  }) {
    return this.prisma.mlTrainingRun.create({
      data,
    });
  }

  /**
   * Save predictions for an organization
   */
  async savePredictions(
    organizationId: string,
    modelId: string,
    predictions: {
      predictedMonth: Date;
      predictedCo2e: number;
      confidenceScore: number;
      confidenceLabel: string;
      trendDirection: string;
      featureImportance?: any;
      isSanityChecked: boolean;
    }[],
  ) {
    // Delete existing predictions for this model
    await this.prisma.mlPrediction.deleteMany({
      where: { organizationId, modelId },
    });

    // Create new predictions
    return this.prisma.mlPrediction.createMany({
      data: predictions.map((p) => ({
        organizationId,
        modelId,
        predictedMonth: p.predictedMonth,
        predictedCo2e: p.predictedCo2e,
        confidenceScore: p.confidenceScore,
        confidenceLabel: p.confidenceLabel,
        trendDirection: p.trendDirection,
        featureImportance: p.featureImportance,
        isSanityChecked: p.isSanityChecked,
      })),
    });
  }

  /**
   * Get first user belonging to an organization
   */
  async getFirstOrgUser(organizationId: string) {
    return this.prisma.user.findFirst({
      where: { organizationId },
    });
  }
}
