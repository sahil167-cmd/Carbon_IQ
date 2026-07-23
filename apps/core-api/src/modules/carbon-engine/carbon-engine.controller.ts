import { Request, Response } from 'express';
import { CarbonEngineService } from './carbon-engine.service';
import { successResponse } from '../../utils/response.util';
import {
  CreateEmissionFactorInput,
  RecalculatePeriodInput,
  InternalCalcInput,
} from './carbon-engine.validator';

import { tenantStorage } from '../../core/middleware/tenant-context.middleware';

export class CarbonEngineController {
  constructor(private readonly engineService: CarbonEngineService) {}

  // ── Service-to-Service Internal Trigger ────────────────────────────────────
  triggerInternalCalc = async (req: Request, res: Response): Promise<void> => {
    const { documentId, organizationId } = req.body as InternalCalcInput;
    const targetOrgId = req.user?.organizationId || organizationId;

    const result = await tenantStorage.run(
      {
        organizationId: targetOrgId,
        userId: req.user?.id || 'system',
        role: req.user?.role || 'ORG_ADMIN',
      },
      () => this.engineService.calculateApprovedRecord(documentId, targetOrgId),
    );

    res.json(
      successResponse(result, { requestId: req.requestId }),
    );
  };

  // ── Get Calculation Audit Details ──────────────────────────────────────────
  getCalculationDetails = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const details = await this.engineService.getCalculationDetails(id);

    res.json(
      successResponse(details, { requestId: req.requestId }),
    );
  };

  // ── Period Recalculate (ORG_ADMIN) ─────────────────────────────────────────
  recalculatePeriod = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const { id: periodId } = req.params;
    const { reason } = req.body as RecalculatePeriodInput;

    const count = await this.engineService.recalculatePeriod(userId, orgId, periodId, reason);

    res.json(
      successResponse(
        { message: `Period recalculation complete (${count} records processed)`, count },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Emission Factors (Public/Org Lookup & Super Admin Additive Creation) ───
  listEmissionFactors = async (req: Request, res: Response): Promise<void> => {
    const factors = await this.engineService.listEmissionFactors();

    res.json(
      successResponse(factors, { requestId: req.requestId }),
    );
  };

  createEmissionFactor = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const input = req.body as CreateEmissionFactorInput;

    const created = await this.engineService.createEmissionFactor(userId, input);

    res.status(201).json(
      successResponse(created, { requestId: req.requestId }),
    );
  };
}
