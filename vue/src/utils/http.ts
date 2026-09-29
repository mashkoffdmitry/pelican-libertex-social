import { CATALOG_TIMEOUT_MS } from '../constants/defaults';

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

/**
 * Runs `run` with an AbortSignal that fires after `ms` milliseconds, so a
 * hung upstream can never leave the UI waiting forever. The timer covers the
 * whole callback (headers AND body), not just the initial fetch() promise.
 * `ms <= 0` or a missing AbortController disables the timeout.
 */
export async function withTimeout<T>(
  ms: number,
  run: (signal: AbortSignal | undefined) => Promise<T>,
): Promise<T> {
  if (!(ms > 0) || typeof AbortController === 'undefined') return run(undefined);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await run(ctl.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function api<T = unknown>(
  path: string,
  apiBase: string,
  timeoutMs: number = CATALOG_TIMEOUT_MS,
): Promise<T> {
  const url = joinUrl(apiBase, path);
  return withTimeout(timeoutMs, async (signal) => {
    let r: Response;
    try {
      r = await fetch(url, signal ? { signal } : undefined);
    } catch (e) {
      throw makeError('fetch_failed', signal?.aborted ? 'timeout' : (e as Error).message ?? 'fetch failed');
    }
    if (r.status === 401 || r.status === 503) {
      throw makeError('no_token', 'Proxy has no token yet', r.status);
    }
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw makeError('http_error', `${r.status}: ${t.slice(0, 120)}`, r.status);
    }
    try {
      return (await r.json()) as T;
    } catch (e) {
      throw makeError('fetch_failed', signal?.aborted ? 'timeout' : (e as Error).message ?? 'bad json');
    }
  });
}

export function joinUrl(base: string, path: string): string {
  if (!base) return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : '/' + path;
  return b + p;
}
