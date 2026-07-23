import { Router } from 'express';
import { AiCollectorController } from './ai-collector.controller';
import { AiCollectorService } from './ai-collector.service';
import { AiCollectorRepository } from './ai-collector.repository';
import { DocumentRepository } from '../document/document.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { ConfigService } from '../../services/config.service';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { validate } from '../../core/middleware/validate.middleware';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { UserRole } from '@prisma/client';
import {
  patchExtractedFieldSchema,
  reprocessDocumentSchema,
  internalExtractSchema,
} from './ai-collector.validator';

const prisma = getPrismaClient();
const repo = new AiCollectorRepository(prisma);
const docRepo = new DocumentRepository(prisma);
const orgRepo = new OrganizationRepository(prisma);
const flagService = new FeatureFlagService(prisma);
const configService = new ConfigService(prisma);

const service = new AiCollectorService(repo, docRepo, orgRepo, flagService, configService);
const controller = new AiCollectorController(service);

export const aiExtractionRouter = Router();

// ── Authenticated Document Extraction Endpoints ──────────────────────────────
aiExtractionRouter.get(
  '/:id/extraction',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getExtraction),
);

aiExtractionRouter.get(
  '/:id/extracted',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getExtraction),
);

aiExtractionRouter.patch(
  '/:id/extraction',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(patchExtractedFieldSchema),
  asyncHandler(controller.correctField),
);

aiExtractionRouter.post(
  '/:id/reprocess',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(reprocessDocumentSchema),
  asyncHandler(controller.reprocess),
);

// ── Internal Service Router (/api/v1/internal/ai) ───────────────────────────
export const internalAiRouter = Router();

internalAiRouter.post(
  '/extract',
  validate(internalExtractSchema),
  asyncHandler(controller.triggerInternalExtract),
);
