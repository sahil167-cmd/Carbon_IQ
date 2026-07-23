import { Router } from 'express';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { ValidationRepository } from './validation.repository';
import { DocumentRepository } from '../document/document.repository';
import { AiCollectorRepository } from '../ai-collector/ai-collector.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { validate } from '../../core/middleware/validate.middleware';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { UserRole } from '@prisma/client';
import {
  approveDocumentSchema,
  rejectDocumentSchema,
  bulkApproveSchema,
  listReviewQueueQuerySchema,
} from './validation.validator';

const prisma = getPrismaClient();
const repo = new ValidationRepository(prisma);
const docRepo = new DocumentRepository(prisma);
const aiRepo = new AiCollectorRepository(prisma);
const orgRepo = new OrganizationRepository(prisma);
const flagService = new FeatureFlagService(prisma);

const service = new ValidationService(repo, docRepo, aiRepo, orgRepo, flagService);
const controller = new ValidationController(service);

// =============================================================================
// Review Queue Router (/api/v1/review-queue)
// =============================================================================
export const reviewQueueRouter = Router();

reviewQueueRouter.use(authenticate);

reviewQueueRouter.get(
  '/',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(listReviewQueueQuerySchema, 'query'),
  asyncHandler(controller.listQueue),
);

reviewQueueRouter.post(
  '/bulk-approve',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(bulkApproveSchema),
  asyncHandler(controller.bulkApprove),
);

// =============================================================================
// Document Validation Router (/api/v1/documents)
// =============================================================================
const validationRouter = Router();

validationRouter.use(authenticate);

validationRouter.get(
  '/:id/validation',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getValidationDetails),
);

validationRouter.post(
  '/:id/approve',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(approveDocumentSchema),
  asyncHandler(controller.approve),
);

validationRouter.post(
  '/:id/reject',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(rejectDocumentSchema),
  asyncHandler(controller.reject),
);

export default validationRouter;
