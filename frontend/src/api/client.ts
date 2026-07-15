import { logger } from '../lib/logger';
import { firebaseAuth } from '../lib/firebase';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
export const API_PREFIX = `${API_BASE}/api`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response, method: string, path: string, startMs: number): Promise<T> {
  const elapsed = performance.now() - startMs;
  logger.api(method, `/api${path}`, res.status, elapsed);

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* body wasn't JSON — keep default message */
    }
    if (res.status === 401) {
      detail = 'Your session expired \u2014 please sign in again.';
      if (import.meta.env.DEV) logger.info(`API Error on ${method} ${path}: ${detail}`);
    } else if (res.status === 429) {
      detail = 'You\'ve hit the hourly limit \u2014 try again in a few minutes.';
      if (import.meta.env.DEV) logger.warn(`API Error on ${method} ${path}: ${detail}`);
    } else {
      // Let the caller handle UI rendering. Only log to console in dev mode to keep prod clean.
      if (import.meta.env.DEV) logger.warn(`API Error on ${method} ${path}: ${detail}`);
    }

    throw new ApiError(detail, res.status);
  }
  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function getAuthHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    logger.error('Failed to get auth token', err);
    return {};
  }
}

async function safeFetch<T>(method: string, path: string, options: RequestInit, timeoutMs = 45_000): Promise<T> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const authHeader = await getAuthHeader();
    const headers = { ...options.headers, ...authHeader };
    
    const r = await fetch(`${API_PREFIX}${path}`, { ...options, method, headers, signal: controller.signal });
    return await handleResponse<T>(r, method, path, start);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    
    if ((err as any)?.name === 'AbortError') {
      throw new ApiError('The request took too long and was cancelled. Please try again.', 408);
    }
    
    // Network failure, DNS error, or CORS error
    const elapsed = performance.now() - start;
    if (import.meta.env.DEV) {
      logger.error(`Network Error on ${method} ${path} after ${Math.round(elapsed)}ms:`, err);
    }
    
    // Check if offline
    if (!navigator.onLine) {
      throw new ApiError('You appear to be offline. Please check your internet connection.', 0);
    }
    throw new ApiError('Network error. The server might be unreachable or down.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, timeoutMs?: number): Promise<T> => safeFetch<T>('GET', path, {}, timeoutMs),
  
  post: <T>(path: string, body?: unknown, timeoutMs?: number): Promise<T> =>
    safeFetch<T>('POST', path, {
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }, timeoutMs),

  patch: <T>(path: string, body?: unknown, timeoutMs?: number): Promise<T> =>
    safeFetch<T>('PATCH', path, {
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }, timeoutMs),
    
  put: <T>(path: string, body?: unknown, timeoutMs?: number): Promise<T> =>
    safeFetch<T>('PUT', path, {
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }, timeoutMs),

  postForm: <T>(path: string, formData: FormData, timeoutMs?: number): Promise<T> =>
    safeFetch<T>('POST', path, { body: formData }, timeoutMs),

  del: <T>(path: string, timeoutMs?: number): Promise<T> => safeFetch<T>('DELETE', path, {}, timeoutMs),
};

// Image paths are now Supabase Storage keys
// e.g. "uploads/xyz.jpg" → https://PROJECT.supabase.co/storage/v1/object/public/roomcanvas/uploads/xyz.jpg
export function resolveImageUrl(key: string | null | undefined): string {
  if (!key) return '';
  return key;
}
