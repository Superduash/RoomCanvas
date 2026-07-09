const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_PREFIX = `${API_BASE}/api`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* body wasn't JSON — keep default message */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, { method: 'GET' }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  postForm: <T>(path: string, formData: FormData): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, { method: 'POST', body: formData }).then((r) => handleResponse<T>(r)),

  del: <T>(path: string): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, { method: 'DELETE' }).then((r) => handleResponse<T>(r)),
};

// Image paths are relative POSIX paths from repo root
// e.g. "storage/uploads/xyz.jpg" → http://localhost:8000/static/uploads/xyz.jpg
export function resolveImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  const cleaned = relativePath.replace(/^storage[\\/]/, '').replace(/\\/g, '/');
  return `${API_BASE}/static/${cleaned}`;
}
