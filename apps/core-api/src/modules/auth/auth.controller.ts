import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../utils/response.util';
import { env } from '../../config/env.schema';
import {
  SignupInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  InviteTeammateInput,
  AcceptInviteInput,
} from './auth.validator';

const COOKIE_NAME = 'refreshToken';

// Cross-origin cookie settings: Vercel frontend + Render backend = different domains
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
  maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
});

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Signup ──────────────────────────────────────────────────────────────────
  signup = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as SignupInput;
    const result = await this.authService.signup(input);

    // Set HttpOnly refresh token cookie (same as login)
    res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());

    res.status(201).json(
      successResponse(
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Email Verification ──────────────────────────────────────────────────────
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body as VerifyEmailInput;
    await this.authService.verifyEmail(token);

    res.json(
      successResponse({ message: 'Email address verified successfully' }, { requestId: req.requestId }),
    );
  };

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as ResendVerificationInput;
    await this.authService.resendVerification(email);

    res.json(
      successResponse(
        { message: 'If an unverified account exists, a verification email has been sent.' },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Login ───────────────────────────────────────────────────────────────────
  login = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as LoginInput;
    const isAdminRoute = req.path.includes('/admin');
    const result = await this.authService.login(
      input,
      req.headers['user-agent'],
      req.ip,
      isAdminRoute,
    );

    // Set HttpOnly, Secure, SameSite=Strict refresh token cookie
    res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());

    res.json(
      successResponse(
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Refresh Session ─────────────────────────────────────────────────────────
  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = (req.cookies as Record<string, string>)?.[COOKIE_NAME] || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Refresh token cookie missing' },
      });
      return;
    }

    const result = await this.authService.refreshSession(
      refreshToken,
      req.headers['user-agent'],
      req.ip,
    );

    // Set rotated cookie
    res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());

    res.json(
      successResponse(
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = (req.cookies as Record<string, string>)?.[COOKIE_NAME];
    await this.authService.logout(refreshToken);

    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
    res.json(successResponse({ message: 'Logged out successfully' }, { requestId: req.requestId }));
  };

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    await this.authService.logoutAll(userId);

    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
    res.json(successResponse({ message: 'Logged out of all devices successfully' }, { requestId: req.requestId }));
  };

  // ── Forgot / Reset Password ────────────────────────────────────────────────
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as ForgotPasswordInput;
    await this.authService.forgotPassword(email);

    res.json(
      successResponse(
        { message: 'If that email address exists, a password reset link has been sent.' },
        { requestId: req.requestId },
      ),
    );
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as ResetPasswordInput;
    await this.authService.resetPassword(input);

    res.json(
      successResponse(
        { message: 'Password reset successfully. Please log in with your new password.' },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Org Invites & Team Management ──────────────────────────────────────────
  inviteTeammate = async (req: Request, res: Response): Promise<void> => {
    const inviterId = req.user!.id;
    const organizationId = req.user!.organizationId!;
    const input = req.body as InviteTeammateInput;

    await this.authService.inviteTeammate(inviterId, organizationId, input);

    res.status(201).json(
      successResponse({ message: `Invitation sent to ${input.email}` }, { requestId: req.requestId }),
    );
  };

  acceptInvite = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as AcceptInviteInput;
    const result = await this.authService.acceptInvite(input);

    res.status(201).json(
      successResponse(result, { requestId: req.requestId }),
    );
  };

  removeUser = async (req: Request, res: Response): Promise<void> => {
    const removerId = req.user!.id;
    const organizationId = req.user!.organizationId!;
    const { id: targetUserId } = req.params;

    await this.authService.removeUserFromOrg(removerId, organizationId, targetUserId);

    res.json(
      successResponse({ message: 'User removed from organization successfully' }, { requestId: req.requestId }),
    );
  };
}
