import { z } from 'zod';
import { UserRole } from '@prisma/client';

/**
 * Strict Password Policy per TRD §7.2 & FWS §2.1:
 * - Minimum 10 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 symbol
 */
const passwordPolicy = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol');

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
  password: passwordPolicy,
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100).optional().default('My Organization'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordPolicy,
});

export const inviteTeammateSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
  role: z.nativeEnum(UserRole).default(UserRole.ORG_MEMBER),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  password: passwordPolicy,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteTeammateInput = z.infer<typeof inviteTeammateSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
