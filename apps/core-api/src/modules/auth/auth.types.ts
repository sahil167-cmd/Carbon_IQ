import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  organizationId: string | null;
  role: UserRole;
  email: string;
  aud?: string; // 'carbon-os-api' | 'carbon-os-admin'
  iat?: number;
  exp?: number;
}

export interface AuthTokenClaims {
  userId: string;
  email: string;
  organizationId: string | null;
  role: UserRole;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    organizationId: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface SignupResult {
  userId: string;
  organizationId: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string | null;
  createdAt: Date;
}
