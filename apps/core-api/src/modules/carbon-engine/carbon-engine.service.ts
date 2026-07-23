import { CarbonEngineRepository } from './carbon-engine.repository';
import { DocumentRepository } from '../document/document.repository';
import { AiCollectorRepository } from '../ai-collector/ai-collector.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { PostgresEmissionFactorProvider, AmbiguousFactorError } from './emission-factor.provider';
import { ShipmentCalcEngine } from './shipment-calc.engine';
import { CalculationResultDTO, EmissionFactorDTO } from './carbon-engine.types';
import { CreateEmissionFactorInput } from './carbon-engine.validator';
import { DocumentStatus, ReportingPeriodStatus, ScopeType } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/app.error';
import { NotificationService } from '../../services/notification.service';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('CarbonEngineService');

export class CarbonEngineService {
  private readonly factorProvider: PostgresEmissionFactorProvider;

  constructor(
    private readonly repo: CarbonEngineRepository,
    private readonly docRepo: DocumentRepository,
    private readonly aiRepo: AiCollectorRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly notifService: NotificationService,
  ) {
    this.factorProvider = new PostgresEmissionFactorProvider(this.repo['prisma']);
  }

  // ===========================================================================
  // 1. Calculate Approved Record (FWS §9.2 & PRD §7)
  // ===========================================================================
  async calculateApprovedRecord(documentId: string, orgId: string): Promise<CalculationResultDTO | null> {
    const doc = (await this.docRepo.findDocumentById(documentId)) as any;
    if (!doc) throw new NotFoundError('Document');

    // Business Rule 1: Validate Period is not LOCKED (FWS §9.4)
    const period = await this.docRepo.findReportingPeriodById(doc.reportingPeriodId);
    if (period && period.status === ReportingPeriodStatus.FINALIZED) {
      throw new ConflictError(
        'Calculations for finalized reporting periods are frozen.',
        'PERIOD_FINALIZED',
      );
    }

    const extracted = await this.aiRepo.findLatestExtractedData(documentId);
    const fields = (extracted?.fieldsJson as Record<string, any>) || doc.manualData || {};

    // Subcategory mapping resolution based on category and extracted fields
    let subCategory = String(fields.fuelType?.value ?? fields.vehicleType?.value ?? fields.materialType?.value ?? 'DIESEL').toUpperCase();

    if (doc.category?.code?.includes('ELECTRICITY')) {
      const country = (doc.site?.country || 'US').toUpperCase();
      if (country === 'US') subCategory = 'US_GRID';
      else if (country === 'IN') subCategory = 'IN_GRID';
      else if (country === 'EU') subCategory = 'EU_GRID';
      else subCategory = 'GRID';
    } else if (doc.category?.code?.includes('TRANSPORT') || doc.category?.code?.includes('ROAD')) {
      subCategory = 'ROAD_HEAVY_TRUCK';
    } else if (doc.category?.code?.includes('OCEAN')) {
      subCategory = 'CONTAINER_SHIP';
    } else if (doc.category?.code?.includes('AIR')) {
      subCategory = 'CARGO_PLANE';
    }

    let factor;
    try {
      factor = await this.factorProvider.resolveFactor({
        category: doc.category.code,
        subCategory,
        region: doc.site.country,
      });

      // Fallback: search without specific subCategory if no exact subcategory match
      if (!factor && subCategory !== 'DIESEL') {
        factor = await this.factorProvider.resolveFactor({
          category: doc.category.code,
          subCategory: 'DIESEL',
          region: doc.site.country,
        });
      }
    } catch (err: any) {
      if (err instanceof AmbiguousFactorError) {
        logger.error({ documentId, subCategory }, 'Ambiguous factor match encountered — setting CALCULATION_BLOCKED');
        await this.docRepo.updateDocumentStatus(documentId, DocumentStatus.CALCULATION_BLOCKED, err.message);
        return null;
      }
      throw err;
    }

    // Business Rule 4: No matching factor sets CALCULATION_BLOCKED
    if (!factor) {
      logger.warn({ documentId, category: doc.category.code, subCategory }, 'No matching emission factor found — setting CALCULATION_BLOCKED');
      await this.docRepo.updateDocumentStatus(
        documentId,
        DocumentStatus.CALCULATION_BLOCKED,
        `No active emission factor found for ${doc.category.code}:${subCategory} in region ${doc.site.country}`,
      );
      return null;
    }

    // Perform pure deterministic calculation execution
    const calcOutput = ShipmentCalcEngine.calculate({
      categoryCode: doc.category.code,
      fields,
      factorValue: factor.factorValue,
      factorUnit: factor.unit,
    });

    const result = await this.repo.saveCalculationResult({
      organizationId: orgId,
      siteId: doc.siteId,
      reportingPeriodId: doc.reportingPeriodId,
      documentId: doc.id,
      emissionFactorId: factor.id,
      scope: calcOutput.scope,
      co2e: calcOutput.co2e,
      co2eLocation: calcOutput.co2eLocation,
      co2eMarket: calcOutput.co2eMarket,
      activityValue: calcOutput.activityValue,
      activityUnit: calcOutput.activityUnit,
      calculationMethod: calcOutput.calculationMethod,
      inputSnapshot: fields,
      factorVersion: factor.version,
      formulaUsed: calcOutput.formulaUsed,
      triggeredBy: 'calcWorker',
    });

    await this.docRepo.updateDocumentStatus(
      doc.id,
      DocumentStatus.APPROVED,
      `Calculated ${calcOutput.co2e} kgCO2e emissions`,
      'calcWorker',
    );

    logger.info(
      { documentId: doc.id, scope: calcOutput.scope, co2e: calcOutput.co2e },
      'Deterministic carbon emissions calculated successfully',
    );

    return {
      id: result.id,
      documentId: result.documentId,
      organizationId: result.organizationId,
      siteId: result.siteId,
      reportingPeriodId: result.reportingPeriodId,
      emissionFactorId: result.emissionFactorId,
      scope: result.scope,
      co2e: result.co2e,
      co2eLocation: result.co2eLocation,
      co2eMarket: result.co2eMarket,
      activityValue: result.activityValue,
      activityUnit: result.activityUnit,
      calculationMethod: result.calculationMethod,
      createdAt: result.createdAt,
    };
  }

  // ===========================================================================
  // 2. Fetch Calculation Audit Trace (PRD §7.11)
  // ===========================================================================
  async getCalculationDetails(idOrDocumentId: string): Promise<any> {
    let result = await this.repo.findCalculatedEmissionsById(idOrDocumentId);
    if (!result) {
      result = await this.repo.findCalculatedEmissionsByDocumentId(idOrDocumentId);
    }
    if (!result) throw new NotFoundError('CalculatedEmissions');

    return result;
  }

  // ===========================================================================
  // 3. Manual Period Recalculation (FWS §9.4 & Plan Phase 8)
  // ===========================================================================
  async recalculatePeriod(userId: string, orgId: string, periodId: string, reason: string): Promise<number> {
    const period = await this.docRepo.findReportingPeriodById(periodId);
    if (!period) throw new NotFoundError('ReportingPeriod');

    if (period.status === ReportingPeriodStatus.LOCKED) {
      throw new ConflictError(
        'Period is locked. Only an Org Admin can unlock a period with an audit-logged reason before recalculating.',
      );
    }

    const { items: approvedDocs } = await this.docRepo.listDocuments({
      reportingPeriodId: periodId,
      status: DocumentStatus.APPROVED,
    }, 1, 1000);

    let recalculatedCount = 0;
    for (const doc of approvedDocs) {
      await this.calculateApprovedRecord(doc.id, orgId);
      recalculatedCount++;
    }

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: orgId,
      action: 'PERIOD_RECALCULATED',
      entityType: 'ReportingPeriod',
      entityId: periodId,
      newValue: { reason },
    });

    logger.info({ periodId, recalculatedCount, userId }, 'Period recalculation complete');

    return recalculatedCount;
  }

  // ===========================================================================
  // 4. Emission Factors Management (SUPER_ADMIN additive versioning)
  // ===========================================================================
  async listEmissionFactors(): Promise<EmissionFactorDTO[]> {
    return this.repo.listEmissionFactors();
  }

  async createEmissionFactor(userId: string, input: CreateEmissionFactorInput): Promise<EmissionFactorDTO> {
    const factor = await this.repo.createEmissionFactor({
      ...input,
      createdBy: userId,
    });

    logger.info({ factorId: factor.id, category: factor.category, version: factor.version }, 'Additive emission factor created');

    return factor;
  }
}
