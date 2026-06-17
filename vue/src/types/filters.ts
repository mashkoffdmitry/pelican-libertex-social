import type { RiskLevel } from './strategy';

/** Account-age range buckets (multi-select chips). */
export type AgeBucket = 'lt6m' | 'm6to12' | 'gte1y';
/** Number-of-copiers range buckets (multi-select chips). */
export type CopierBucket = 'lt50' | 'c50to100' | 'c100to1k' | 'gte1k';

export interface FiltersState {
  risk: Set<RiskLevel>;
  ageBuckets: Set<AgeBucket>;
  copierBuckets: Set<CopierBucket>;
  retMin: number | null;
  retMax: number | null;
  ddMax: number | null;
  aumMin: number | null;
  tradesMin: number | null;
  winrateMin: number | null;
  feeMax: number | null;
  balanceMin: number | null;
  balanceMax: number | null;
  search: string;
}

export function defaultFilters(): FiltersState {
  return {
    risk: new Set<RiskLevel>(),
    ageBuckets: new Set<AgeBucket>(),
    copierBuckets: new Set<CopierBucket>(),
    // Default the Return floor to 1% so flat/negative strategies are hidden out of the box.
    retMin: 1,
    retMax: null,
    ddMax: null,
    aumMin: null,
    tradesMin: null,
    winrateMin: null,
    feeMax: null,
    balanceMin: null,
    balanceMax: null,
    search: '',
  };
}
