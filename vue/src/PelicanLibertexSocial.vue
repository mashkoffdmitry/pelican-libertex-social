<script setup lang="ts">
import { onMounted, provide, reactive, ref, toRef, watch } from 'vue';
import Toolbar from './components/Toolbar.vue';
import FiltersPanel from './components/FiltersPanel.vue';
import StrategyTable from './components/StrategyTable.vue';
import ProgressBar from './components/ProgressBar.vue';
import { useTheme } from './composables/useTheme';
import { useCatalog } from './composables/useCatalog';
import { useFilters } from './composables/useFilters';
import { useSort } from './composables/useSort';
import { usePagination } from './composables/usePagination';
import { useSignals } from './composables/useSignals';
import { provideI18n } from './composables/useI18n';
import type { Lang } from './i18n/translations';
import { defaultFilters, type FiltersState } from './types/filters';
import type { Strategy } from './types/strategy';
import type { ThemeMode } from './types/columns';
// `columns` is reserved for a future column-visibility API; type intentionally re-exported.
import type { ColumnKey } from './types/columns';
import type { SignalKind } from './types/api';
import type { PelicanError } from './utils/http';
import type { SortKey, SortColumn } from './constants/sort';
import { PAGE_SIZE } from './constants/defaults';
import { LOCALE_KEY, API_BASE_KEY, CATALOG_BASE_KEY } from './injection-keys';
import './styles/index.css';

const props = withDefaults(
  defineProps<{
    apiBase: string;
    /**
     * Optional separate origin for the *static* catalog endpoints
     * (`/api/strategies-full` and `/api/strategies-full/progress`). When set,
     * the catalog is fetched from this URL — typically a Cloudflare Worker
     * fronting an R2 bucket — while live per-strategy data continues to go
     * through `apiBase`.
     */
    catalogBase?: string;
    theme?: ThemeMode;
    /**
     * UI language. Persists in localStorage['pelican-lang']. The toggle
     * in the header cycles between supported languages at runtime.
     */
    lang?: Lang;
    defaultSort?: SortKey;
    defaultFilters?: Partial<FiltersState>;
    columns?: ColumnKey[]; // reserved; not yet wired through
    locale?: string;
    pageSize?: number;
  }>(),
  {
    theme: 'auto',
    lang: 'en',
    defaultSort: 'return-desc',
    locale: 'en-US',
    pageSize: PAGE_SIZE,
  },
);

const emit = defineEmits<{
  (e: 'update:theme', m: ThemeMode): void;
  (e: 'update:lang', l: Lang): void;
  (e: 'select-strategy', s: Strategy): void;
  (e: 'error', err: PelicanError): void;
}>();

provide(API_BASE_KEY, props.apiBase);
provide(CATALOG_BASE_KEY, props.catalogBase ?? props.apiBase);
provide(LOCALE_KEY, props.locale);

const apiBaseRef = toRef(props, 'apiBase');
const catalogBaseRef = toRef(props, 'catalogBase');

const themeApi = useTheme(props.theme);
watch(themeApi.mode, (m) => emit('update:theme', m));
watch(
  () => props.theme,
  (t) => themeApi.setMode(t),
);

const i18n = provideI18n(props.lang);
watch(i18n.lang, (l) => emit('update:lang', l));
watch(
  () => props.lang,
  (l) => i18n.setLang(l),
);
const t = i18n.t;

const catalog = useCatalog({
  apiBase: apiBaseRef,
  catalogBase: catalogBaseRef,
  onError: (e) => emit('error', e),
});

const filtersApi = useFilters(catalog.catalog, props.defaultFilters ?? {});
const sortApi = useSort(filtersApi.filtered, props.defaultSort);
const pagination = usePagination<Strategy>(sortApi.sorted, props.pageSize);

const signals = useSignals(apiBaseRef);

watch(pagination.pageItems, (items) => {
  items.forEach((s) => { if (!s.History?.length) void catalog.enrichOne(s.Id); });
}, { immediate: true });

const expanded = reactive(new Set<number>());
const filtersOpen = ref(false);
const investAmount = ref<number | null>(null);

function toggleRow(id: number) {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);

  const s = catalog.catalog.value.find((x) => x.Id === id);
  if (s) {
    if ((!s._meta || !s._stats) && !s._enrichAttempted) void catalog.enrichOne(id);
    emit('select-strategy', s);
  }
}

function toggleSort(col: SortColumn) {
  sortApi.toggleColumn(col);
  pagination.setPage(1);
}

function patchFilters(p: Partial<FiltersState>) {
  Object.assign(filtersApi.filters, p);
  pagination.setPage(1);
}

function resetFilters() {
  const fresh = defaultFilters();
  Object.assign(filtersApi.filters, fresh);
  filtersApi.filters.risk = fresh.risk;
  investAmount.value = null;
  pagination.setPage(1);
}

function loadTrades({ id, kind }: { id: number; kind: SignalKind }) {
  void signals.load(id, kind);
}

function onPageGo(target: number | 'prev' | 'next') {
  if (target === 'prev') pagination.prev();
  else if (target === 'next') pagination.next();
  else pagination.setPage(target);
}

onMounted(() => catalog.start());
</script>

<template>
  <div class="pelican-libsoc" :data-theme="themeApi.resolved.value">
    <header class="brand-row">
      <slot name="brand">
        <div class="default-brand">{{ t('app.brand') }}</div>
      </slot>
      <button class="lang-toggle" type="button" :title="i18n.lang.value" @click="i18n.cycleLang">
        {{ i18n.lang.value.toUpperCase() }}
      </button>
      <button class="theme-toggle" type="button" :title="themeApi.mode.value" @click="themeApi.cycle">
        <span aria-hidden="true">{{ themeApi.resolved.value === 'dark' ? '🌙' : '☀️' }}</span>
      </button>
    </header>

    <Toolbar
      :search="filtersApi.filters.search"
      :sort-key="sortApi.sortKey.value"
      :total="catalog.total.value"
      :filtered-total="filtersApi.filtered.value.length"
      :page="pagination.page.value"
      :total-pages="pagination.totalPages.value"
      @update:search="(v) => patchFilters({ search: v })"
      @update:sort-key="(k) => sortApi.setKey(k)"
      @refresh="catalog.refresh"
      @toggle-filters="filtersOpen = !filtersOpen"
    />

    <ProgressBar
      :loaded="catalog.loaded.value"
      :total="catalog.total.value"
      :active="catalog.building.value && !catalog.ready.value"
    />

    <main class="pelican-main">
      <FiltersPanel
        :filters="filtersApi.filters"
        :invest-amount="investAmount"
        :open="filtersOpen"
        @update:filters="patchFilters"
        @update:invest-amount="(v) => (investAmount = v)"
        @reset="resetFilters"
      />

      <StrategyTable
        :page-items="pagination.pageItems.value"
        :expanded="expanded"
        :sort-key="sortApi.sortKey.value"
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :page-range="pagination.pageRange.value"
        :open-signals="signals.open.value"
        :closed-signals="signals.closed.value"
        @toggle-row="toggleRow"
        @toggle-sort="toggleSort"
        @load-trades="loadTrades"
        @select="(s) => emit('select-strategy', s)"
        @go="onPageGo"
      >
        <template #empty>
          <slot name="empty">{{ t('table.empty') }}</slot>
        </template>
        <template #row-actions="slotProps">
          <slot name="row-actions" v-bind="slotProps" />
        </template>
      </StrategyTable>
    </main>
  </div>
</template>

<style scoped>
.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--line);
}
.default-brand {
  font-weight: 700;
  color: var(--text);
}
.lang-toggle,
.theme-toggle {
  height: 38px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font: inherit;
}
.lang-toggle {
  margin-left: auto;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.theme-toggle {
  width: 38px;
  font-size: 16px;
}
.lang-toggle:hover,
.theme-toggle:hover {
  border-color: var(--orange);
}
.pelican-main {
  display: flex;
  flex: 1;
  min-height: 0;
}
@media (max-width: 720px) {
  .pelican-main {
    flex-direction: column;
  }
}
</style>
