import { ref, type Ref } from 'vue';
import type { SignalKind } from '../types/api';
import type { Trade } from '../types/strategy';
import { SIGNALS_CLOSED_WINDOW_DAYS } from '../constants/defaults';
import { joinUrl, makeError, type PelicanError } from '../utils/http';

interface SignalsCacheEntry {
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
    if (cur && (cur.loading || cur.trades !== null)) return;
    const next = new Map(store.value);
    next.set(id, { loading: true, trades: null, error: null });
    store.value = next;

    let qs = '';
    if (kind === 'closed') {
      const end = new Date();
      const start = new Date(Date.now() - SIGNALS_CLOSED_WINDOW_DAYS * 86400_000);
      const fmt = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z');
      qs = `?startDate=${encodeURIComponent(fmt(start))}&endDate=${encodeURIComponent(fmt(end))}`;
    }
    const url = joinUrl(apiBase.value, `/api/strategies/${id}/signals/${kind}${qs}`);

    let trades: Trade[] = [];
    let error: PelicanError | null = null;
    try {
      const r = await fetch(url);
      if (!r.ok) throw makeError('http_error', `${r.status}`);
      trades = (await r.json()) as Trade[];
    } catch (e) {
      error = (e as PelicanError).code
        ? (e as PelicanError)
        : makeError('fetch_failed', (e as Error).message);
      trades = [];
    }

    const final = new Map(store.value);
    final.set(id, { loading: false, trades, error });
    store.value = final;
  }

  return { open, closed, load, get };
}
