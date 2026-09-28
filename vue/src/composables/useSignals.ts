import { ref, type Ref } from 'vue';
import type { SignalKind } from '../types/api';
import type { Trade } from '../types/strategy';
import { LIVE_TIMEOUT_MS, SIGNALS_CLOSED_WINDOW_DAYS } from '../constants/defaults';
import { joinUrl, makeError, withTimeout, type PelicanError } from '../utils/http';

export interface SignalsCacheEntry {
  loading: boolean;
  trades: Trade[] | null;
  error: PelicanError | null;
}

export interface UseSignalsReturn {
  open: Ref<Map<number, SignalsCacheEntry>>;
  closed: Ref<Map<number, SignalsCacheEntry>>;
  load(strategyId: number, kind: SignalKind): Promise<void>;
  get(strategyId: number, kind: SignalKind): SignalsCacheEntry | null;
}

export function useSignals(apiBase: Ref<string>): UseSignalsReturn {
  const open = ref<Map<number, SignalsCacheEntry>>(new Map());
  const closed = ref<Map<number, SignalsCacheEntry>>(new Map());

  function get(id: number, kind: SignalKind): SignalsCacheEntry | null {
    return (kind === 'open' ? open.value : closed.value).get(id) ?? null;
  }

  async function load(id: number, kind: SignalKind) {
    const store = kind === 'open' ? open : closed;
    const cur = store.value.get(id);
    // Cached success (or a load in flight) is final; a cached error is not —
    // calling load() again retries it.
    if (cur && (cur.loading || (cur.trades !== null && !cur.error))) return;
    const next = new Map(store.value);
    next.set(id, { loading: true, trades: null, error: null });
    store.value = next;

    let qs = '';
    if (kind === 'closed') {
      // Round the window down to the whole minute: identical URLs for a minute
      // let the proxy's per-URL cache actually hit instead of missing on ms/s.
      const now = Math.floor(Date.now() / 60_000) * 60_000;
      const end = new Date(now);
      const start = new Date(now - SIGNALS_CLOSED_WINDOW_DAYS * 86400_000);
      const fmt = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z');
      qs = `?startDate=${encodeURIComponent(fmt(start))}&endDate=${encodeURIComponent(fmt(end))}`;
    }
    const url = joinUrl(apiBase.value, `/api/strategies/${id}/signals/${kind}${qs}`);

    let trades: Trade[] | null = null;
    let error: PelicanError | null = null;
    try {
      trades = await withTimeout(LIVE_TIMEOUT_MS, async (signal) => {
        const r = await fetch(url, signal ? { signal } : undefined);
        if (!r.ok) throw makeError('http_error', `${r.status}`, r.status);
        const body = (await r.json()) as unknown;
        return Array.isArray(body) ? (body as Trade[]) : [];
      });
    } catch (e) {
      error = (e as PelicanError).code
        ? (e as PelicanError)
        : makeError('fetch_failed', (e as Error).message);
      // Keep trades null on error so the entry is not frozen as "no trades".
      trades = null;
    }

    const final = new Map(store.value);
    final.set(id, { loading: false, trades, error });
    store.value = final;
  }

  return { open, closed, load, get };
}
