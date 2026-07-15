import { useAuthStore } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

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
    refreshInFlight = useAuthStore.getState().refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string; companyId?: string; _retry?: boolean } = {},
): Promise<T> {
  const { token, companyId, _retry, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers['x-company-id'] = companyId;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && token && !_retry && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, { ...options, token: newToken, _retry: true });
    }
    await useAuthStore.getState().logout();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(parseErrorMessage(err, 'Request failed'));
  }
  return res.json();
}

export async function apiBlob(
  path: string,
  options: RequestInit & { token?: string; companyId?: string } = {},
): Promise<Blob> {
  const { token, companyId, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers['x-company-id'] = companyId;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(parseErrorMessage(err, 'Export failed'));
  }
  return res.blob();
}

export async function apiFormData<T>(
  path: string,
  formData: FormData,
  options: { token?: string; companyId?: string; _retry?: boolean } = {},
): Promise<T> {
  const { token, companyId, _retry } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers['x-company-id'] = companyId;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (res.status === 401 && token && !_retry && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFormData<T>(path, formData, { ...options, token: newToken, _retry: true });
    }
    await useAuthStore.getState().logout();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(parseErrorMessage(err, 'Upload failed'));
  }
  return res.json();
}
