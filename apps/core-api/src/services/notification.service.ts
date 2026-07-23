import { PrismaClient, NotificationType } from '@prisma/client';
import nodemailer from 'nodemailer';
import { env } from '../config/env.schema';
import { createLogger } from '../core/logging/logger';

const logger = createLogger('NotificationService');

/**
 * NotificationService — Phase 0 infrastructure pipe.
 *
 * Per FWS locked architecture:
 * - Notifications are SYNCHRONOUS and fire-and-forget.
 * - They are NOT queued via BullMQ (the deliberate v1 exception to the async rule).
 * - Email failures are logged and swallowed — never crash the calling flow.
 *
 * Real trigger points are wired by each module phase:
 * - Phase 5 (Module 4): document uploaded / extraction triggered
 * - Phase 6 (Module 5): extraction complete / failed
 * - Phase 7 (Module 6): validation flagged / human review required
 * - Phase 10 (Module 9): forecast ready
 * - Phase 12 (Module 11): report draft ready
 *
 * NOTE (Phase 0): Trigger placeholders are commented inline in each route/service
 * so Phase 5+ can locate them easily.
 */
export class NotificationService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaClient) {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      secure: env.SMTP_PORT === 465,
    });
  }

  /**
   * Send a notification to a user.
   * 1. Inserts a Notification row in the DB (always succeeds or throws)
   * 2. Attempts email send synchronously and best-effort (logs failure, never throws)
   *
   * @param userId - Target user ID
   * @param organizationId - Org ID for scoping (optional on SYSTEM notifications)
   * @param type - NotificationType enum value
   * @param message - Human-readable message (safe to display in UI)
   * @param emailSubject - Optional email subject (defaults to a generic subject)
   */
  async send(
    userId: string,
    organizationId: string | null,
    type: NotificationType,
    message: string,
    emailSubject?: string,
  ): Promise<void> {
    // Step 1: Insert DB record
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        organizationId: organizationId ?? undefined,
        type,
        message,
      },
    });

    logger.info({ notificationId: notification.id, userId, type }, 'Notification created');

    // Step 2: Fire-and-forget email — never queued, never retried
    this.sendEmailBestEffort(userId, message, emailSubject ?? `Carbon OS: ${type}`).catch(
      (err: Error) => {
        logger.warn(
          { notificationId: notification.id, error: err.message },
          'Email send failed (best-effort, continuing)',
        );
      },
    );
  }

  /**
   * Get unread notifications for a user (paginated).
   */
  async getForUser(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, organizationId } }),
    ]);

    return { notifications, total };
  }

  /**
   * Mark a single notification as read.
   * Returns false if notification doesn't exist or belongs to another user.
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    return result.count > 0;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, organizationId, isRead: false },
      data: { isRead: true },
    });

    return result.count;
  }

  private async sendEmailBestEffort(userId: string, message: string, subject: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      logger.warn({ userId }, 'Cannot send email: user not found or missing email');
      return;
    }

    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: user.email,
      subject,
      text: message,
    });

    logger.info({ userId, email: user.email, subject }, 'Email sent successfully via NotificationService');
  }
}

