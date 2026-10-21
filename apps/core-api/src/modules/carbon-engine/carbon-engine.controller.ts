import { Request, Response } from 'express';
import { CarbonEngineService } from './carbon-engine.service';
import { successResponse } from '../../utils/response.util';
import {
  CreateEmissionFactorInput,
  RecalculatePeriodInput,
  InternalCalcInput,
} from './carbon-engine.validator';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { DocumentStatus } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';
import { tenantStorage } from '../../core/middleware/tenant-context.middleware';

const logger = createLogger('CarbonEngineController');

export class CarbonEngineController {
  constructor(private readonly engineService: CarbonEngineService) {}

  // ── Service-to-Service Internal Trigger ────────────────────────────────────
  // Runs synchronously (no BullMQ queue) — works even when Render workers are
  // not active. This is the path hit when the user clicks "Calculate Emissions Now".
  triggerInternalCalc = async (req: Request, res: Response): Promise<void> => {
    const { documentId, organizationId } = req.body as InternalCalcInput;
    const targetOrgId = req.user?.organizationId || organizationId;
    const userId = req.user?.id || 'system';

    // Step 1: Auto-approve the document so the Canonical Normalizer and
    // emission engine can proceed without being blocked by NEEDS_REVIEW status.
    // This is a deliberate reviewer action (user clicked "Calculate Emissions Now").
    try {
      const prisma = getPrismaClient();
      await prisma.$transaction(async (tx) => {
        const current = await tx.document.findUnique({ where: { id: documentId } });
        await tx.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.APPROVED },
        });
        await tx.documentStatusHistory.create({
          data: {
            documentId,
            fromStatus: current?.status ?? null,
            toStatus: DocumentStatus.APPROVED,
            reason: 'Auto-approved via Calculate Emissions Now (direct synchronous trigger)',
            changedById: userId,
          },
        });
      });
      logger.info({ documentId, userId }, 'Document auto-approved for synchronous calculation');
    } catch (approveErr: any) {
      // Non-fatal: proceed even if the status history write fails
      logger.warn(
        { documentId, error: approveErr.message },
        'Auto-approve status update failed — proceeding with calculation anyway',
      );
    }

    // Step 2: Run synchronous calculation (bypass queue)
    const result = await tenantStorage.run(
      {
        organizationId: targetOrgId,
        userId,
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
