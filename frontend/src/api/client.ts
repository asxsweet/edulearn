const TOKEN_KEY = 'edulearn_token';

/** Production (Vercel): set VITE_API_URL to your Render API origin, e.g. https://edulearn-api.onrender.com */
function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (!path.startsWith('/')) return base ? `${base}/${path}` : `/${path}`;
  return base ? `${base}${path}` : path;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Public file path from API (/uploads/...) → full URL for <a href> / viewers */
export function fileUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (base) return `${base}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}

export async function apiForm<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { method, headers, body: formData });
  if (res.status === 401) {
    setToken(null);
    const onLogin = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (!onLogin) window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    const onLogin = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (!onLogin) window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
