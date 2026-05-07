export interface PelicanError extends Error {
  code: 'no_token' | 'fetch_failed' | 'http_error';
  status?: number;
}

export function makeError(
  code: PelicanError['code'],
  message: string,
  status?: number,
): PelicanError {
  const e = new Error(message) as PelicanError;
  e.code = code;
  if (status !== undefined) e.status = status;
  return e;
}

export async function api<T = unknown>(path: string, apiBase: string): Promise<T> {
  const url = joinUrl(apiBase, path);
  let r: Response;
  try {
    r = await fetch(url);
  } catch (e) {
    throw makeError('fetch_failed', (e as Error).message ?? 'fetch failed');
  }
  if (r.status === 401 || r.status === 503) {
    throw makeError('no_token', 'Proxy has no token yet', r.status);
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw makeError('http_error', `${r.status}: ${t.slice(0, 120)}`, r.status);
  }
  return (await r.json()) as T;
}

export function joinUrl(base: string, path: string): string {
  if (!base) return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : '/' + path;
  return b + p;
}
