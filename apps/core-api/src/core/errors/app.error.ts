import { ErrorCode, ERROR_CODES } from '@carbon-os/shared-types';

/**
 * Application error hierarchy.
 * All thrown errors must extend AppError so the global error handler
 * can map them deterministically to HTTP status codes + the API envelope.
 *
 * 4xx errors log at 'warn' level (no stack trace in logs).
 * 5xx errors log at 'error' level (with full stack trace).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly details?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode | string,
    details?: Record<string, string[]>,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// =============================================================================
// 400 — Validation Error
// =============================================================================
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 400, ERROR_CODES.VALIDATION_FAILED, details);
  }
}

// =============================================================================
// 401 — Unauthorized
// =============================================================================
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCode | string = ERROR_CODES.TOKEN_INVALID) {
    super(message, 401, code);
  }
}

// =============================================================================
// 403 — Forbidden
// =============================================================================
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

// =============================================================================
// 404 — Not Found
// IMPORTANT: Also used for cross-tenant resource access (never 403).
// This prevents callers from enumerating whether a resource exists in another tenant.
// =============================================================================
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND);
  }
}

// =============================================================================
// 409 — Conflict
// =============================================================================
export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode | string = 'CONFLICT') {
    super(message, 409, code);
  }
}

// =============================================================================
// 422 — Unprocessable (business rule violation)
// =============================================================================
export class UnprocessableError extends AppError {
  constructor(message: string, code: ErrorCode | string = 'UNPROCESSABLE') {
    super(message, 422, code);
  }
}

// =============================================================================
// 429 — Rate Limited
// =============================================================================
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, ERROR_CODES.RATE_LIMITED);
  }
}

// =============================================================================
// 500 — Internal Error (non-operational)
// =============================================================================
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, ERROR_CODES.INTERNAL_ERROR, undefined, false);
  }
}
