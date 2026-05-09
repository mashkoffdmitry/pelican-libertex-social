<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useDebounce } from '../composables/useDebounce';
import { useI18n } from '../composables/useI18n';
import { SEARCH_DEBOUNCE_MS } from '../constants/defaults';
import { SORT_KEYS, type SortKey } from '../constants/sort';
import { LOCALE_KEY } from '../injection-keys';

const props = defineProps<{
  search: string;
  sortKey: SortKey;
  total: number;
  filteredTotal: number;
  page: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  (e: 'update:search', v: string): void;
  (e: 'update:sortKey', v: SortKey): void;
  (e: 'refresh'): void;
  (e: 'toggle-filters'): void;
}>();

const local = ref(props.search);
watch(
  () => props.search,
  (v) => {
    if (v !== local.value) local.value = v;
  },
);

const { wrapped: debounced } = useDebounce((v: string) => emit('update:search', v), SEARCH_DEBOUNCE_MS);

function onSearchInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  local.value = v;
  debounced(v);
}

function onSort(e: Event) {
  emit('update:sortKey', (e.target as HTMLSelectElement).value as SortKey);
}

const { t } = useI18n();
const numLocale = inject(LOCALE_KEY, 'en-US');
const countsHtml = computed(() =>
  t('toolbar.counts.html', {
    filtered: props.filteredTotal.toLocaleString(numLocale),
    total: props.total.toLocaleString(numLocale),
    page: props.page,
    totalPages: props.totalPages,
  }),
);
</script>

<template>
  <div class="pelican-toolbar">
    <button class="btn-flat filters-toggle" type="button" @click="emit('toggle-filters')">
      {{ t('toolbar.filters') }}
    </button>
    <div class="counts" v-html="countsHtml" />
    <input
      class="search"
      type="search"
      :placeholder="t('toolbar.search.placeholder')"
      autocomplete="off"
      :value="local"
      @input="onSearchInput"
    />
    <div class="sort">
      <label>{{ t('toolbar.sort') }}</label>
      <select :value="sortKey" @change="onSort">
        <option v-for="k in SORT_KEYS" :key="k" :value="k">{{ t(`sort.${k}`) }}</option>
      </select>
    </div>
    <button class="btn-flat" type="button" :title="t('toolbar.reload.title')" @click="emit('refresh')">
      {{ t('toolbar.reload') }}
    </button>
  </div>
</template>

<style scoped>
.pelican-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--header-bg);
}
.btn-flat {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--text);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}
.btn-flat:hover {
  border-color: var(--orange);
}
.filters-toggle {
  display: none;
}
.counts {
  color: var(--muted);
  font-size: 13px;
}
.counts b {
  color: var(--text);
}
.search {
  flex: 1 1 220px;
  min-width: 160px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text);
  font: inherit;
}
.search:focus {
  outline: none;
  border-color: var(--orange);
}
.sort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
}
.sort select {
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text);
  font: inherit;
}
@media (max-width: 720px) {
  .filters-toggle {
    display: inline-flex;
  }
}
</style>
