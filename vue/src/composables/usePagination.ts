import { computed, ref, watch, type Ref } from 'vue';

export interface UsePaginationReturn<T> {
  page: Ref<number>;
  totalPages: Ref<number>;
  pageItems: Ref<T[]>;
  pageRange: Ref<(number | '…')[]>;
  setPage(p: number): void;
  next(): void;
  prev(): void;
}

export function usePagination<T>(source: Ref<T[]>, pageSize: number): UsePaginationReturn<T> {
  const page = ref(1);

  const totalPages = computed(() => Math.max(1, Math.ceil(source.value.length / pageSize)));

  watch(totalPages, (tp) => {
    if (page.value > tp) page.value = tp;
    if (page.value < 1) page.value = 1;
  });

  const pageItems = computed<T[]>(() => {
    const start = (page.value - 1) * pageSize;
    return source.value.slice(start, start + pageSize);
  });

  const pageRange = computed<(number | '…')[]>(() => {
    const cur = page.value;
    const total = totalPages.value;
    if (total <= 1) return [];
    const set = new Set<number>([1, total, cur, cur - 1, cur + 1, cur - 2, cur + 2, 2, total - 1]);
    const arr = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i && arr[i] - arr[i - 1] > 1) out.push('…');
      out.push(arr[i]);
    }
    return out;
  });

  return {
    page,
    totalPages,
    pageItems,
    pageRange,
    setPage: (p: number) => {
      page.value = Math.max(1, Math.min(totalPages.value, p));
    },
    next: () => {
      if (page.value < totalPages.value) page.value += 1;
    },
    prev: () => {
      if (page.value > 1) page.value -= 1;
    },
  };
}
