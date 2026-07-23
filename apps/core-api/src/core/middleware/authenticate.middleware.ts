import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.schema';
import { UnauthorizedError } from '../errors/app.error';
import { JwtPayload } from '../../modules/auth/auth.types';
import { getPrismaClient } from '../repository/tenant-scoped.repository';
import { UserStatus } from '@prisma/client';

import { tenantStorage } from './tenant-context.middleware';

/**
 * Authenticate Middleware
 * Verifies JWT access token from Authorization: Bearer <token> header.
 * Attaches decoded req.user = { id, email, role, organizationId }
 * Seeds tenantStorage AsyncLocalStorage context.
 * Throws 401 UnauthorizedError if missing, invalid, or expired.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Verify user is still active in DB
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true, organizationId: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return next(new UnauthorizedError('Account inactive, suspended, or deleted'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    if (user.organizationId) {
      tenantStorage.run(
        {
          organizationId: user.organizationId,
          userId: user.id,
          role: user.role,
        },
        next,
      );
    } else {
      next();
    }
  } catch {
    return next(new UnauthorizedError('Invalid or expired access token'));
  }
}
