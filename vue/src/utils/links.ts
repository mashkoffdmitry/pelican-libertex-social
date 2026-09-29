const KEY_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_VALUE_LEN = 256;
const MAX_PARAMS = 20;

/**
 * Normalises the `linkParams` prop into a safe query string (without the
 * leading '?') for the libertex.copy-trade.io strategy links, e.g.
 * "?utm_source=site&utm_medium=widget" -> "utm_source=site&utm_medium=widget".
 *
 * Only plain keys ([A-Za-z0-9_.-], max 64 chars) with values up to 256 chars
 * are kept, at most 20 of them; everything is re-encoded by URLSearchParams,
 * so the result can never break out of the query part of the URL.
 */
export function sanitizeLinkParams(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  let input = raw.trim();
  if (input.startsWith('?') || input.startsWith('#')) input = input.slice(1);
  if (!input) return '';
  let parsed: URLSearchParams;
  try {
    parsed = new URLSearchParams(input);
  } catch {
    return '';
  }
  const out = new URLSearchParams();
  let n = 0;
  parsed.forEach((value, key) => {
    if (n >= MAX_PARAMS) return;
    if (!KEY_RE.test(key) || value.length > MAX_VALUE_LEN) return;
    out.append(key, value);
    n++;
  });
  return out.toString();
}

export const COPY_TRADE_ORIGIN = 'https://libertex.copy-trade.io';

/**
 * libertex.copy-trade.io URL for `path` ('/' or '/strategy/<id>') with the
 * pre-sanitised `linkParams` query string appended (see sanitizeLinkParams).
 */
export function copyTradeUrl(path: string, qs: string | null | undefined): string {
  return `${COPY_TRADE_ORIGIN}${path}${qs ? '?' + qs : ''}`;
}
