import { ForecastRepository } from './forecast.repository';
import { FeatureFlagService, FLAG_KEYS } from '../../services/feature-flag.service';
import { NotificationService } from '../../services/notification.service';
import { env } from '../../config/env.schema';
import { createLogger } from '../../core/logging/logger';
import { MlModelStatus, MlModelType, NotificationType } from '@prisma/client';

const logger = createLogger('ForecastService');

export interface ForecastResponsePayload {
  status: 'SUCCESS' | 'INSUFFICIENT_HISTORY' | 'DISABLED' | 'UNAVAILABLE';
  monthsAvailable: number;
  minMonthsRequired: number;
  organizationId: string;
  currentActualCo2e?: number;
  historyPoints?: {
    month: string;
    co2e: number;
    docCount: number;
  }[];
  forecast?: {
    predictedMonth: string;
    predictedCo2e: number;
    lowerBound80?: number;
    upperBound80?: number;
    lowerBound95?: number;
    upperBound95?: number;
    confidenceScore: number;
    confidenceLabel: string;
    trendDirection: string;
    scopeBreakdown?: {
      scope1: number;
      scope2: number;
      scope3: number;
    };
    scenarios?: {
      businessAsUsual?: number;
      sbti15cTarget?: number;
      acceleratedNetZero?: number;
      conservative?: number;
      aggressive?: number;
    };
  }[];
  modelInfo?: {
    modelType: string;
    version: number;
    mape?: number;
    mae?: number;
    rmse?: number;
    wape?: number;
    smape?: number;
    bias?: number;
    r2?: number;
    featureImportance?: Record<string, number>;
  };
  dataQuality?: {
    historicalPeriods: number;
    missingPeriods: number;
    dataCoveragePct: number;
    totalRecords: number;
  };
  eligibility?: any;
  dataDiagnostics?: any;
  sanityReport?: any;
  message?: string;
}

interface MlPredictItem {
  predicted_month: string;
  predicted_co2e: number;
  lower_bound_80?: number;
  upper_bound_80?: number;
  lower_bound_95?: number;
  upper_bound_95?: number;
  confidence_score: number;
  confidence_label: string;
  trend_direction: string;
  is_sanity_checked?: boolean;
  scope_breakdown?: {
    scope1: number;
    scope2: number;
    scope3: number;
  };
  scenarios?: {
    business_as_usual: number;
    sbti_1_5c_target: number;
    accelerated_net_zero: number;
  };
}

interface MlPredictResponse {
  success: boolean;
  predictions: MlPredictItem[];
  model_type: string;
  current_month_actual: number;
  feature_importance?: Record<string, number>;
  mae?: number;
  rmse?: number;
  r2?: number;
  error?: string;
}

interface MlTrainResponse {
  success: boolean;
  model_type: string;
  version: number;
  promoted: boolean;
  mape?: number;
  rmse?: number;
  feature_importance?: Record<string, number>;
  training_samples: number;
  validation_samples: number;
  duration_ms: number;
  artifact_path?: string;
  error?: string;
}

export class ForecastService {
  constructor(
    private readonly repo: ForecastRepository,
    private readonly flagService: FeatureFlagService,
    private readonly notifService: NotificationService,
  ) {}

  /**
   * Get forecast for an organization
   */
  async getForecast(organizationId: string): Promise<ForecastResponsePayload> {
    // 1. Check feature flag guard
    const isEnabled = await this.flagService.isEnabled(FLAG_KEYS.ENABLE_FORECAST, organizationId);
    if (!isEnabled) {
      return {
        status: 'DISABLED',
        monthsAvailable: 0,
        minMonthsRequired: 1,
        organizationId,
        message: 'ML Carbon Emission Forecasting feature is disabled for this organization.',
      };
    }

    // 2. Count approved historical months & fetch aggregates
    const monthsAvailable = await this.repo.getApprovedMonthCount(organizationId);
    const MIN_MONTHS = 1;

    if (monthsAvailable < MIN_MONTHS) {
      return {
        status: 'INSUFFICIENT_HISTORY',
        monthsAvailable,
        minMonthsRequired: MIN_MONTHS,
        organizationId,
        message: 'Upload at least 1 document to calculate emissions and generate your ML forecast.',
      };
    }

    const monthlyAggs = await this.repo.getMonthlyAggregates(organizationId);
    const historyPoints = monthlyAggs.map((m) => ({
      month: m.month.toISOString(),
      co2e: m.totalCo2e,
      docCount: m.docCount,
    }));
    const lastMonthAgg = monthlyAggs[monthlyAggs.length - 1];
    const currentActualCo2e = lastMonthAgg?.totalCo2e ?? 0;

    // 3. Always invoke live Python ML Forecasting Engine to generate real-time time-series predictions
    try {
      const mlUrl = env.ML_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${mlUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          database_url: env.DATABASE_URL,
          horizon_months: 6,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service returned HTTP ${response.status}`);
      }

      const pData = (await response.json()) as any;

      if (!pData.success || pData.status === 'INSUFFICIENT_DATA' || !pData.predictions || pData.predictions.length === 0) {
        return {
          status: 'INSUFFICIENT_HISTORY',
          monthsAvailable,
          minMonthsRequired: 1,
          organizationId,
          currentActualCo2e,
          historyPoints,
          dataQuality: pData.data_diagnostics ? {
            historicalPeriods: pData.data_diagnostics.monthly_observations,
            missingPeriods: pData.data_diagnostics.missing_periods?.length || 0,
            dataCoveragePct: pData.data_diagnostics.data_quality_score,
            totalRecords: pData.data_diagnostics.total_emission_records,
          } : undefined,
          eligibility: pData.eligibility,
          dataDiagnostics: pData.data_diagnostics,
          message: pData.error || `Insufficient verified historical data (${monthsAvailable} month(s) available, minimum 1 required for baseline projection).`,
        };
      }

      const totalDocs = historyPoints.reduce((acc, h) => acc + h.docCount, 0);

      return {
        status: 'SUCCESS',
        monthsAvailable,
        minMonthsRequired: 1,
        organizationId,
        currentActualCo2e,
        historyPoints,
        forecast: pData.predictions.map((p: any) => ({
          predictedMonth: p.predicted_month,
          predictedCo2e: p.predicted_co2e,
          lowerBound80: p.lower_bound_80,
          upperBound80: p.upper_bound_80,
          lowerBound95: p.lower_bound_95,
          upperBound95: p.upper_bound_95,
          confidenceScore: p.confidence_score,
          confidenceLabel: p.confidence_label,
          trendDirection: p.trend_direction,
          scopeBreakdown: p.scope_breakdown
            ? {
                scope1: p.scope_breakdown.scope1,
                scope2: p.scope_breakdown.scope2,
                scope3: p.scope_breakdown.scope3,
              }
            : undefined,
          scenarios: p.scenarios
            ? {
                conservative: p.scenarios.conservative,
                aggressive: p.scenarios.aggressive,
                sbti15cTarget: p.scenarios.sbti_1_5c_target,
                businessAsUsual: p.scenarios.business_as_usual,
              }
            : undefined,
        })),
        modelInfo: {
          modelType: pData.model_type || 'DRIVER_INFORMED_SHORT_HISTORY',
          version: 1,
          mae: pData.mae,
          rmse: pData.rmse,
          wape: pData.wape,
          smape: pData.smape,
          bias: pData.bias,
          r2: pData.r2,
          featureImportance: pData.feature_importance,
        },
        dataQuality: pData.data_diagnostics ? {
          historicalPeriods: pData.data_diagnostics.monthly_observations,
          missingPeriods: pData.data_diagnostics.missing_periods?.length || 0,
          dataCoveragePct: pData.data_diagnostics.data_quality_score,
          totalRecords: pData.data_diagnostics.total_emission_records,
        } : {
          historicalPeriods: monthsAvailable,
          missingPeriods: 0,
          dataCoveragePct: 100,
          totalRecords: totalDocs,
        },
        eligibility: pData.eligibility,
        dataDiagnostics: pData.data_diagnostics,
        sanityReport: pData.sanity_report,
      };
    } catch (err: any) {
      logger.error({ organizationId, error: err.message }, 'Failed to call ML Service /predict');
      return {
        status: 'UNAVAILABLE',
        monthsAvailable,
        minMonthsRequired: 1,
        organizationId,
        message: 'Forecasting service is temporarily unavailable.',
      };
    }
  }

  /**
   * Trigger model training for an organization
   */
  async triggerTraining(organizationId: string): Promise<{ success: boolean; modelId?: string; error?: string }> {
    const mlUrl = env.ML_SERVICE_URL || 'http://localhost:8000';

    try {
      const trainRes = await fetch(`${mlUrl}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          database_url: env.DATABASE_URL,
        }),
      });

      if (!trainRes.ok) {
        throw new Error(`ML service /train returned HTTP ${trainRes.status}`);
      }

      const data = (await trainRes.json()) as MlTrainResponse;

      if (!data.success) {
        return { success: false, error: data.error || 'Training failed' };
      }

      // Get latest model version number for this org
      const latestModel = await this.repo.getLatestDeployedModel(organizationId);
      const version = (latestModel?.version ?? 0) + 1;
      const modelType = data.model_type === 'BASELINE_TREND' ? MlModelType.BASELINE_TREND : MlModelType.XGBOOST;

      // Save MlModel record
      const model = await this.repo.createModel({
        organizationId,
        modelType,
        status: data.promoted ? MlModelStatus.DEPLOYED : MlModelStatus.EVALUATING,
        version,
        mapeScore: data.mape,
        rmseScore: data.rmse,
        featureImportance: data.feature_importance,
        artifactPath: data.artifact_path,
      });

      // Save training run record
      await this.repo.saveTrainingRun({
        modelId: model.id,
        organizationId,
        monthsUsed: await this.repo.getApprovedMonthCount(organizationId),
        trainingSamples: data.training_samples,
        validationSamples: data.validation_samples,
        mapeScore: data.mape,
        rmseScore: data.rmse,
        promoted: data.promoted,
        durationMs: data.duration_ms,
      });

      if (data.promoted) {
        await this.repo.promoteModel(model.id, organizationId);

        // Fetch predictions and save to DB cache
        const predictRes = await fetch(`${mlUrl}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: organizationId,
            database_url: env.DATABASE_URL,
            artifact_path: data.artifact_path,
            horizon_months: 6,
          }),
        });

        if (predictRes.ok) {
          const pData = (await predictRes.json()) as MlPredictResponse;
          if (pData.success && pData.predictions) {
            await this.repo.savePredictions(
              organizationId,
              model.id,
              pData.predictions.map((p: MlPredictItem) => ({
                predictedMonth: new Date(p.predicted_month),
                predictedCo2e: p.predicted_co2e,
                confidenceScore: p.confidence_score,
                confidenceLabel: p.confidence_label,
                trendDirection: p.trend_direction,
                isSanityChecked: p.is_sanity_checked ?? true,
              })),
            );
            logger.info({ organizationId, count: pData.predictions.length }, 'Saved ML predictions to DB cache');
          }
        }

        // Notify admins about new forecast model promotion
        try {
          const firstUser = await this.repo.getFirstOrgUser(organizationId);
          if (firstUser) {
            await this.notifService.send(
              firstUser.id,
              organizationId,
              NotificationType.FORECAST_READY,
              `New ML emission forecast model (v${version}) has been deployed for your organization.`,
              'CarbonIQ — New Forecast Model Deployed',
            );
          }
        } catch (nErr: any) {
          logger.warn({ organizationId, error: nErr.message }, 'Failed to send FORECAST_READY notification');
        }
      }

      return { success: true, modelId: model.id };
    } catch (err: any) {
      logger.error({ organizationId, error: err.message }, 'ML training trigger failed');
      return { success: false, error: err.message };
    }
  }
}
