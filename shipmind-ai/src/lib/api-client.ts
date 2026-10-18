import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const BASE_URL = API_BASE_URL;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

/**
 * CarbonIQ API Client
 * Configured axios instance with:
 * - JWT Authorization token injection on every request
 * - Automatic silent token refresh on 401
 * - Redirect to /login when refresh fails
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Needed to send HttpOnly refresh token cookie
  timeout: 30_000,
});

// ── Request Interceptor: Attach JWT Access Token ──────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: Auto Refresh + Error Handling ───────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Auto-refresh on 401 (but not for auth endpoints themselves)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/v1/auth/refresh' &&
      originalRequest.url !== '/api/v1/auth/login' &&
      originalRequest.url !== '/api/v1/auth/signup'
    ) {
      if (isRefreshing) {
        // Queue up the failed request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
          `${BASE_URL}/api/v1/auth/refresh`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          { withCredentials: true },
        );

        const newToken = res.data.data.accessToken;
        localStorage.setItem('access_token', newToken);
        if (res.data.data.refreshToken) {
          localStorage.setItem('refresh_token', res.data.data.refreshToken);
        }
        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — clear session and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Standard error formatting
    if (!error.response) {
      return Promise.reject(
        new Error('Cannot reach CarbonIQ API backend. Ensure apps/core-api is running.'),
      );
    }

    const apiError = error.response.data as any;
    if (apiError?.error?.details && typeof apiError.error.details === 'object') {
      const fieldErrors = Object.entries(apiError.error.details)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join('; ');
      return Promise.reject(new Error(`${apiError.error.message} (${fieldErrors})`));
    }
    if (apiError?.error?.message) {
      return Promise.reject(new Error(apiError.error.message));
    }

    return Promise.reject(error);
  },
);

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<ApiResponse<T>>(path, { params });
  if (!res.data.success) throw new Error((res.data as unknown as ApiErrorResponse).error.message);
  return res.data.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<ApiResponse<T>>(path, body);
  if (!res.data.success) throw new Error((res.data as unknown as ApiErrorResponse).error.message);
  return res.data.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<ApiResponse<T>>(path, body);
  if (!res.data.success) throw new Error((res.data as unknown as ApiErrorResponse).error.message);
  return res.data.data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<ApiResponse<T>>(path, body);
  if (!res.data.success) throw new Error((res.data as unknown as ApiErrorResponse).error.message);
  return res.data.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiClient.delete<ApiResponse<T>>(path);
  if (!res.data.success) throw new Error((res.data as unknown as ApiErrorResponse).error.message);
  return res.data.data;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await apiClient.post<ApiResponse<T>>(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!res.data.success) throw new Error((res.data as unknown as ApiErrorResponse).error.message);
  return res.data.data;
}

export async function apiDownloadBlob(path: string, defaultFilename: string = 'document.pdf'): Promise<void> {
  const res = await apiClient.get(path, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export { apiClient };
export default apiClient;
