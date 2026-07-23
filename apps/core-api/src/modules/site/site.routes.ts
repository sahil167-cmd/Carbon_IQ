import { Router } from 'express';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';
import { SiteRepository } from './site.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { validate } from '../../core/middleware/validate.middleware';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { UserRole } from '@prisma/client';
import { createSiteSchema, updateSiteSchema, listSitesQuerySchema } from './site.validator';

const prisma = getPrismaClient();
const siteRepo = new SiteRepository(prisma);
const orgRepo = new OrganizationRepository(prisma);
const service = new SiteService(siteRepo, orgRepo);
const controller = new SiteController(service);

const siteRouter = Router();

// All site endpoints require authentication
siteRouter.use(authenticate);

siteRouter.get(
  '/',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  validate(listSitesQuerySchema, 'query'),
  asyncHandler(controller.listSites),
);

siteRouter.post(
  '/',
  authorize([UserRole.ORG_ADMIN]),
  validate(createSiteSchema),
  asyncHandler(controller.createSite),
);

siteRouter.get(
  '/:id',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getSite),
);

siteRouter.patch(
  '/:id',
  authorize([UserRole.ORG_ADMIN]),
  validate(updateSiteSchema),
  asyncHandler(controller.updateSite),
);

siteRouter.patch(
  '/:id/deactivate',
  authorize([UserRole.ORG_ADMIN]),
  asyncHandler(controller.deactivateSite),
);

siteRouter.delete(
  '/:id',
  authorize([UserRole.ORG_ADMIN]),
  asyncHandler(controller.deleteSite),
);

siteRouter.get(
  '/:id/dashboard',
  authorize([UserRole.ORG_ADMIN, UserRole.ORG_MEMBER]),
  asyncHandler(controller.getDashboard),
);

export default siteRouter;
