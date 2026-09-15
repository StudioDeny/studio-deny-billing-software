import { ApiResponse } from '../types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    sessionStorage.setItem('STUDIO_DENY_ACCESS_TOKEN', token);
  } else {
    sessionStorage.removeItem('STUDIO_DENY_ACCESS_TOKEN');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = sessionStorage.getItem('STUDIO_DENY_ACCESS_TOKEN');
  }
  return accessToken;
}

export function clearAuthSession() {
  accessToken = null;
  sessionStorage.removeItem('STUDIO_DENY_ACCESS_TOKEN');
  sessionStorage.removeItem('STUDIO_DENY_USER');
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Sends HttpOnly refreshToken cookie
  });

  if (!res.ok) {
    throw new Error('Refresh token expired or invalid');
  }

  const payload = await res.json();
  const newToken = payload.data?.accessToken;
  if (!newToken) throw new Error('No access token in refresh response');

  setAccessToken(newToken);
  return newToken;
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  retries?: number;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Standard HTTP API client with auth interceptors, auto-refresh, and error normalization
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.idempotencyKey) {
    headers.set('X-Idempotency-Key', options.idempotencyKey);
  }

  const token = getAccessToken();
  if (token && !options.skipAuth) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let attempt = 0;
  const maxRetries = options.retries ?? (options.method === 'GET' ? 2 : 0);

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Handle 401 Unauthorized (attempt token refresh once)
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshAccessToken();
            isRefreshing = false;
            failedQueue.forEach((prom) => prom.resolve(newToken));
            failedQueue = [];
          } catch (refreshErr) {
            isRefreshing = false;
            failedQueue.forEach((prom) => prom.reject(refreshErr));
            failedQueue = [];
            clearAuthSession();
            window.location.href = '/login';
            throw new ApiError('Session expired. Please log in again.', 401);
          }
        }

        const retryToken = await new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });

        headers.set('Authorization', `Bearer ${retryToken}`);
        const retriedResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });

        const retriedJson: ApiResponse<T> = await retriedResponse.json();
        if (!retriedResponse.ok) {
          throw new ApiError(retriedJson.message || 'Request failed', retriedResponse.status, retriedJson.errors);
        }
        return retriedJson;
      }

      const json: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new ApiError(json.message || 'API request failed', response.status, json.errors);
      }

      return json;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      // Network dropout / connection refused
      attempt++;
      if (attempt > maxRetries) {
        if (ENABLE_MOCK_FALLBACK) {
          console.warn(`[API Client] Network call to ${url} failed. Mock fallback enabled.`, err);
        }
        throw new ApiError(
          err.message || 'Network connection failed. Backend server may be offline.',
          0
        );
      }

      // Exponential backoff wait before retrying
      await new Promise((res) => setTimeout(res, 300 * Math.pow(2, attempt)));
    }
  }

  throw new ApiError('Maximum retry limit reached.', 0);
}
