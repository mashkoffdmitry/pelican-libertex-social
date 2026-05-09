<script setup lang="ts">
import { onMounted, provide, reactive, ref, toRef, watch } from 'vue';
import Toolbar from './components/Toolbar.vue';
import FiltersPanel from './components/FiltersPanel.vue';
import StrategyTable from './components/StrategyTable.vue';
import ProgressBar from './components/ProgressBar.vue';
import WelcomeModal from './components/WelcomeModal.vue';
import { useTheme } from './composables/useTheme';
import { useCatalog } from './composables/useCatalog';
import { useFilters } from './composables/useFilters';
import { useSort } from './composables/useSort';
import { usePagination } from './composables/usePagination';
import { useSignals } from './composables/useSignals';
import { provideI18n } from './composables/useI18n';
import { useDebounce } from './composables/useDebounce';
import { defaultFilters, type FiltersState } from './types/filters';
import type { Strategy } from './types/strategy';
import type { ThemeMode } from './types/columns';
import type { ColumnKey } from './types/columns';
import type { SignalKind } from './types/api';
import type { PelicanError } from './utils/http';
import type { SortKey, SortColumn } from './constants/sort';
import type { Lang } from './i18n/translations';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from './constants/defaults';
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
    /**
     * Show the first-visit welcome modal. Defaults to true; the modal
     * suppresses itself for 30 minutes after dismissal via localStorage.
     */
    welcomeModal?: boolean;
  }>(),
  {
    theme: 'auto',
    lang: 'en',
    defaultSort: 'return-desc',
    locale: 'en-US',
    pageSize: PAGE_SIZE,
    welcomeModal: true,
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

// Search lives in the header now (matches fork layout). It feeds the
// same filters.search field that Toolbar's search used to update.
const searchLocal = ref(filtersApi.filters.search);
watch(
  () => filtersApi.filters.search,
  (v) => { if (v !== searchLocal.value) searchLocal.value = v; },
);
const { wrapped: debounceSearch } = useDebounce(
  (v: string) => patchFilters({ search: v }),
  SEARCH_DEBOUNCE_MS,
);
function onSearchInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  searchLocal.value = v;
  debounceSearch(v);
}

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
        <a class="brand" href="#" @click.prevent="">
          <span class="logo-tile" aria-hidden="true">
            <!-- :src binding so Vite/Rollup doesn't try to resolve the path
                 at build time. The asset is served by the proxy at runtime. -->
            <img :src="'/logo.png'" alt="" />
          </span>
          <span class="brand-text">
            <span class="brand-name">
              <span>{{ t('app.brand.line1') }}</span>
              <span>{{ t('app.brand.line2') }}</span>
            </span>
            <span class="brand-sub">{{ t('app.brand.sub') }}</span>
          </span>
        </a>
      </slot>

      <input
        class="header-search"
        type="search"
        :placeholder="t('toolbar.search.placeholder')"
        autocomplete="off"
        :value="searchLocal"
        @input="onSearchInput"
      />

      <button
        class="lang-toggle"
        type="button"
        :title="t('toggle.lang.title')"
        :aria-label="t('toggle.lang.title')"
        @click="i18n.cycleLang"
      >
        {{ i18n.lang.value === 'ru' ? 'EN' : 'RU' }}
      </button>
      <button
        class="theme-toggle"
        type="button"
        :title="t('toggle.theme.title')"
        :aria-label="t('toggle.theme.title')"
        @click="themeApi.cycle"
      >
        <span class="theme-icon" aria-hidden="true">
          {{ themeApi.resolved.value === 'dark' ? '🌙' : '☀️' }}
        </span>
      </button>
    </header>

    <WelcomeModal v-if="welcomeModal" />

    <main class="pelican-main">
      <Toolbar
        :sort-key="sortApi.sortKey.value"
        :total="catalog.total.value"
        :filtered-total="filtersApi.filtered.value.length"
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        @update:sort-key="(k) => sortApi.setKey(k)"
        @refresh="catalog.refresh"
        @toggle-filters="filtersOpen = !filtersOpen"
      />

      <FiltersPanel
        :filters="filtersApi.filters"
        :invest-amount="investAmount"
        :open="filtersOpen"
        @update:filters="patchFilters"
        @update:invest-amount="(v) => (investAmount = v)"
        @reset="resetFilters"
      />

      <section class="pelican-list-wrap">
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

        <ProgressBar
          :loaded="catalog.loaded.value"
          :total="catalog.total.value"
          :active="catalog.building.value && !catalog.ready.value"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ----- Header (sticky, frosted glass) ----- */
.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 28px;
  background: rgba(20, 23, 28, .62);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
          backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .12),
    inset 0 -1px 0 rgba(0, 0, 0, .18);
}
.pelican-libsoc[data-theme="light"] .brand-row {
  background: rgba(255, 255, 255, .62);
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .7),
    inset 0 -1px 0 rgba(0, 0, 0, .04);
}

/* ----- Brand block (logo + text) ----- */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  font-family: 'Mont', 'Manrope', sans-serif;
}
.logo-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(239, 124, 70, .25);
  transition: transform .35s cubic-bezier(.2, .8, .2, 1), box-shadow .25s;
}
.logo-tile img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.brand:hover .logo-tile {
  transform: scale(1.06) rotate(-3deg);
  box-shadow: 0 4px 16px rgba(239, 124, 70, .40);
}
.brand-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
/* Figma text-16 / text-17 — exact metrics from typography.css */
.brand-name {
  display: flex;
  flex-direction: column;
  font-weight: 800;
  font-size: 19.13px;
  line-height: 19.13px;
  letter-spacing: 0;
  color: var(--text);
  text-transform: uppercase;
}
.brand-name span {
  display: block;
  white-space: nowrap;
}
.brand-sub {
  font-weight: 600;
  font-size: 12.46px;
  line-height: 13.7px;
  letter-spacing: 0.02em;
  color: var(--muted);
  white-space: nowrap;
}

/* ----- Header search ----- */
.header-search {
  flex: 1;
  max-width: 520px;
  padding: 10px 14px;
  background: var(--input-bg);
  color: var(--text);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color .15s, box-shadow .25s;
}
.header-search::placeholder {
  color: var(--muted-2);
}
.header-search:focus {
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgba(239, 124, 70, .18);
}

/* ----- Lang + theme toggles ----- */
.lang-toggle,
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  background: transparent;
  cursor: pointer;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  font-family: inherit;
  line-height: 1;
  transition: border-color .15s, background .15s, color .15s, transform .25s cubic-bezier(.2, .8, .2, 1);
}
.lang-toggle {
  margin-left: auto;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.theme-toggle {
  width: 38px;
  font-size: 16px;
}
.lang-toggle:hover {
  border-color: var(--orange);
  color: var(--orange);
}
.theme-toggle:hover {
  border-color: var(--orange);
  transform: rotate(20deg);
}
.theme-icon {
  display: inline-block;
  transform: translateY(-1px);
}

/* ----- Main grid: filters sidebar + list ----- */
.pelican-main {
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: auto 1fr;
  gap: 18px 24px;
  padding: 24px 28px 60px;
  max-width: 1640px;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.pelican-list-wrap {
  min-width: 0;
}

/* ---- compact desktop: fits common laptops 1366/1440/1536/1600 ---- */
@media (max-width: 1700px) {
  .pelican-main {
    grid-template-columns: 280px 1fr;
    gap: 14px 18px;
    padding: 20px 20px 50px;
  }
}

/* ---- below ~1340: sidebar stacks above the table ---- */
@media (max-width: 1340px) {
  .pelican-main {
    grid-template-columns: 1fr;
    padding: 14px 14px 50px;
    gap: 12px;
  }
}

/* ---- mobile (≤720px) ---- */
@media (max-width: 720px) {
  .brand-row {
    padding: 10px 14px;
    gap: 10px;
    -webkit-backdrop-filter: blur(10px) saturate(150%);
            backdrop-filter: blur(10px) saturate(150%);
  }
  .logo-tile {
    width: 38px;
    height: 38px;
    border-radius: 8px;
  }
  .brand-name {
    font-size: 14px;
    line-height: 14px;
  }
  .brand-sub {
    font-size: 9.5px;
    line-height: 11px;
  }
  .header-search {
    padding: 8px 10px;
    font-size: 13px;
    max-width: none;
    min-width: 0;
  }
  .theme-toggle {
    width: 34px;
    height: 34px;
    font-size: 14px;
  }
  .lang-toggle {
    height: 34px;
    padding: 0 9px;
    font-size: 12px;
  }
  .pelican-main {
    padding: 12px;
    gap: 12px;
  }
}
</style>
