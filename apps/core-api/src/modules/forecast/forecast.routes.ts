import { Router, Request, Response } from 'express';
import { ForecastService } from './forecast.service';
import { ForecastRepository } from './forecast.repository';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { NotificationService } from '../../services/notification.service';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { successResponse } from '../../utils/response.util';
import { UserRole } from '@prisma/client';

const prisma = getPrismaClient();
const repo = new ForecastRepository(prisma);
const flagService = new FeatureFlagService(prisma);
const notifService = new NotificationService(prisma);
const service = new ForecastService(repo, flagService, notifService);

export const forecastRouter = Router();

/**
 * GET /api/v1/forecast
 * Returns emissions forecast for the user's organization.
 */
forecastRouter.get(
  '/',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER, UserRole.SUPER_ADMIN]),
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = user.organizationId;

    const result = await service.getForecast(organizationId);
    res.json(successResponse(result));
  }),
);

// ── Internal ML Routers ──────────────────────────────────────────────────────
export const internalMlRouter = Router();

/**
 * POST /api/v1/internal/ml/train
 * Trigger model training for an organization
 */
internalMlRouter.post(
  '/train',
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]),
  asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.body;
    const targetOrgId = organizationId || (req as any).user.organizationId;

    const result = await service.triggerTraining(targetOrgId);
    res.json(successResponse(result));
  }),
);

// ── Admin ML Routers ─────────────────────────────────────────────────────────
export const adminMlRouter = Router();

/**
 * GET /api/v1/admin/ml-models
 * List ML models across organizations (Super Admin only)
 */
adminMlRouter.get(
  '/',
  authenticate,
  authorize([UserRole.SUPER_ADMIN]),
  asyncHandler(async (req: Request, res: Response) => {
    const models = await prisma.mlModel.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
    res.json(successResponse(models));
  }),
);
