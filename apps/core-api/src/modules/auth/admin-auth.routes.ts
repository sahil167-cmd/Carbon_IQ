import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { NotificationService } from '../../services/notification.service';
import { validate } from '../../core/middleware/validate.middleware';
import { authRateLimiter } from '../../core/middleware/rate-limiter.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { loginSchema } from './auth.validator';

const prisma = getPrismaClient();
const repo = new AuthRepository(prisma);
const notificationService = new NotificationService(prisma);
const authService = new AuthService(repo, notificationService);
const controller = new AuthController(authService);

const adminAuthRouter = Router();

/**
 * POST /api/v1/admin/auth/login
 * Isolated Super Admin login route.
 * Issues access token with audience claim `aud: 'carbon-os-admin'`.
 * Cannot be accessed by normal client users (verifies role === SUPER_ADMIN).
 */
adminAuthRouter.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(controller.login),
);

export default adminAuthRouter;
