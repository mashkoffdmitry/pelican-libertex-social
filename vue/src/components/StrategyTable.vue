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
/* ----- Table card (frosted glass) ----- */
.pelican-table {
  background: rgba(24, 28, 34, .55);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
          backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, .35),
    inset 0 1px 0 rgba(255, 255, 255, .12),
    inset 0 -1px 0 rgba(0, 0, 0, .18);
  position: relative;
  min-width: 0;
}
:global(.pelican-libsoc[data-theme="light"]) .pelican-table {
  background: rgba(255, 255, 255, .62);
  border-color: rgba(0, 0, 0, .06);
  box-shadow:
    0 8px 32px rgba(20, 30, 20, .08),
    inset 0 1px 0 rgba(255, 255, 255, .85),
    inset 0 -1px 0 rgba(0, 0, 0, .04);
}
.pelican-table::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: .06;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

/* ----- Head row (frosted, dim sage tint) ----- */
.row.head {
  display: grid;
  grid-template-columns:
    minmax(180px, 1.6fr)  /* name */
    minmax(120px, 1.1fr)  /* sparkline */
    100px                 /* return */
    80px                  /* copiers */
    120px                 /* AUM */
    100px                 /* maxDD */
    70px                  /* age */
    100px                 /* balance */
    80px                  /* fee */
    104px;                /* signal link */
  gap: 12px;
  padding: 14px 20px;
  background: rgba(42, 52, 51, .50);
  -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: .1px;
  position: relative;
  z-index: 1;
}
:global(.pelican-libsoc[data-theme="light"]) .row.head {
  background: rgba(220, 225, 220, .55);
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.row.head .c-num {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  text-align: right;
}
.row.head .sortable {
  cursor: pointer;
  user-select: none;
  transition: color .2s;
}
.row.head .sortable:hover { color: var(--orange); }
.row.head .sortable::after {
  content: '⇅';
  font-size: 10px;
  color: var(--muted-2);
  transition: color .2s, transform .2s;
}
.row.head .sortable.active-asc::after  { content: '↑'; color: var(--orange); }
.row.head .sortable.active-desc::after { content: '↓'; color: var(--orange); }

.empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
  position: relative;
  z-index: 1;
}

/* ---- compact desktop ---- */
@media (max-width: 1700px) {
  .row.head {
    grid-template-columns:
      minmax(140px, 1.4fr)
      minmax(95px, 1fr)
      78px 62px 97px 82px 50px 85px 62px 105px;
    padding: 12px 14px;
    gap: 10px;
    font-size: 12px;
  }
}

/* ---- below ~1340: tighter columns ---- */
@media (max-width: 1340px) {
  .row.head {
    grid-template-columns:
      minmax(140px, 1.3fr)
      minmax(85px, 0.9fr)
      70px 55px 90px 75px 50px 80px 55px 92px;
    padding: 10px 12px;
    gap: 8px;
  }
}

/* ---- mobile: hide head, rows render as cards ---- */
@media (max-width: 720px) {
  .pelican-table { border-radius: 10px; }
  .row.head { display: none; }
}
</style>
