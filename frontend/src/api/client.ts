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

async function safeFetch<T>(method: string, path: string, options: RequestInit): Promise<T> {
  const start = performance.now();
  try {
    const authHeader = await getAuthHeader();
    const headers = { ...options.headers, ...authHeader };
    
    const r = await fetch(`${API_PREFIX}${path}`, { ...options, method, headers });
    return await handleResponse<T>(r, method, path, start);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    
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
  }
}

export const api = {
  get: <T>(path: string): Promise<T> => safeFetch<T>('GET', path, {}),
  
  post: <T>(path: string, body: unknown): Promise<T> =>
    safeFetch<T>('POST', path, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown): Promise<T> =>
    safeFetch<T>('PATCH', path, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  postForm: <T>(path: string, formData: FormData): Promise<T> =>
    safeFetch<T>('POST', path, { body: formData }),

  del: <T>(path: string): Promise<T> => safeFetch<T>('DELETE', path, {}),
};

// Image paths are relative POSIX paths from repo root
// e.g. "storage/uploads/xyz.jpg" → http://localhost:8000/static/uploads/xyz.jpg
export function resolveImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  const cleaned = relativePath.replace(/^storage[\\/]/, '').replace(/\\/g, '/');
  return `${API_BASE}/static/${cleaned}`;
}
