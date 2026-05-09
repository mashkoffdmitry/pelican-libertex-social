<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '../composables/useI18n';
import { SORT_KEYS, type SortKey } from '../constants/sort';
import { LOCALE_KEY } from '../injection-keys';

const props = defineProps<{
  sortKey: SortKey;
  total: number;
  filteredTotal: number;
  page: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  (e: 'update:sortKey', v: SortKey): void;
  (e: 'refresh'): void;
  (e: 'toggle-filters'): void;
}>();

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
    <div class="sort">
      <label>{{ t('toolbar.sort') }}</label>
      <select :value="sortKey" @change="onSort">
        <option v-for="k in SORT_KEYS" :key="k" :value="k">{{ t(`sort.${k}`) }}</option>
      </select>
    </div>
    <button
      class="btn-flat reload-btn"
      type="button"
      :title="t('toolbar.reload.title')"
      @click="emit('refresh')"
    >
      {{ t('toolbar.reload') }}
    </button>
  </div>
</template>

<style scoped>
/* Toolbar spans the full width above the filters/list grid */
.pelican-toolbar {
  grid-column: 1 / -1;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 0 4px;
  font-size: 13px;
}

.counts {
  color: var(--muted);
  font-size: 13px;
}
.counts :deep(b) {
  color: var(--text);
  font-weight: 700;
}

.sort {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
}
.sort select {
  padding: 7px 10px;
  background: var(--input-bg);
  color: var(--text);
  border: 1.5px solid var(--line);
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color .15s, color .15s;
}
.sort select:hover { border-color: var(--orange); }

.btn-flat {
  display: inline-block;
  padding: 8px 12px;
  background: var(--input-bg);
  color: var(--text);
  border: 1.5px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: border-color .15s, color .15s, transform .25s cubic-bezier(.2, .8, .2, 1);
}
.btn-flat:hover {
  border-color: var(--orange);
  color: var(--orange);
  transform: translateY(-1px);
}
.btn-flat:active { transform: translateY(0); }

.filters-toggle { display: none; }

@media (max-width: 720px) {
  .pelican-toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 4px 10px;
  }
  .counts {
    font-size: 12px;
    flex-basis: 100%;
    order: 3;
  }
  .sort label { display: none; }
  .sort select { font-size: 12px; padding: 6px 8px; }
  .filters-toggle { display: inline-flex; align-items: center; }
}
</style>
