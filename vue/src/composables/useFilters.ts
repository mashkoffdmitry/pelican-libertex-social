import { computed, reactive, type Reactive, type Ref } from 'vue';
import type { Strategy } from '../types/strategy';
import type { FiltersState } from '../types/filters';
import { defaultFilters } from '../types/filters';
import { winrate } from '../utils/winrate';
import { ageDays } from '../utils/format';

export interface UseFiltersReturn {
  filters: Reactive<FiltersState>;
  filtered: Ref<Strategy[]>;
  reset(): void;
}

export function useFilters(
  source: Ref<Strategy[]>,
  initial: Partial<FiltersState> = {},
): UseFiltersReturn {
  const base = defaultFilters();
  const filters = reactive<FiltersState>({
    ...base,
    ...initial,
    risk: new Set(initial.risk ?? base.risk),
  });

  const filtered = computed<Strategy[]>(() => source.value.filter((s) => passes(s, filters)));

  function reset() {
    const fresh = defaultFilters();
    filters.risk = fresh.risk;
    filters.retMin = null;
    filters.retMax = null;
    filters.ddMax = null;
    filters.aumMin = null;
    filters.copiersMin = null;
    filters.ageMin = null;
    filters.tradesMin = null;
    filters.winrateMin = null;
    filters.feeMax = null;
    filters.balanceMin = null;
    filters.balanceMax = null;
    filters.search = '';
  }

  return { filters, filtered, reset };
}

function passes(s: Strategy, f: FiltersState): boolean {
  if (f.search) {
    const q = f.search.toLowerCase();
    if (
      !(s.Name || '').toLowerCase().includes(q) &&
      !(s.Profile?.Name || '').toLowerCase().includes(q)
    ) {
      return false;
    }
  }
  if (f.risk.size && s.RiskProfile && !f.risk.has(s.RiskProfile)) return false;
  if (s.IsSimulated) return false;
  if (s._stats && !s.TradesTotal) return false;
  if (f.copiersMin != null && (s.NumCopiers ?? 0) < f.copiersMin) return false;
  if (f.aumMin != null && (s.CopiersAUM ?? 0) < f.aumMin) return false;
  if (f.balanceMin != null && (s.AccountBalance ?? 0) < f.balanceMin) return false;
  if (f.balanceMax != null && (s.AccountBalance ?? Infinity) > f.balanceMax) return false;
  if (f.feeMax != null && s.Fee != null && s.Fee * 100 > f.feeMax) return false;
  if (f.tradesMin != null && (s.TradesTotal ?? 0) < f.tradesMin) return false;
  const wr = winrate(s);
  if (f.winrateMin != null && (wr < 0 || wr < f.winrateMin)) return false;
  const age = ageDays(s.Inception);
  if (f.ageMin != null && (age == null || age < f.ageMin)) return false;
  if (f.retMin != null && (s.Return == null || s.Return < f.retMin)) return false;
  if (f.retMax != null && (s.Return == null || s.Return > f.retMax)) return false;
  if (f.ddMax != null && s.MaxDD != null && Math.abs(s.MaxDD) > f.ddMax) return false;
  return true;
}
