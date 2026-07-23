import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus, InviteStatus } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { env } from '../../config/env.schema';
import { JwtPayload, LoginResult } from './auth.types';
import { SignupInput, LoginInput, ResetPasswordInput, InviteTeammateInput, AcceptInviteInput } from './auth.validator';
import {
  UnauthorizedError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  UnprocessableError,
} from '../../core/errors/app.error';
import { ERROR_CODES } from '@carbon-os/shared-types';
import { NotificationService } from '../../services/notification.service';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('AuthService');
const BCRYPT_SALT_ROUNDS = 12;

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly notificationService: NotificationService,
  ) {}

  // ===========================================================================
  // 1. Signup Flow (FWS §2.1)
  // ===========================================================================
  async signup(input: SignupInput): Promise<LoginResult> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      logger.warn({ email: input.email }, 'Signup attempt with existing email');
      throw new ConflictError('An account with this email address already exists.', ERROR_CODES.EMAIL_EXISTS);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const { user, organizationId } = await this.repo.createUserWithOrganization({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: UserRole.ORG_ADMIN, // First user of org is automatically ORG_ADMIN
      orgName: input.orgName,
    });

    // Auto-verify user immediately (dev mode) so they can access the app right away.
    // In production, this would require email verification first.
    await this.repo.updateUserStatus(user.id, UserStatus.ACTIVE, new Date());

    // Send welcome notification (best-effort)
    await this.notificationService.send(
      user.id,
      organizationId,
      'SYSTEM',
      `Welcome to Carbon OS! Your account is now active.`,
      'Welcome to Carbon OS',
    );

    // Issue access + refresh tokens so user lands on dashboard immediately
    const accessToken = this.signAccessToken(
      { id: user.id, organizationId, role: user.role, email: user.email },
      'carbon-os-api',
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const sessionExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await this.repo.createSession({
      userId: user.id,
      organizationId,
      refreshTokenHash,
      deviceInfo: 'signup',
      ipAddress: undefined,
      expiresAt: sessionExpiresAt,
    });

    logger.info({ userId: user.id, organizationId }, 'User signup successful — auto-verified, session created');

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: UserStatus.ACTIVE,
        organizationId,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  // ===========================================================================
  // 2. Email Verification Flow (FWS §2.1)
  // ===========================================================================
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const authToken = await this.repo.findAuthTokenByHash(tokenHash, AuthTokenPurpose.EMAIL_VERIFY);

    if (!authToken) {
      throw new ValidationError('Invalid or expired verification token');
    }

    if (authToken.usedAt) {
      // Re-clicking verified link returns clear message (FWS §2.1)
      throw new ValidationError('Email address has already been verified. Please log in.');
    }

    if (authToken.expiresAt < new Date()) {
      throw new ValidationError('Verification token has expired. Please request a new verification link.');
    }

    await this.repo.markAuthTokenUsed(authToken.id);
    await this.repo.updateUserStatus(authToken.userId, UserStatus.ACTIVE, new Date());

    logger.info({ userId: authToken.userId }, 'Email verified successfully');
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email);
    if (!user || user.status === UserStatus.ACTIVE) {
      return; // Generic silent return to avoid enumeration
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.repo.createAuthToken({
      userId: user.id,
      tokenHash,
      purpose: AuthTokenPurpose.EMAIL_VERIFY,
      expiresAt,
    });

    await this.notificationService.send(
      user.id,
      user.organizationId,
      'SYSTEM',
      `Please verify your email address using verification token: ${rawToken}`,
      'Verify your Carbon OS account',
    );
  }

  // ===========================================================================
  // 3. Login Flow (FWS §2.2 & TRD §7.1)
  // ===========================================================================
  async login(
    input: LoginInput,
    deviceInfo?: string,
    ipAddress?: string,
    isSuperAdminRoute = false,
  ): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(input.email);

    // Generic error to prevent account enumeration
    if (!user) {
      throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Role boundary checks
    if (isSuperAdminRoute && user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedError('Invalid admin credentials', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenError('Email address not verified. Please check your inbox.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Account has been suspended. Contact support.');
    }

    // Sign Access Token (15 min)
    const audience = isSuperAdminRoute ? 'carbon-os-admin' : 'carbon-os-api';
    const accessToken = this.signAccessToken(user, audience);

    // Generate Refresh Token (7 days)
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await this.repo.createSession({
      userId: user.id,
      organizationId: user.organizationId,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt,
    });

    await this.repo.updateLastLogin(user.id);

    logger.info({ userId: user.id, role: user.role, audience }, 'User login successful');

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        organizationId: user.organizationId,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  // ===========================================================================
  // 4. Token Refresh & Reuse Theft Detection (FWS §2.4 & TRD §7.1)
  // ===========================================================================
  async refreshSession(
    rawRefreshToken: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.repo.findSessionByHash(tokenHash);

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token', ERROR_CODES.TOKEN_INVALID);
    }

    const user = await this.repo.findUserById(session.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account inactive or suspended', ERROR_CODES.ACCOUNT_SUSPENDED);
    }

    // Issue new refresh token (Rotation)
    const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newHash = this.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await this.repo.rotateSession(session.id, newHash, newExpiresAt);

    const audience = user.role === UserRole.SUPER_ADMIN ? 'carbon-os-admin' : 'carbon-os-api';
    const accessToken = this.signAccessToken(user, audience);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  // ===========================================================================
  // 5. Logout & Revocation (FWS §2.5)
  // ===========================================================================
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.repo.findSessionByHash(tokenHash);
    if (session) {
      await this.repo.revokeSession(session.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId);
    logger.info({ userId }, 'Revoked all user sessions');
  }

  // ===========================================================================
  // 6. Forgot / Reset Password Flow (FWS §2.3)
  // ===========================================================================
  async forgotPassword(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email);
    if (!user || user.status === UserStatus.SUSPENDED) {
      // Always return identical success message to prevent user enumeration
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h expiry

    await this.repo.createAuthToken({
      userId: user.id,
      tokenHash,
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      expiresAt,
    });

    await this.notificationService.send(
      user.id,
      user.organizationId,
      'SYSTEM',
      `Your password reset token: ${rawToken}`,
      'Password Reset Request',
    );
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = this.hashToken(input.token);
    const authToken = await this.repo.findAuthTokenByHash(tokenHash, AuthTokenPurpose.PASSWORD_RESET);

    if (!authToken || authToken.usedAt || authToken.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);

    await this.repo.updatePassword(authToken.userId, passwordHash);
    await this.repo.markAuthTokenUsed(authToken.id);
    // Force logout everywhere on password reset (FWS §2.3)
    await this.repo.revokeAllUserSessions(authToken.userId);

    logger.info({ userId: authToken.userId }, 'Password reset successfully, sessions revoked');
  }

  // ===========================================================================
  // 7. Organization Teammate Invites (FWS §2 & Plan §6)
  // ===========================================================================
  async inviteTeammate(
    inviterId: string,
    organizationId: string,
    input: InviteTeammateInput,
  ): Promise<void> {
    const existingUser = await this.repo.findUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('User is already registered on the platform.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.repo.createInvite({
      organizationId,
      email: input.email,
      invitedById: inviterId,
      tokenHash,
      role: input.role,
      expiresAt,
    });

    await this.notificationService.send(
      inviterId,
      organizationId,
      'INVITE_RECEIVED',
      `Invitation sent to ${input.email} with token: ${rawToken}`,
      'Organization Teammate Invite',
    );
  }

  async acceptInvite(input: AcceptInviteInput): Promise<SignupResult> {
    const tokenHash = this.hashToken(input.token);
    const invite = await this.repo.findInviteByHash(tokenHash);

    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired invitation token');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const user = await this.repo.prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        fullName: input.fullName,
        role: invite.role,
        status: UserStatus.ACTIVE,
        organizationId: invite.organizationId,
        emailVerifiedAt: new Date(),
      },
    });

    await this.repo.updateInviteStatus(invite.id, InviteStatus.ACCEPTED);

    return { userId: user.id, organizationId: invite.organizationId };
  }

  async removeUserFromOrg(removerId: string, organizationId: string, targetUserId: string): Promise<void> {
    const target = await this.repo.findUserById(targetUserId);
    if (!target || target.organizationId !== organizationId) {
      throw new NotFoundError('User not found in organization');
    }

    if (target.role === UserRole.ORG_ADMIN) {
      const adminCount = await this.repo.countOrgAdmins(organizationId);
      if (adminCount <= 1) {
        throw new UnprocessableError('Cannot remove the last Organization Admin.');
      }
    }

    await this.repo.removeUserFromOrg(targetUserId, organizationId);
    await this.repo.revokeAllUserSessions(targetUserId);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================
  public signAccessToken(user: { id: string; organizationId: string | null; role: UserRole; email: string }, audience = 'carbon-os-api'): string {
    const payload: JwtPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      aud: audience,
    };

    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
  }

  public verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token', ERROR_CODES.TOKEN_INVALID);
    }
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
