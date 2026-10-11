import { CarbonEngineRepository } from './carbon-engine.repository';
import { DocumentRepository } from '../document/document.repository';
import { AiCollectorRepository } from '../ai-collector/ai-collector.repository';
import { AiCollectorService } from '../ai-collector/ai-collector.service';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { ConfigService } from '../../services/config.service';
import { OrganizationRepository } from '../organization/organization.repository';
import { PostgresEmissionFactorProvider, AmbiguousFactorError } from './emission-factor.provider';
import { UnitConverter } from './unit-converter';
import { CanonicalActivityNormalizer } from './canonical-activity.normalizer';
import { StrategyRegistry } from './domain/StrategyRegistry';
import { registerAllStrategies } from './domain/strategies';
import { CalculationResultDTO, EmissionFactorDTO } from './carbon-engine.types';
import { CreateEmissionFactorInput } from './carbon-engine.validator';
import { DocumentStatus, ReportingPeriodStatus, ScopeType } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../core/errors/app.error';
import { NotificationService } from '../../services/notification.service';
import { createLogger } from '../../core/logging/logger';
import { Decimal } from 'decimal.js';

const logger = createLogger('CarbonEngineService');

function extractNumericField(fields: Record<string, any>, keys: string[]): number {
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null) {
      const v = fields[k]?.value ?? fields[k];
      const num = Number(String(v).replace(/,/g, '').trim());
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

function extractStringField(fields: Record<string, any>, keys: string[]): string | null {
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null) {
      const v = fields[k]?.value ?? fields[k];
      if (v) return String(v).trim();
    }
  }
  return null;
}

// Run Strategy Registry registration
registerAllStrategies();

export class CarbonEngineService {
  private readonly factorProvider: PostgresEmissionFactorProvider;
  private readonly unitConverter: UnitConverter;

  constructor(
    private readonly repo: CarbonEngineRepository,
    private readonly docRepo: DocumentRepository,
    private readonly aiRepo: AiCollectorRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly notifService: NotificationService,
  ) {
    const prisma = this.repo['prisma'];
    this.factorProvider = new PostgresEmissionFactorProvider(prisma);
    this.unitConverter = new UnitConverter(prisma);
  }

  // ===========================================================================
  // 1. Calculate Approved Record (FWS §9.2 & PRD §7)
  // ===========================================================================
  async calculateApprovedRecord(documentId: string, orgId: string): Promise<CalculationResultDTO | null> {
    const doc = (await this.docRepo.findDocumentById(documentId)) as any;
    if (!doc) throw new NotFoundError('Document');

    // Business Rule 1: Validate Period is not LOCKED or FINALIZED (FWS §9.4)
    const period = await this.docRepo.findReportingPeriodById(doc.reportingPeriodId);
    if (period && (period.status === ReportingPeriodStatus.FINALIZED || period.status === ReportingPeriodStatus.LOCKED)) {
      throw new ConflictError(
        'Calculations for finalized or locked reporting periods are frozen.',
        'PERIOD_FROZEN',
      );
    }

    const categoryCode = doc.category.code;
    const mapping = await this.repo.findActivityTypeMapping(categoryCode);

    if (!mapping) {
      const errorMsg = `No activity mapping configured for category code ${categoryCode}`;
      logger.warn({ documentId, categoryCode }, errorMsg);
      await this.docRepo.updateDocumentStatus(
        documentId,
        DocumentStatus.NEEDS_REVIEW,
        errorMsg,
        'calcWorker',
      );
      return null;
    }

    let extracted = await this.aiRepo.findLatestExtractedData(documentId);
    if (!extracted || !extracted.fieldsJson || Object.keys(extracted.fieldsJson as object).length === 0) {
      try {
        const flagService = new FeatureFlagService(this.repo['prisma']);
        const configService = new ConfigService(this.repo['prisma']);
        const aiService = new AiCollectorService(this.aiRepo, this.docRepo, this.orgRepo, flagService, configService);
        await aiService.processDocumentExtraction(documentId, orgId);
        extracted = await this.aiRepo.findLatestExtractedData(documentId);
      } catch (err: any) {
        logger.warn({ documentId, error: err.message }, 'On-the-fly AI extraction executed during calculation');
      }
    }

    const rawExtracted = (extracted?.fieldsJson as Record<string, any>) || {};
    const manualFields = (doc.manualData as Record<string, any>) || {};
    const fields = { ...rawExtracted, ...manualFields };

    // 1. Universal Canonical Activity Normalization Layer
    const canonical = CanonicalActivityNormalizer.normalize({
      categoryCode,
      fields,
      siteCountry: doc.site?.country,
      rawText: (extracted as any)?.rawText,
    });

    if (canonical.needsReview) {
      const errorMsg = canonical.blockReason || 'Activity data requires human review';
      logger.warn({ documentId, categoryCode }, errorMsg);
      await this.docRepo.updateDocumentStatus(documentId, DocumentStatus.NEEDS_REVIEW, errorMsg, 'calcWorker');
      return null;
    }

    const subCategory = canonical.subCategory;

    // 2. Resolve Emission Factor using Postgres provider
    let factor;
    try {
      factor = await this.factorProvider.resolveFactor({
        category: canonical.category,
        subCategory,
        region: canonical.region,
      });

      // Strict Factor Resolution (No generic GENERAL or cross-category fallbacks)
      if (!factor) {
        factor = await this.factorProvider.resolveFactor({
          category: canonical.category,
          subCategory,
          region: 'GLOBAL',
        });
      }
    } catch (err: any) {
      if (err instanceof AmbiguousFactorError) {
        logger.error({ documentId, subCategory }, 'Ambiguous factor match encountered — setting NEEDS_REVIEW');
        await this.docRepo.updateDocumentStatus(documentId, DocumentStatus.NEEDS_REVIEW, err.message, 'calcWorker');
        return null;
      }
      throw err;
    }

    if (!factor) {
      const errorMsg = `No active approved emission factor found for ${canonical.category}:${subCategory} in region ${canonical.region}`;
      logger.warn({ documentId, category: canonical.category, subCategory }, errorMsg);
      await this.docRepo.updateDocumentStatus(
        documentId,
        DocumentStatus.NEEDS_REVIEW,
        errorMsg,
        'calcWorker',
      );
      return null;
    }

    // 3. Extract quantity & unit values for conversion with flexible field aliases
    const rawQty: number = canonical.quantity;
    const rawUnit: string = canonical.unit || factor.unit;

    const rawWeightNum = extractNumericField(fields, ['weightKg', 'weight', 'weightTons', 'weightTonnes', 'cargoWeight', 'totalWeight']);
    const rawDistanceNum = extractNumericField(fields, ['distanceKm', 'distance', 'distanceMiles', 'miles', 'km', 'totalDistance']);
    const isWeightDistanceMode = (mapping.strategyKey === 'WEIGHT_DISTANCE_FACTOR') || (rawWeightNum > 0 && rawDistanceNum > 0);

    // ── INTEGRATION-LAYER DIMENSIONAL COMPATIBILITY GUARD ────────────────────
    // Enforce physical dimension integrity between extracted activity and resolved factor:
    // 1. TONNE_KM / TKM activity must ONLY match TONNE_KM / TKM factors (never liquid volume LITERS or energy KWH).
    // 2. Volume activity (LITERS, GALLONS, M3) must ONLY match volume factors.
    // 3. Energy activity (KWH, MWH, MMBTU, THERMS) must ONLY match energy factors.
    // 4. Mass activity (KG, TONNES, LBS) must ONLY match mass factors.
    const normalizedRawUnit = this.unitConverter.normalizeUnit(rawUnit);
    const normalizedFactorUnit = this.unitConverter.normalizeUnit(factor.unit);

    const isTransportUnit = ['TONNE_KM', 'TEU_KM', 'TON_MILE', 'PKM', 'PASSENGER_MILE'].includes(normalizedRawUnit);
    const isFactorTransportUnit = ['TONNE_KM', 'TEU_KM', 'TON_MILE', 'PKM', 'PASSENGER_MILE'].includes(normalizedFactorUnit);

    const isVolumeUnit = ['LITERS', 'GALLONS', 'GALLONS_UK', 'BBL', 'M3'].includes(normalizedRawUnit);
    const isFactorVolumeUnit = ['LITERS', 'GALLONS', 'GALLONS_UK', 'BBL', 'M3'].includes(normalizedFactorUnit);

    const isEnergyUnit = ['KWH', 'MWH', 'THERMS', 'MMBTU', 'GJ', 'CCF', 'MCF'].includes(normalizedRawUnit);
    const isFactorEnergyUnit = ['KWH', 'MWH', 'THERMS', 'MMBTU', 'GJ', 'CCF', 'MCF'].includes(normalizedFactorUnit);

    const isMassUnit = ['KG', 'TONNES', 'LBS', 'SHORT_TONS', 'LONG_TONS', 'OZ'].includes(normalizedRawUnit);
    const isFactorMassUnit = ['KG', 'TONNES', 'LBS', 'SHORT_TONS', 'LONG_TONS', 'OZ'].includes(normalizedFactorUnit);

    let hasDimensionalMismatch = false;
    let mismatchReason = '';

    if (isTransportUnit && !isFactorTransportUnit) {
      hasDimensionalMismatch = true;
      mismatchReason = `Dimensional mismatch: Transport activity (${rawUnit}) cannot be calculated using non-transport factor (${factor.unit})`;
    } else if (isVolumeUnit && !isFactorVolumeUnit && !isMassUnit) {
      hasDimensionalMismatch = true;
      mismatchReason = `Dimensional mismatch: Liquid volume activity (${rawUnit}) cannot be calculated using non-volume factor (${factor.unit})`;
    } else if (isEnergyUnit && !isFactorEnergyUnit) {
      hasDimensionalMismatch = true;
      mismatchReason = `Dimensional mismatch: Energy activity (${rawUnit}) cannot be calculated using non-energy factor (${factor.unit})`;
    } else if (isMassUnit && !isFactorMassUnit && !isTransportUnit) {
      hasDimensionalMismatch = true;
      mismatchReason = `Dimensional mismatch: Mass activity (${rawUnit}) cannot be calculated using non-mass factor (${factor.unit})`;
    }

    if (hasDimensionalMismatch) {
      logger.error({ documentId, rawUnit, factorUnit: factor.unit }, mismatchReason);
      await this.docRepo.updateDocumentStatus(
        documentId,
        DocumentStatus.CALCULATION_BLOCKED,
        mismatchReason,
        'calcWorker',
      );
      return null;
    }

    // ── ZERO-QUANTITY GUARD ──────────────────────────────────────────────────
    // If AI extraction failed to extract any numeric value, do NOT produce a
    // false 0 kgCO₂e calculation that would corrupt aggregates and forecasts.
    if (rawQty === 0 && !isWeightDistanceMode && mapping.strategyKey !== 'EMPLOYEE_COMMUTE') {
      const isManualEntry = doc.source === 'MANUAL';
      if (!isManualEntry) {
        const errorMsg = `Zero activity quantity detected — AI extraction likely failed to extract numeric values from document fields. Raw fields: ${JSON.stringify(Object.keys(fields))}`;
        logger.warn({ documentId, categoryCode, fields: Object.keys(fields) }, errorMsg);
        await this.docRepo.updateDocumentStatus(
          documentId,
          DocumentStatus.CALCULATION_BLOCKED,
          errorMsg,
          'calcWorker',
        );
        return null;
      }
    }

    // 4. Calculate using pure Decimal Strategies
    let co2eValue: Decimal;
    let co2eLocation: Decimal | null = null;
    let co2eMarket: Decimal | null = null;
    let convertedQty: Decimal;

    let scope: ScopeType;
    if (factor.category.includes('STATIONARY') || factor.category.includes('MOBILE') || factor.category.includes('FUGITIVE')) {
      scope = ScopeType.SCOPE_1;
    } else if (factor.category.includes('ELECTRICITY') || factor.category.includes('RENEWABLE')) {
      scope = ScopeType.SCOPE_2;
    } else {
      scope = ScopeType.SCOPE_3;
    }

    try {
      if (categoryCode.includes('ELECTRICITY') || categoryCode.includes('RENEWABLE')) {
        convertedQty = await this.unitConverter.convert(new Decimal(rawQty), rawUnit, factor.unit);
        
        // Dual-Reporting
        const locationStrategy = StrategyRegistry.get('ELEC_LOCATION');
        co2eLocation = locationStrategy.calculate(
          { value: convertedQty, unit: factor.unit, fields },
          new Decimal(factor.factorValue || 0.255),
        );

        if (categoryCode.includes('RENEWABLE') || fields.recVerification?.value === true || fields.recVerification === true) {
          co2eMarket = new Decimal(0); // Renewable energy / RECs have 0 market-based emissions
        } else {
          co2eMarket = co2eLocation;
        }

        co2eValue = co2eLocation;
      } else {
        if (isWeightDistanceMode) {
          const rawWeightVal = rawWeightNum > 0 ? rawWeightNum : rawQty;
          let weightTonnes = rawWeightVal >= 1000 ? rawWeightVal / 1000 : rawWeightVal;
          const distKm = rawDistanceNum > 0 ? rawDistanceNum : 1;
          const tonneKm = weightTonnes * distKm;
          convertedQty = new Decimal(tonneKm);
          co2eValue = convertedQty.mul(new Decimal(factor.factorValue || 0.0921));
        } else {
          convertedQty = await this.unitConverter.convert(new Decimal(rawQty), rawUnit, factor.unit);
          const basicStrategy = StrategyRegistry.get(mapping.strategyKey);
          co2eValue = basicStrategy.calculate(
            { value: convertedQty, unit: factor.unit, fields },
            new Decimal(factor.factorValue),
          );
        }
      }
    } catch (err: any) {
      const errorMsg = `Calculation strategy error: ${err.message}`;
      logger.error({ documentId, error: err.message }, errorMsg);
      await this.docRepo.updateDocumentStatus(
        documentId,
        DocumentStatus.NEEDS_REVIEW,
        errorMsg,
        'calcWorker',
      );
      return null;
    }

    const co2e = Number(co2eValue.toFixed(4));
    const activityValue = Number(convertedQty.toFixed(4));
    const co2eLocNum = co2eLocation ? Number(co2eLocation.toFixed(4)) : null;
    const co2eMktNum = co2eMarket ? Number(co2eMarket.toFixed(4)) : null;

    const calculationMethod = mapping.strategyKey;
    const tonneVal = (co2e / 1000).toFixed(4);

    let formulaUsed = '';
    if (categoryCode.includes('ELECTRICITY')) {
      formulaUsed = `${rawQty.toLocaleString()} ${rawUnit} × ${factor.factorValue} kgCO₂e/${factor.unit} = ${co2e.toLocaleString()} kg CO₂e (${tonneVal} t CO₂e)`;
    } else if (mapping.strategyKey === 'WEIGHT_DISTANCE_FACTOR') {
      const rawWeightNum = extractNumericField(fields, ['weightKg', 'weight', 'weightTons', 'weightTonnes', 'cargoWeight', 'totalWeight', 'quantity']);
      const rawDistanceNum = extractNumericField(fields, ['distanceKm', 'distance', 'distanceMiles', 'miles', 'km', 'totalDistance']);
      let weightTonnes = rawWeightNum >= 1000 ? rawWeightNum / 1000 : rawWeightNum;
      formulaUsed = `${weightTonnes.toLocaleString()} Tonnes × ${(rawDistanceNum || 1).toLocaleString()} Km = ${activityValue.toLocaleString()} Tonne-Km × ${factor.factorValue} kgCO₂e/Tonne-Km = ${co2e.toLocaleString()} kg CO₂e (${tonneVal} t CO₂e)`;
    } else {
      if (rawUnit.toUpperCase() !== factor.unit.toUpperCase()) {
        formulaUsed = `${rawQty.toLocaleString()} ${rawUnit} (converted to ${activityValue.toLocaleString()} ${factor.unit}) × ${factor.factorValue} kgCO₂e/${factor.unit} = ${co2e.toLocaleString()} kg CO₂e (${tonneVal} t CO₂e)`;
      } else {
        formulaUsed = `${activityValue.toLocaleString()} ${factor.unit} × ${factor.factorValue} kgCO₂e/${factor.unit} = ${co2e.toLocaleString()} kg CO₂e (${tonneVal} t CO₂e)`;
      }
    }

    // 5. Save Calculated Emission record in transactional db
    const result = await this.repo.saveCalculationResult({
      organizationId: orgId,
      siteId: doc.siteId,
      reportingPeriodId: doc.reportingPeriodId,
      documentId: doc.id,
      emissionFactorId: factor.id,
      scope,
      co2e,
      co2eLocation: co2eLocNum,
      co2eMarket: co2eMktNum,
      activityValue,
      activityUnit: factor.unit,
      calculationMethod,
      inputSnapshot: fields,
      factorVersion: factor.version,
      formulaUsed,
      formulaVersion: `${factor.sourceSet}_v${factor.version}`,
      triggeredBy: 'calcWorker',
    });

    const nextDocStatus = DocumentStatus.APPROVED;
    await this.docRepo.updateDocumentStatus(
      doc.id,
      nextDocStatus,
      `Calculated ${co2e} kgCO2e emissions (${tonneVal} tCO2e)`,
      'calcWorker',
    );

    // Synchronous Fire-and-Forget Notification Event Seam (FWS §9.1)
    try {
      const users = await this.orgRepo['prisma'].user.findMany({
        where: { organizationId: orgId, role: 'ORG_ADMIN' },
      });
      for (const u of users) {
        await this.notifService.send(
          u.id,
          orgId,
          'CALCULATION_COMPLETE',
          `Emissions calculated successfully for document ${doc.fileName}: ${co2e} kgCO2e.`,
        );
      }
    } catch (notifErr: any) {
      logger.warn({ error: notifErr.message }, 'Failed to send completion notifications (continuing)');
    }

    // Phase 13 — Structured Pipeline Diagnostic Trace
    logger.info({
      pipelineDiagnostic: {
        document: doc.fileName,
        documentId: doc.id,
        extractedActivity: {
          rawQty,
          rawUnit,
          rawWeight: rawWeightNum || undefined,
          rawDistance: rawDistanceNum || undefined,
        },
        normalizedActivity: {
          scope,
          category: canonical.category,
          activityType: canonical.activityType,
          activityUnit: factor.unit,
          activityQuantity: activityValue,
        },
        factor: {
          id: factor.id,
          subCategory: factor.subCategory,
          value: factor.factorValue,
          unit: factor.unit,
          sourceSet: factor.sourceSet,
          region: factor.region,
        },
        strategy: calculationMethod,
        calculation: formulaUsed,
        result: {
          co2eKg: co2e,
          co2eTonnes: tonneVal,
        },
      }
    }, '=== CARBONIQ PIPELINE DIAGNOSTIC TRACE ===');

    logger.info(
      { documentId: doc.id, scope, co2e },
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
    return result || null;
  }

  // ===========================================================================
  // 3. Manual Period Recalculation (FWS §9.4 & Plan Phase 8)
  // ===========================================================================
  async recalculatePeriod(userId: string, orgId: string, periodId: string, reason: string): Promise<number> {
    const period = await this.docRepo.findReportingPeriodById(periodId);
    if (!period) throw new NotFoundError('ReportingPeriod');

    if (period.status === ReportingPeriodStatus.LOCKED || period.status === ReportingPeriodStatus.FINALIZED) {
      throw new ConflictError(
        'Reporting period is locked or finalized. Only an Org Admin can unlock the period before recalculation.',
        'PERIOD_FROZEN'
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
