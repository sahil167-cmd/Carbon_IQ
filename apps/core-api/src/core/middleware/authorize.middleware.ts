import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../errors/app.error';

/**
 * Authorize Middleware Factory (RBAC)
 * Enforces role-based access control per PRD §1.6 and TRD §7.3.
 *
 * Usage:
 *   router.post('/sites', authenticate, authorize(['ORG_ADMIN']), handler);
 *   router.get('/dashboard', authenticate, authorize(['ORG_ADMIN', 'ORG_MEMBER']), handler);
 *   router.use('/admin/*', authenticate, authorize(['SUPER_ADMIN']));
 */
export function authorize(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Requires one of roles: [${allowedRoles.join(', ')}]`,
        ),
      );
    }

    next();
  };
}
