import { Router } from 'express';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentRepository } from './document.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { validate } from '../../core/middleware/validate.middleware';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { UserRole } from '@prisma/client';
import {
  requestUploadUrlsSchema,
  registerDocumentSchema,
  submitManualDataSchema,
  listDocumentsQuerySchema,
  lockPeriodSchema,
} from './document.validator';

const prisma = getPrismaClient();
const docRepo = new DocumentRepository(prisma);
const orgRepo = new OrganizationRepository(prisma);
const service = new DocumentService(docRepo, orgRepo);
const controller = new DocumentController(service);

// =============================================================================
// Document Categories Router (/api/v1/document-categories)
// =============================================================================
export const categoryRouter = Router();

categoryRouter.get(
  '/',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.listCategories),
);

// =============================================================================
// Manual Activity Data Router (/api/v1/activity-data)
// =============================================================================
export const activityDataRouter = Router();

activityDataRouter.post(
  '/manual',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(submitManualDataSchema),
  asyncHandler(controller.submitManualData),
);

// =============================================================================
// Reporting Period Lock & Progress Router (/api/v1/reporting-periods)
// =============================================================================
export const periodRouter = Router();

periodRouter.get(
  '/active',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.listActivePeriods),
);

periodRouter.get(
  '/',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.listAllPeriods),
);

periodRouter.post(
  '/',
  authenticate,
  authorize([UserRole.ORG_ADMIN]),
  asyncHandler(controller.createPeriod),
);

periodRouter.get(
  '/:id/progress',
  authenticate,
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getPeriodProgress),
);

periodRouter.post(
  '/:id/lock',
  authenticate,
  authorize([UserRole.ORG_ADMIN]),
  validate(lockPeriodSchema),
  asyncHandler(controller.lockPeriod),
);

periodRouter.post(
  '/:id/unlock',
  authenticate,
  authorize([UserRole.ORG_ADMIN]),
  validate(lockPeriodSchema),
  asyncHandler(controller.unlockPeriod),
);

// =============================================================================
// Primary Document Upload & Management Router (/api/v1/documents)
// =============================================================================
const documentRouter = Router();

// Stream PDF file for iframe viewing (placed before authenticate middleware)
documentRouter.get(
  '/:id/file',
  asyncHandler(controller.streamDocumentFile),
);

documentRouter.use(authenticate);

documentRouter.post(
  '/upload-url',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(requestUploadUrlsSchema),
  asyncHandler(controller.getUploadUrl),
);

documentRouter.post(
  '/',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(registerDocumentSchema),
  asyncHandler(controller.registerDocument),
);

documentRouter.post(
  '/register',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(registerDocumentSchema),
  asyncHandler(controller.registerDocument),
);

documentRouter.get(
  '/',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(listDocumentsQuerySchema, 'query'),
  asyncHandler(controller.listDocuments),
);

documentRouter.get(
  '/:id',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getDocument),
);

export default documentRouter;
