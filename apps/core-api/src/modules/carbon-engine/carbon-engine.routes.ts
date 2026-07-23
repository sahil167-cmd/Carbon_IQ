import { Router } from 'express';
import { CarbonEngineController } from './carbon-engine.controller';
import { CarbonEngineService } from './carbon-engine.service';
import { CarbonEngineRepository } from './carbon-engine.repository';
import { DocumentRepository } from '../document/document.repository';
import { AiCollectorRepository } from '../ai-collector/ai-collector.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { NotificationService } from '../../services/notification.service';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { validate } from '../../core/middleware/validate.middleware';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { UserRole } from '@prisma/client';
import {
  createEmissionFactorSchema,
  recalculatePeriodSchema,
  internalCalcSchema,
} from './carbon-engine.validator';

const prisma = getPrismaClient();
const repo = new CarbonEngineRepository(prisma);
const docRepo = new DocumentRepository(prisma);
const aiRepo = new AiCollectorRepository(prisma);
const orgRepo = new OrganizationRepository(prisma);
const notifService = new NotificationService(prisma);

const service = new CarbonEngineService(repo, docRepo, aiRepo, orgRepo, notifService);
const controller = new CarbonEngineController(service);

// ── Primary Emissions Router (/api/v1/emissions) ──────────────────────────────
export const emissionsRouter = Router();

emissionsRouter.get(
  '/:id',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getCalculationDetails),
);

// ── Emission Factors Routers (/api/v1/emission-factors & /api/v1/admin/emission-factors) ──
export const factorRouter = Router();

factorRouter.get(
  '/',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.listEmissionFactors),
);

export const adminFactorRouter = Router();

adminFactorRouter.post(
  '/',
  authenticate,
  authorize([UserRole.SUPER_ADMIN]),
  validate(createEmissionFactorSchema),
  asyncHandler(controller.createEmissionFactor),
);

// ── Internal Service Router (/api/v1/internal/calc) ───────────────────────────
export const internalCalcRouter = Router();

internalCalcRouter.post(
  '/run',
  authenticate,
  validate(internalCalcSchema),
  asyncHandler(controller.triggerInternalCalc),
);
