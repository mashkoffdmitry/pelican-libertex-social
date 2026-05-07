<script setup lang="ts">
import StrategyRow from './StrategyRow.vue';
import Pager from './Pager.vue';
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

const SORTABLE: { key: SortColumn; label: string }[] = [
  { key: 'return', label: 'Return %' },
  { key: 'copiers', label: 'Copiers' },
  { key: 'aum', label: 'Copiers AUM' },
  { key: 'dd', label: 'Max Drawdown' },
  { key: 'age', label: 'Age' },
  { key: 'balance', label: 'Balance' },
  { key: 'fee', label: 'Mgmt Fee %' },
];

function sortClass(col: SortColumn): string {
  if (props.sortKey === `${col}-asc`) return 'active-asc';
  if (props.sortKey === `${col}-desc`) return 'active-desc';
  return '';
}
</script>

<template>
  <section class="pelican-table">
    <div class="row head">
      <div>Name</div>
      <div>Equity curve</div>
      <div
        v-for="col in SORTABLE"
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
      <slot name="empty">No matches.</slot>
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
  flex: 1;
  min-width: 0;
}
.row.head {
  display: grid;
  grid-template-columns: minmax(160px, 1.6fr) minmax(120px, 1fr) repeat(7, minmax(70px, 0.8fr)) auto;
  gap: 12px;
  padding: 12px 16px;
  background: var(--sage-2);
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
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
  color: var(--text);
}
.row.head .sortable.active-asc::after {
  content: ' ↑';
  color: var(--orange);
}
.row.head .sortable.active-desc::after {
  content: ' ↓';
  color: var(--orange);
}
.empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
}
@media (max-width: 720px) {
  .row.head {
    display: none;
  }
}
</style>
