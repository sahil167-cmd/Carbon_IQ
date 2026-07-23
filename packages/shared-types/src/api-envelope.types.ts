/**
 * Standard API Response Envelope
 * Every endpoint uses this structure — no exceptions.
 *
 * Success: { success: true, data: T, meta?: Meta }
 * Error:   { success: false, error: { code, message, details? } }
 */

export interface ApiMeta {
  /** Current page (for paginated responses) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Total item count */
  total?: number;
  /** Request tracing ID */
  requestId?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  /** Machine-readable error code (e.g. "EMAIL_EXISTS", "VALIDATION_FAILED") */
  code: string;
  /** Human-readable message — safe to display to the user */
  message: string;
  /** Field-level validation errors (Zod output shape) */
  details?: Record<string, string[]>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Paginated list wrapper */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Standard error codes used platform-wide */
export const ERROR_CODES = {
  // Auth
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  // General
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  // Business
  CALCULATION_BLOCKED: 'CALCULATION_BLOCKED',
  INSUFFICIENT_HISTORY: 'INSUFFICIENT_HISTORY',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  PERIOD_LOCKED: 'PERIOD_LOCKED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
