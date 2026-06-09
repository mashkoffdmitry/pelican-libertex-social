<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';
import type { SignalKind } from '../types/api';
import type { Trade } from '../types/strategy';
import { fmtTradeTime, fmtMoneyFull } from '../utils/format';

const props = defineProps<{
  kind: SignalKind;
  trades: Trade[] | null;
  loading: boolean;
  locale: string;
}>();

const { t } = useI18n();

const title = computed(() =>
  props.kind === 'open' ? t('tradesPanel.openTrades') : t('tradesPanel.tradeHistory'),
);
const empty = computed(
  () => !props.loading && (props.trades == null || props.trades.length === 0),
);

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString(props.locale, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
}

// Map raw API trades to display rows. Open trades use CurrentPrice/UnrealisedProfit,
// closed trades use ClosePrice/CloseTimestamp/RealisedProfit.
const rows = computed(() => {
  const closed = props.kind === 'closed';
  return (props.trades ?? []).map((tr) => {
    const pnlV = closed ? tr.RealisedProfit : tr.UnrealisedProfit;
    const exit = closed ? tr.ClosePrice : tr.CurrentPrice;
    return {
      dir: (tr.Direction ?? '').toUpperCase(),
      dirCls: String(tr.Direction).toLowerCase() === 'sell' ? 'dir-sell' : 'dir-buy',
      qty: tr.Quantity ?? null,
      inst: tr.Instrument ?? '—',
      openPrice: fmtPrice(tr.OpenPrice),
      exitPrice: fmtPrice(exit),
      openTime: fmtTradeTime(tr.OpenTimestamp, props.locale),
      closeTime: closed && tr.CloseTimestamp ? fmtTradeTime(tr.CloseTimestamp, props.locale) : null,
      tradeId: tr.TradeId != null ? String(tr.TradeId) : null,
      pnlText: pnlV == null ? '—' : fmtMoneyFull(pnlV, props.locale),
      pnlCls: pnlV == null ? 'dim' : pnlV >= 0 ? 'green' : 'red',
    };
  });
});
</script>

<template>
  <div class="pelican-trades">
    <div class="hd">{{ title }}</div>
    <div v-if="loading" class="dim">{{ t('tradesPanel.loading') }}</div>
    <div v-else-if="empty" class="dim">{{ t('tradesPanel.empty') }}</div>
    <ul v-else class="list">
      <li v-for="(r, i) in rows" :key="i" class="trade">
        <div class="trade-main">
          <span class="trade-dir" :class="r.dirCls">{{ r.dir }}</span>
          <span v-if="r.qty != null" class="trade-qty">{{ r.qty }}</span>
          <span class="trade-inst">{{ r.inst }}</span>
          <span class="trade-prices">@ {{ r.openPrice }} → {{ r.exitPrice }}</span>
        </div>
        <div class="trade-pnl" :class="r.pnlCls">{{ r.pnlText }}</div>
        <div class="trade-meta">
          <span class="trade-time">
            {{ r.openTime }}<template v-if="r.closeTime"> → {{ r.closeTime }}</template>
          </span>
          <span v-if="r.tradeId" class="trade-id">#{{ r.tradeId }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pelican-trades {
  padding: 12px 16px;
  background: var(--surface-2);
  border-radius: 8px;
}
.hd {
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--fg);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
}
.list::-webkit-scrollbar { width: 8px; }
.list::-webkit-scrollbar-track { background: transparent; }
.list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.trade {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 14px;
  row-gap: 3px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.3;
}
.trade-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  grid-row: 1;
  grid-column: 1;
}
.trade-dir {
  font-weight: 700;
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: .5px;
  line-height: 1.4;
}
.trade-dir.dir-buy { color: #4a90e2; background: rgba(74, 144, 226, .14); }
.trade-dir.dir-sell { color: var(--down); background: rgba(239, 120, 120, .14); }
.trade-qty { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--fg); }
.trade-inst { font-weight: 600; color: var(--fg); }
.trade-prices { color: var(--fg-3); font-variant-numeric: tabular-nums; }
.trade-meta {
  grid-row: 2;
  grid-column: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  color: var(--fg-3);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}
.trade-pnl {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.green { color: var(--up); }
.red { color: var(--down); }
.dim { color: var(--fg-3); }
</style>
