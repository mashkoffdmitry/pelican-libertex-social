<script setup lang="ts">
import { computed } from 'vue';
import type { SignalKind } from '../types/api';
import type { Trade } from '../types/strategy';
import { fmtTradeTime, fmtMoneyFull } from '../utils/format';

const props = defineProps<{
  kind: SignalKind;
  trades: Trade[] | null;
  loading: boolean;
  locale: string;
}>();

const title = computed(() => (props.kind === 'open' ? 'Open Trades' : 'Trade History (30d)'));
const empty = computed(
  () => !props.loading && (props.trades == null || props.trades.length === 0),
);
</script>

<template>
  <div class="pelican-trades">
    <div class="hd">{{ title }}</div>
    <div v-if="loading" class="dim">Loading…</div>
    <div v-else-if="empty" class="dim">No trades.</div>
    <ul v-else class="list">
      <li v-for="(t, i) in trades ?? []" :key="i">
        <span class="market">{{ t.MarketName ?? '—' }}</span>
        <span class="dir" :class="t.Direction === 'Sell' ? 'red' : 'green'">{{ t.Direction ?? '' }}</span>
        <span class="trade-time">
          {{ fmtTradeTime(t.OpenTimestamp, locale) }}
          <template v-if="t.CloseTimestamp"> → {{ fmtTradeTime(t.CloseTimestamp, locale) }}</template>
        </span>
        <span v-if="t.Pnl != null" class="pnl" :class="t.Pnl >= 0 ? 'green' : 'red'">
          {{ fmtMoneyFull(t.Pnl, locale) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pelican-trades {
  padding: 12px 16px;
  background: var(--sage-2);
  border-radius: 8px;
}
.hd {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.list li {
  display: grid;
  grid-template-columns: minmax(80px, 1.4fr) auto 1.6fr auto;
  gap: 8px;
  align-items: baseline;
}
.market {
  color: var(--text);
  font-weight: 500;
}
.dir {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
}
.trade-time {
  color: var(--muted);
}
.pnl {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.green {
  color: var(--green);
}
.red {
  color: var(--red);
}
.dim {
  color: var(--muted);
}
</style>
