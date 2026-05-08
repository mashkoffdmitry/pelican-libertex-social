import { computed, onScopeDispose, ref, shallowRef, triggerRef, type Ref } from 'vue';
import type { Strategy, HistoryPoint } from '../types/strategy';
import type { ProgressResponse } from '../types/api';
import { api, joinUrl, type PelicanError } from '../utils/http';
import {
  PARTIAL_REPAINT_INTERVAL_MS,
  PROGRESS_POLL_INTERVAL_MS,
} from '../constants/defaults';

export interface UseCatalogOptions {
  apiBase: Ref<string>;
  /**
   * Optional separate origin for the *static* catalog endpoints
   * (`/api/strategies-full` and `/api/strategies-full/progress`).
   *
   * Intended use: a Cloudflare Worker fronting an R2 bucket — the catalog
   * lives on the edge, while live per-strategy data still goes through the
   * pelican-proxy at `apiBase`. When provided and different from `apiBase`,
   * `useCatalog` skips the partial-load polling loop (the edge always serves
   * a fully-built catalog).
   *
   * If omitted, all endpoints — including catalog — go through `apiBase`.
   */
  catalogBase?: Ref<string | undefined>;
  onError?(err: PelicanError): void;
}

export interface UseCatalogReturn {
  catalog: Ref<Strategy[]>;
  ready: Ref<boolean>;
  building: Ref<boolean>;
  loaded: Ref<number>;
  total: Ref<number>;
  builtAt: Ref<number | null>;
  enrichOne(id: number): Promise<void>;
  searchExtra(filter: string): Promise<void>;
  refresh(): Promise<void>;
  start(): void;
  stop(): void;
}

export function useCatalog({ apiBase, catalogBase, onError }: UseCatalogOptions): UseCatalogReturn {
  const byIdRef = shallowRef<Map<number, Strategy>>(new Map());
  const ready = ref(false);
  const building = ref(false);
  const loaded = ref(0);
  const total = ref(0);
  const builtAt = ref<number | null>(null);

  const catalog = computed<Strategy[]>(() => Array.from(byIdRef.value.values()));

  let stopped = false;

  const handleError = (e: unknown) => {
    if (onError) onError(e as PelicanError);
    else console.warn('[pelican-vue]', e);
  };

  // When catalogBase is set and points somewhere other than apiBase, the
  // edge catalog is pre-built and immediately complete — no progress/partial
  // dance needed. Otherwise (legacy single-origin setup) we fall back to the
  // proxy's partial-load + progress polling protocol.
  const isEdgeCatalog = () => {
    const cb = catalogBase?.value;
    return !!cb && cb !== apiBase.value;
  };
  const catalogOrigin = () => catalogBase?.value || apiBase.value;

  async function fetchAndMerge(partial: boolean) {
    try {
      const url = partial ? '/api/strategies-full?partial=1' : '/api/strategies-full';
      const items = await api<Strategy[]>(url, catalogOrigin());
      total.value = items.length;
      const m = byIdRef.value;
      for (const it of items) m.set(it.Id, { ...m.get(it.Id), ...it } as Strategy);
      triggerRef(byIdRef);
    } catch (e) {
      handleError(e);
    }
  }

  async function pollProgress(): Promise<ProgressResponse | null> {
    try {
      const p = await api<ProgressResponse>('/api/strategies-full/progress', catalogOrigin());
      loaded.value = p.loaded;
      total.value = p.total || total.value;
      building.value = p.building;
      builtAt.value = p.built_at;
      return p;
    } catch (e) {
      handleError(e);
      return null;
    }
  }

  async function loadFull() {
    if (isEdgeCatalog()) {
      // Single fetch — the edge catalog is always ready; no partial/polling.
      await fetchAndMerge(false);
      // Best-effort progress fetch so callers can read built_at; failures are non-fatal.
      void pollProgress();
      ready.value = true;
      return;
    }
    await fetchAndMerge(true);
    let lastPaint = Date.now();
    while (!stopped) {
      const p = await pollProgress();
      if (!p) {
        await sleep(1500);
        continue;
      }
      if (p.ready) break;
      if (Date.now() - lastPaint > PARTIAL_REPAINT_INTERVAL_MS) {
        await fetchAndMerge(true);
        lastPaint = Date.now();
      }
      await sleep(PROGRESS_POLL_INTERVAL_MS);
    }
    if (stopped) return;
    await fetchAndMerge(false);
    ready.value = true;
  }

  const enrichInflight = new Set<number>();
  async function enrichOne(id: number) {
    if (enrichInflight.has(id)) return;
    const existing = byIdRef.value.get(id);
    if (existing?._enrichAttempted && existing._meta && existing._stats) return;
    enrichInflight.add(id);
    try {
      const [meta, stats] = await Promise.all([
        safeFetchJson<MetaResponse>(joinUrl(apiBase.value, `/api/strategies/${id}`)),
        safeFetchJson<StatsResponse>(joinUrl(apiBase.value, `/api/strategies/${id}/stats`)),
      ]);
      const m = byIdRef.value;
      const cur = m.get(id) ?? ({ Id: id } as Strategy);
      mergeMetaInto(cur, meta);
      mergeStatsInto(cur, stats);
      cur._enrichAttempted = true;
      if (cur.IsEnabled === false) m.delete(id);
      else m.set(id, cur);
      triggerRef(byIdRef);
    } finally {
      enrichInflight.delete(id);
    }
  }

  async function searchExtra(filter: string) {
    if (!filter || !ready.value) return;
    try {
      const items = await api<Strategy[]>(
        `/api/strategies?filter=${encodeURIComponent(filter)}`,
        apiBase.value,
      );
      const m = byIdRef.value;
      const newIds: number[] = [];
      let added = 0;
      for (const it of items) {
        if (!m.has(it.Id)) {
          m.set(it.Id, { ...it, _stats: false, _meta: false });
          newIds.push(it.Id);
          added++;
        }
      }
      if (added) {
        total.value += added;
        triggerRef(byIdRef);
      }
      for (const id of newIds) void enrichOne(id);
    } catch (e) {
      handleError(e);
    }
  }

  function start() {
    stopped = false;
    void loadFull();
  }
  function stop() {
    stopped = true;
  }
  async function refresh() {
    stop();
    byIdRef.value = new Map();
    ready.value = false;
    loaded.value = 0;
    total.value = 0;
    builtAt.value = null;
    start();
  }

  onScopeDispose(stop);

  return {
    catalog,
    ready,
    building,
    loaded,
    total,
    builtAt,
    enrichOne,
    searchExtra,
    refresh,
    start,
    stop,
  };
}

async function safeFetchJson<T = unknown>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

interface MetaResponse {
  Name?: string | null;
  NumCopiers?: number | null;
  Fee?: number | null;
  RiskProfile?: Strategy['RiskProfile'];
  IsSimulated?: boolean;
  IsEnabled?: boolean;
  ImageUploaded?: boolean | null;
  Profile?: Strategy['Profile'];
}

interface StatsResponse {
  Inception?: string | null;
  CurrencyCode?: string | null;
  Profitability?: {
    Inception?: {
      UnrealisedReturn?: number | null;
      RealisedReturn?: number | null;
      MaxDrawdown?: number | null;
      RealisedPnl?: number | null;
      UnrealisedPnl?: number | null;
      History?: HistoryPoint[];
    };
  };
  Trades?: {
    Inception?: {
      Total?: number;
      Wins?: number;
      Losses?: number;
      Markets?: { MarketName: string; Count: number }[];
    };
  };
  Status?: { Balance?: number | null };
  CopiersBalance?: { Balance?: number | null };
  CopiersProfit?: { Month?: number | null; Year?: number | null };
}

function mergeMetaInto(cur: Strategy, meta: MetaResponse | null) {
  if (!meta) return;
  cur.Name = meta.Name ?? cur.Name;
  cur.NumCopiers = meta.NumCopiers ?? null;
  cur.Fee = meta.Fee ?? null;
  cur.RiskProfile = meta.RiskProfile ?? null;
  cur.IsSimulated = meta.IsSimulated ?? false;
  if (meta.IsEnabled !== undefined) cur.IsEnabled = meta.IsEnabled;
  if (meta.ImageUploaded !== undefined) cur.ImageUploaded = meta.ImageUploaded;
  cur.Profile = meta.Profile ?? cur.Profile;
  cur._meta = true;
}

function mergeStatsInto(cur: Strategy, stats: StatsResponse | null) {
  if (!stats) return;
  const inc = stats.Profitability?.Inception ?? {};
  const tr = stats.Trades?.Inception ?? {};
  const hist = inc.History ?? [];
  const stride = hist.length > 60 ? Math.ceil(hist.length / 60) : 1;
  const trimmed = hist
    .filter((_, i) => i % stride === 0 || i === hist.length - 1)
    .map((p) => ({ Timestamp: p.Timestamp, AccountReturn: p.AccountReturn }));

  cur.Inception = stats.Inception ?? cur.Inception;
  cur.Currency = stats.CurrencyCode || 'USD';
  cur.Return =
    inc.UnrealisedReturn != null
      ? inc.UnrealisedReturn * 100
      : inc.RealisedReturn != null
        ? inc.RealisedReturn * 100
        : null;
  cur.MaxDD = inc.MaxDrawdown != null ? inc.MaxDrawdown * 100 : null;
  cur.RealisedPnl = inc.RealisedPnl ?? null;
  cur.UnrealisedPnl = inc.UnrealisedPnl ?? null;
  cur.History = trimmed;
  cur.TradesTotal = tr.Total ?? 0;
  cur.Wins = tr.Wins ?? 0;
  cur.Losses = tr.Losses ?? 0;
  cur.Markets = Array.isArray(tr.Markets)
    ? tr.Markets.slice(0, 12).map((m) => ({ n: m.MarketName, c: m.Count }))
    : [];
  cur.AccountBalance = stats.Status?.Balance ?? null;
  cur.CopiersAUM = stats.CopiersBalance?.Balance ?? null;
  cur.MonthlyProfit = stats.CopiersProfit?.Month ?? null;
  cur.YearlyProfit = stats.CopiersProfit?.Year ?? null;
  cur._stats = true;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
