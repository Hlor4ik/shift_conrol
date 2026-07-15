import { useAuth } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

let refreshInFlight: Promise<string | null> | null = null;

function parseErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = useAuth.getState().refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string; _retry?: boolean } = {},
): Promise<T> {
  const { token, _retry, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && token && !_retry && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, { ...options, token: newToken, _retry: true });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(parseErrorMessage(err, 'Request failed'));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiFormData<T>(
  path: string,
  formData: FormData,
  options: { token?: string; _retry?: boolean } = {},
): Promise<T> {
  const { token, _retry } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (res.status === 401 && token && !_retry && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFormData<T>(path, formData, { token: newToken, _retry: true });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(parseErrorMessage(err, 'Upload failed'));
  }
  return res.json();
}
