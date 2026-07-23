import { PrismaClient, User, Session, AuthToken, Invite, AuthTokenPurpose, UserRole, UserStatus, InviteStatus } from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class AuthRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId || 'GLOBAL_AUTH');
  }

  // ── User Operations ────────────────────────────────────────────────────────
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUserWithOrganization(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    orgName: string;
  }): Promise<{ user: User; organizationId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.orgName,
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          role: data.role,
          status: UserStatus.PENDING_VERIFICATION,
          organizationId: org.id,
        },
      });

      return { user, organizationId: org.id };
    });
  }

  async updateUserStatus(userId: string, status: UserStatus, emailVerifiedAt?: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        ...(emailVerifiedAt ? { emailVerifiedAt } : {}),
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  // ── Session Operations ──────────────────────────────────────────────────────
  async createSession(data: {
    userId: string;
    organizationId: string | null;
    refreshTokenHash: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        refreshTokenHash: data.refreshTokenHash,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findSessionByHash(refreshTokenHash: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { refreshTokenHash },
    });
  }

  async rotateSession(sessionId: string, newHash: string, newExpiresAt: Date): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newHash,
        expiresAt: newExpiresAt,
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return result.count;
  }

  // ── AuthToken Operations (Verification & Reset) ────────────────────────────
  async createAuthToken(data: {
    userId: string;
    tokenHash: string;
    purpose: AuthTokenPurpose;
    expiresAt: Date;
  }): Promise<AuthToken> {
    return this.prisma.authToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        purpose: data.purpose,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findAuthTokenByHash(tokenHash: string, purpose: AuthTokenPurpose): Promise<AuthToken | null> {
    return this.prisma.authToken.findFirst({
      where: { tokenHash, purpose },
    });
  }

  async markAuthTokenUsed(id: string): Promise<void> {
    await this.prisma.authToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // ── Invite Operations ───────────────────────────────────────────────────────
  async createInvite(data: {
    organizationId: string;
    email: string;
    invitedById: string;
    tokenHash: string;
    role: UserRole;
    expiresAt: Date;
  }): Promise<Invite> {
    return this.prisma.invite.create({
      data: {
        organizationId: data.organizationId,
        email: data.email,
        invitedById: data.invitedById,
        tokenHash: data.tokenHash,
        role: data.role,
        status: InviteStatus.PENDING,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findInviteByHash(tokenHash: string): Promise<Invite | null> {
    return this.prisma.invite.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });
  }

  async updateInviteStatus(id: string, status: InviteStatus): Promise<void> {
    await this.prisma.invite.update({
      where: { id },
      data: { status },
    });
  }

  async countOrgAdmins(organizationId: string): Promise<number> {
    return this.prisma.user.count({
      where: { organizationId, role: UserRole.ORG_ADMIN, status: UserStatus.ACTIVE },
    });
  }

  async removeUserFromOrg(userId: string, organizationId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId, organizationId },
      data: { organizationId: null, status: UserStatus.SUSPENDED },
    });
  }
}
