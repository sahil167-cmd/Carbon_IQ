import { AuthService } from '../auth.service';
import { UserRole, UserStatus, AuthTokenPurpose } from '@prisma/client';
import { ConflictError, UnauthorizedError, ValidationError } from '../../../core/errors/app.error';

describe('AuthService', () => {
  let mockRepo: any;
  let mockNotificationService: any;
  let authService: AuthService;

  beforeEach(() => {
    mockRepo = {
      findUserByEmail: jest.fn(),
      createUserWithOrganization: jest.fn(),
      createAuthToken: jest.fn(),
      findUserById: jest.fn(),
      createSession: jest.fn(),
      updateLastLogin: jest.fn(),
      findSessionByHash: jest.fn(),
      rotateSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllUserSessions: jest.fn(),
      findAuthTokenByHash: jest.fn(),
      markAuthTokenUsed: jest.fn(),
      updateUserStatus: jest.fn(),
    };

    mockNotificationService = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(mockRepo, mockNotificationService);
  });

  describe('signup', () => {
    it('should throw ConflictError if user email already exists', async () => {
      mockRepo.findUserByEmail.mockResolvedValueOnce({ id: 'user-1' });

      await expect(
        authService.signup({
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'John Doe',
          orgName: 'Acme Corp',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should hash password and create user + organization on valid signup', async () => {
      mockRepo.findUserByEmail.mockResolvedValueOnce(null);
      mockRepo.createUserWithOrganization.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com', fullName: 'John Doe', role: UserRole.ORG_ADMIN, status: UserStatus.ACTIVE },
        organizationId: 'org-1',
      });
      mockRepo.updateUserStatus.mockResolvedValueOnce({ id: 'user-1', status: UserStatus.ACTIVE });
      mockRepo.createSession.mockResolvedValueOnce({ id: 'session-1' });

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'John Doe',
        orgName: 'Acme Corp',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.user.organizationId).toBe('org-1');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockRepo.createUserWithOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          fullName: 'John Doe',
          role: UserRole.ORG_ADMIN,
        }),
      );
      expect(mockNotificationService.send).toHaveBeenCalled();
    });

  });

  describe('login', () => {
    it('should throw UnauthorizedError when user is not found', async () => {
      mockRepo.findUserByEmail.mockResolvedValueOnce(null);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError when user email is not verified', async () => {
      mockRepo.findUserByEmail.mockResolvedValueOnce({
        id: 'user-1',
        passwordHash: '$2b$12$somehash', // Dummy bcrypt hash
        status: UserStatus.PENDING_VERIFICATION,
      });

      // Mock bcrypt compare to pass
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(true as never);

      await expect(
        authService.login({ email: 'unverified@example.com', password: 'Password123!' }),
      ).rejects.toThrow('Email address not verified');
    });
  });

  describe('JWT Access Token Signing & Verification', () => {
    it('should sign and verify valid access tokens', () => {
      const user = {
        id: 'user-100',
        organizationId: 'org-200',
        role: UserRole.ORG_ADMIN,
        email: 'admin@acme.com',
      };

      const token = authService.signAccessToken(user);
      expect(token).toBeDefined();

      const decoded = authService.verifyAccessToken(token);
      expect(decoded.userId).toBe('user-100');
      expect(decoded.organizationId).toBe('org-200');
      expect(decoded.role).toBe(UserRole.ORG_ADMIN);
      expect(decoded.email).toBe('admin@acme.com');
    });

    it('should throw UnauthorizedError when token verification fails', () => {
      expect(() => authService.verifyAccessToken('invalid.token.here')).toThrow(UnauthorizedError);
    });
  });
});
