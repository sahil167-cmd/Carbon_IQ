import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler.util';
import { validate } from '../core/middleware/validate.middleware';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { listNotificationsSchema } from '../validators/notification.validator';
import { NotificationService } from '../services/notification.service';
import { getPrismaClient } from '../core/repository/tenant-scoped.repository';

const router = Router();

// Phase 0: NotificationService instantiated here.
// Phase 2: This will be injected via dependency injection / IoC container.
const notificationService = new NotificationService(getPrismaClient());

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user.
 *
 * Phase 0 behaviour: auth is stubbed — organizationId / userId are hardcoded
 * placeholders until Phase 2 (Auth) wires req.user.
 *
 * Phase 2 TODO: Replace stubUserId / stubOrgId with req.user.id / req.user.organizationId
 *
 * NOTIFICATION TRIGGERS — Phases 5/6/7/10/12 will call notificationService.send() here.
 * See Implementation Plan §Phase 5+ for each module's trigger points.
 */
router.get(
  '/',
  validate(listNotificationsSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    // Phase 0 stub: replace with req.user once Auth module lands (Phase 2)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = (req as any).user;
    const userId: string = user?.id ?? 'stub-user-id';
    const organizationId: string = user?.organizationId ?? 'stub-org-id';

    const query = req.query as { page: number; limit: number };
    const { page, limit } = query;

    const { notifications, total } = await notificationService.getForUser(
      userId,
      organizationId,
      page,
      limit,
    );

    res.json(
      paginatedResponse(notifications, total, page, limit, req.requestId),
    );
  }),
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a specific notification as read.
 */
router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    // Phase 0 stub: replace with req.user once Auth module lands (Phase 2)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = (req as any).user;
    const userId: string = user?.id ?? 'stub-user-id';
    const { id } = req.params;

    const updated = await notificationService.markAsRead(id, userId);

    res.json(
      successResponse({ id, isRead: true, updated }),
    );
  }),
);

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    // Phase 0 stub: replace with req.user once Auth module lands (Phase 2)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = (req as any).user;
    const userId: string = user?.id ?? 'stub-user-id';
    const organizationId: string = user?.organizationId ?? 'stub-org-id';

    const count = await notificationService.markAllAsRead(userId, organizationId);

    res.json(successResponse({ markedRead: count }));
  }),
);

export default router;
