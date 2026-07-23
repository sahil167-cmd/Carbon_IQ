import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { NotificationService } from '../../services/notification.service';
import { validate } from '../../core/middleware/validate.middleware';
import { authenticate } from '../../core/middleware/authenticate.middleware';
import { authorize } from '../../core/middleware/authorize.middleware';
import { authRateLimiter } from '../../core/middleware/rate-limiter.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { UserRole } from '@prisma/client';
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteTeammateSchema,
  acceptInviteSchema,
} from './auth.validator';

const prisma = getPrismaClient();

// Instantiate Auth dependencies
// (In future phases, this is managed via IoC container)
const repo = new AuthRepository(prisma);
const notificationService = new NotificationService(prisma);
const authService = new AuthService(repo, notificationService);
const controller = new AuthController(authService);

const router = Router();

// =============================================================================
// Public Auth Routes (/api/v1/auth)
// =============================================================================

router.post(
  '/signup',
  validate(signupSchema),
  asyncHandler(controller.signup),
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(controller.verifyEmail),
);

router.post(
  '/resend-verification',
  authRateLimiter,
  validate(resendVerificationSchema),
  asyncHandler(controller.resendVerification),
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(controller.login),
);

router.post(
  '/refresh',
  asyncHandler(controller.refresh),
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(controller.forgotPassword),
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(controller.resetPassword),
);

// =============================================================================
// Authenticated Auth Routes (/api/v1/auth)
// =============================================================================

router.post(
  '/logout',
  authenticate,
  asyncHandler(controller.logout),
);

router.post(
  '/logout-all',
  authenticate,
  asyncHandler(controller.logoutAll),
);

export default router;

// =============================================================================
// Org & Teammate Invite Routes (/api/v1/org)
// =============================================================================

export const orgRouter = Router();

orgRouter.post(
  '/invite',
  authenticate,
  authorize([UserRole.ORG_ADMIN]),
  validate(inviteTeammateSchema),
  asyncHandler(controller.inviteTeammate),
);

orgRouter.post(
  '/invite/:token/accept',
  validate(acceptInviteSchema),
  asyncHandler(controller.acceptInvite),
);

orgRouter.delete(
  '/users/:id',
  authenticate,
  authorize([UserRole.ORG_ADMIN]),
  asyncHandler(controller.removeUser),
);
