import { computed, ref, type Ref } from 'vue';
import type { Strategy } from '../types/strategy';
import { winrate } from '../utils/winrate';
import { ageDays } from '../utils/format';
import { SORT_TOGGLE, type SortColumn, type SortKey } from '../constants/sort';

type Comparator = (a: Strategy, b: Strategy) => number;

const COMPARATORS: Record<SortKey, Comparator> = {
  'return-desc': (a, b) => (b.Return ?? -1e18) - (a.Return ?? -1e18),
  'return-asc': (a, b) => (a.Return ?? 1e18) - (b.Return ?? 1e18),
  'dd-asc': (a, b) => Math.abs(a.MaxDD ?? 1e9) - Math.abs(b.MaxDD ?? 1e9),
  'dd-desc': (a, b) => Math.abs(b.MaxDD ?? -1e9) - Math.abs(a.MaxDD ?? -1e9),
  'aum-desc': (a, b) => (b.CopiersAUM ?? -1) - (a.CopiersAUM ?? -1),
  'aum-asc': (a, b) => (a.CopiersAUM ?? Infinity) - (b.CopiersAUM ?? Infinity),
  'copiers-desc': (a, b) => (b.NumCopiers ?? -1) - (a.NumCopiers ?? -1),
  'copiers-asc': (a, b) => (a.NumCopiers ?? Infinity) - (b.NumCopiers ?? Infinity),
  'fee-asc': (a, b) => (a.Fee ?? Infinity) - (b.Fee ?? Infinity),
  'fee-desc': (a, b) => (b.Fee ?? -1) - (a.Fee ?? -1),
  'age-desc': (a, b) => (ageDays(b.Inception) ?? -1) - (ageDays(a.Inception) ?? -1),
  'age-asc': (a, b) => (ageDays(a.Inception) ?? Infinity) - (ageDays(b.Inception) ?? Infinity),
  'balance-desc': (a, b) => (b.AccountBalance ?? -1) - (a.AccountBalance ?? -1),
  'balance-asc': (a, b) => (a.AccountBalance ?? Infinity) - (b.AccountBalance ?? Infinity),
  'winrate-desc': (a, b) => winrate(b) - winrate(a),
  'winrate-asc': (a, b) => winrate(a) - winrate(b),
  'trades-desc': (a, b) => (b.TradesTotal ?? -1) - (a.TradesTotal ?? -1),
  'trades-asc': (a, b) => (a.TradesTotal ?? Infinity) - (b.TradesTotal ?? Infinity),
  'monthly-desc': (a, b) => (b.MonthlyProfit ?? -1e18) - (a.MonthlyProfit ?? -1e18),
  'monthly-asc': (a, b) => (a.MonthlyProfit ?? 1e18) - (b.MonthlyProfit ?? 1e18),
};

export interface UseSortReturn {
  sortKey: Ref<SortKey>;
  sorted: Ref<Strategy[]>;
  toggleColumn(col: SortColumn): void;
  setKey(k: SortKey): void;
}

export function useSort(source: Ref<Strategy[]>, initial: SortKey = 'return-desc'): UseSortReturn {
  const sortKey = ref<SortKey>(initial);
  const sorted = computed<Strategy[]>(() => {
    const cmp = COMPARATORS[sortKey.value] ?? (() => 0);
    return source.value.slice().sort(cmp);
  });

  function toggleColumn(col: SortColumn) {
    const [primary, secondary] = SORT_TOGGLE[col];
    sortKey.value = sortKey.value === primary ? secondary : primary;
  }

  return {
    sortKey,
    sorted,
    toggleColumn,
    setKey: (k: SortKey) => {
      sortKey.value = k;
    },
  };
}
