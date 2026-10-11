import { ApiSuccessResponse, ApiErrorResponse, ApiMeta } from '@carbon-iq/shared-types';

/**
 * Success Response Builder
 * Constructs the standard { success: true, data, meta } envelope.
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<ApiMeta>,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

/**
 * Paginated Success Response Builder
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string,
): ApiSuccessResponse<{ items: T[]; total: number; page: number; limit: number; totalPages: number }> {
  return {
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    meta: { total, page, limit, requestId },
  };
}

/**
 * Error Response Builder
 * Constructs the standard { success: false, error: { code, message, details } } envelope.
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>,
  requestId?: string,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    ...(requestId ? { meta: { requestId } } : {}),
  } as ApiErrorResponse;
}
