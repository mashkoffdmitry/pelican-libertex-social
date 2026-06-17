import type { AgeBucket, CopierBucket } from '../types/filters';
import type { TranslationKey } from '../i18n/translations';

/**
 * A range bucket for the multi-select chip filters (Account Age, Number of
 * Copiers). Intervals are half-open `[min, max)` — `max: null` means unbounded.
 * Keeping the boundaries here makes the chips component and the filter predicate
 * share one source of truth.
 */
export interface BucketDef<T extends string> {
  id: T;
  labelKey: TranslationKey;
  min: number;
  max: number | null;
}

/** Account age in DAYS: < 6 months / 6–12 months / 1 year+. */
export const AGE_BUCKETS: BucketDef<AgeBucket>[] = [
  { id: 'lt6m', labelKey: 'filters.age.lt6m', min: 0, max: 180 },
  { id: 'm6to12', labelKey: 'filters.age.m6to12', min: 180, max: 365 },
  { id: 'gte1y', labelKey: 'filters.age.gte1y', min: 365, max: null },
];

/** Number of copiers: < 50 / 50–100 / 100–1k / 1k+. */
export const COPIER_BUCKETS: BucketDef<CopierBucket>[] = [
  { id: 'lt50', labelKey: 'filters.copiers.lt50', min: 0, max: 50 },
  { id: 'c50to100', labelKey: 'filters.copiers.c50to100', min: 50, max: 100 },
  { id: 'c100to1k', labelKey: 'filters.copiers.c100to1k', min: 100, max: 1000 },
  { id: 'gte1k', labelKey: 'filters.copiers.gte1k', min: 1000, max: null },
];

/** True if `value` falls inside any of the selected buckets. */
export function inAnyBucket<T extends string>(
  value: number,
  buckets: BucketDef<T>[],
  selected: Set<T>,
): boolean {
  for (const b of buckets) {
    if (!selected.has(b.id)) continue;
    if (value >= b.min && (b.max == null || value < b.max)) return true;
  }
  return false;
}
