<script setup lang="ts">
import { computed } from 'vue';
import StrategyRow from './StrategyRow.vue';
import Pager from './Pager.vue';
import { useI18n } from '../composables/useI18n';
import type { Strategy, Trade } from '../types/strategy';
import type { SignalKind } from '../types/api';
import type { SortColumn, SortKey } from '../constants/sort';

const props = defineProps<{
  pageItems: Strategy[];
  expanded: Set<number>;
  sortKey: SortKey;
  page: number;
  totalPages: number;
  pageRange: (number | '…')[];
  openSignals: Map<number, { loading: boolean; trades: Trade[] | null }>;
  closedSignals: Map<number, { loading: boolean; trades: Trade[] | null }>;
}>();

const emit = defineEmits<{
  (e: 'toggle-row', id: number): void;
  (e: 'toggle-sort', col: SortColumn): void;
  (e: 'load-trades', payload: { id: number; kind: SignalKind }): void;
  (e: 'select', s: Strategy): void;
  (e: 'go', target: number | 'prev' | 'next'): void;
}>();

const { t } = useI18n();

// Computed (not const) so labels reactively re-render on language change.
const sortable = computed<{ key: SortColumn; label: string }[]>(() => [
  { key: 'return', label: t('table.return') },
  { key: 'copiers', label: t('table.copiers') },
  { key: 'aum', label: t('table.copiersAUM') },
  { key: 'dd', label: t('table.maxDrawdown') },
  { key: 'age', label: t('table.age') },
  { key: 'balance', label: t('table.balance') },
  { key: 'fee', label: t('table.mgmtFee') },
]);

function sortClass(col: SortColumn): string {
  if (props.sortKey === `${col}-asc`) return 'active-asc';
  if (props.sortKey === `${col}-desc`) return 'active-desc';
  return '';
}
</script>

<template>
  <section class="pelican-table">
    <div class="row head">
      <div>{{ t('table.name') }}</div>
      <div>{{ t('table.equityCurve') }}</div>
      <div
        v-for="col in sortable"
        :key="col.key"
        class="c-num sortable"
        :class="sortClass(col.key)"
        @click="emit('toggle-sort', col.key)"
      >
        {{ col.label }}
      </div>
      <div></div>
    </div>

    <div v-if="pageItems.length === 0" class="empty">
      <slot name="empty">{{ t('table.empty') }}</slot>
    </div>
    <template v-else>
      <StrategyRow
        v-for="s in pageItems"
        :key="s.Id"
        :s="s"
        :expanded="expanded.has(s.Id)"
        :open-trades="openSignals.get(s.Id) ?? null"
        :closed-trades="closedSignals.get(s.Id) ?? null"
        @toggle="emit('toggle-row', s.Id)"
        @load-trades="(kind) => emit('load-trades', { id: s.Id, kind })"
        @select="emit('select', s)"
      >
        <template #row-actions="slotProps">
          <slot name="row-actions" v-bind="slotProps" />
        </template>
      </StrategyRow>
    </template>

    <Pager
      :page="page"
      :total-pages="totalPages"
      :range="pageRange"
      @go="(t) => emit('go', t)"
    />
  </section>
</template>

<style scoped>
.pelican-table {
  min-width: 0;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
          backdrop-filter: blur(14px) saturate(140%);
  box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, .10), inset 0 -1px 0 rgba(0, 0, 0, .18);
}
.row.head {
  display: grid;
  grid-template-columns: minmax(160px, 1.6fr) minmax(120px, 1fr) repeat(7, minmax(70px, 0.8fr)) 112px;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-head-bg);
  -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--glass-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--fg-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.row.head .c-num {
  text-align: right;
}
.row.head .sortable {
  cursor: pointer;
  user-select: none;
}
.row.head .sortable:hover {
  color: var(--fg);
}
.row.head .sortable.active-asc::after {
  content: ' ↑';
  color: var(--accent);
}
.row.head .sortable.active-desc::after {
  content: ' ↓';
  color: var(--accent);
}
.empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--fg-3);
}
@media (max-width: 720px) {
  .row.head {
    display: none;
  }
}
</style>
