<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import Sparkline from './Sparkline.vue';
import MarketsDonut from './MarketsDonut.vue';
import TradesPanel from './TradesPanel.vue';
import { useI18n } from '../composables/useI18n';
import type { Strategy } from '../types/strategy';
import type { SignalKind } from '../types/api';
import {
  ageDays,
  fmtFee as fmtFeeRaw,
  fmtMoney,
  fmtMoneyFull,
  fmtNum,
  fmtPct,
  initials,
} from '../utils/format';
import { winrate } from '../utils/winrate';
import { LOCALE_KEY } from '../injection-keys';

const props = defineProps<{
  s: Strategy;
  expanded: boolean;
  openTrades: { loading: boolean; trades: import('../types/strategy').Trade[] | null } | null;
  closedTrades: { loading: boolean; trades: import('../types/strategy').Trade[] | null } | null;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'load-trades', kind: SignalKind): void;
  (e: 'select'): void;
}>();

const locale = inject(LOCALE_KEY, 'en-US');
const { t } = useI18n();

const ret = computed(() => fmtPct(props.s.Return, 1));
const dd = computed(() => (props.s.MaxDD != null ? fmtPct(props.s.MaxDD, 2) : null));
const age = computed(() => ageDays(props.s.Inception));
const wr = computed(() => winrate(props.s));
const lr = computed(() => (wr.value >= 0 ? 100 - wr.value : -1));
const profileName = computed(
  () => props.s.Profile?.Name ?? (props.s.Profile?.Id ? '#' + props.s.Profile.Id : ''),
);
const link = computed(() => `https://libertex.copy-trade.io/strategy/${props.s.Id}`);

// Localised wrappers around format.ts helpers — those are language-agnostic and
// return literal "free" / "5d" / "3mo". Translate at the call site so that
// switching language reactively updates the rendered text.
function fmtFee(s: Strategy): string {
  const raw = fmtFeeRaw(s);
  return raw === 'free' ? t('row.free') : raw;
}
function fmtAgeI18n(days: number | null): string {
  if (days == null) return '—';
  if (days < 30) return t('fmt.age.days', { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t('fmt.age.months', { n: months });
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days - years * 365) / 30);
  return remMonths
    ? t('fmt.age.yearsAndMonths', { y: years, m: remMonths })
    : t('fmt.age.years', { n: years });
}

const showOpen = ref(false);
const showClosed = ref(false);

function toggleOpen() {
  showOpen.value = !showOpen.value;
  if (showOpen.value && !props.openTrades) emit('load-trades', 'open');
}
function toggleClosed() {
  showClosed.value = !showClosed.value;
  if (showClosed.value && !props.closedTrades) emit('load-trades', 'closed');
}
</script>

<template>
  <div class="pelican-row" :class="{ open: expanded }" :data-id="s.Id" @click="emit('toggle')">
    <div class="name">
      <div class="avatar">
        <span class="avatar-fallback">{{ initials(s.Name) }}</span>
        <img
          v-if="s.ImageUploaded"
          class="avatar-img"
          :src="`https://assets.copy-trade.io/images/strategies/thumbnails/${s.Id}`"
          alt=""
          loading="lazy"
          decoding="async"
          @error="($event.target as HTMLImageElement).remove()"
        />
      </div>
      <div class="nm">
        <div class="title">
          {{ s.Name || '#' + s.Id }}
          <span v-if="s._meta && s.Fee == null" class="free-badge">{{ t('row.free') }}</span>
        </div>
        <div class="by">{{ profileName }}</div>
      </div>
    </div>
    <div class="c-spark" :data-label="t('row.dataLabel.equityCurve')">
      <Sparkline :history="s.History" />
    </div>
    <div class="c-num" :data-label="t('row.dataLabel.return')">
      <span v-if="ret" :class="ret.positive ? 'green' : 'red'">{{ ret.text }}</span>
      <span v-else>—</span>
    </div>
    <div class="c-num" :data-label="t('row.dataLabel.copiers')">{{ fmtNum(s.NumCopiers, locale) }}</div>
    <div class="c-num" :data-label="t('row.dataLabel.copiersAUM')">{{ fmtMoney(s.CopiersAUM, locale) }}</div>
    <div class="c-num" :data-label="t('row.dataLabel.maxDD')">
      <span v-if="dd" :class="dd.positive ? 'green' : 'red'">{{ dd.text }}</span>
      <span v-else>—</span>
    </div>
    <div class="c-num" :data-label="t('row.dataLabel.age')">{{ fmtAgeI18n(age) }}</div>
    <div class="c-num" :data-label="t('row.dataLabel.balance')">{{ fmtMoney(s.AccountBalance, locale) }}</div>
    <div class="c-num" :data-label="t('row.dataLabel.fee')">{{ fmtFee(s) }}</div>
    <div class="c-link" @click.stop>
      <a class="signal-link" :href="link" target="_blank" rel="noopener" @click.stop>
        {{ t('row.subscribe') }}
      </a>
      <slot name="row-actions" :strategy="s" />
    </div>
  </div>

  <div v-if="expanded" class="pelican-row-expanded" @click.stop>
    <div class="grid">
      <div class="col-stats">
        <div class="field"><div class="label">{{ t('expanded.currency') }}</div><div class="value">{{ s.Currency ?? 'USD' }}</div></div>
        <div class="field"><div class="label">{{ t('expanded.monthlyProfit') }}</div><div class="value">{{ fmtMoneyFull(s.MonthlyProfit, locale) }}</div></div>
        <div class="field"><div class="label">{{ t('expanded.yearlyProfit') }}</div><div class="value">{{ fmtMoneyFull(s.YearlyProfit, locale) }}</div></div>
        <div class="field"><div class="label">{{ t('expanded.balance') }}</div><div class="value">{{ fmtMoneyFull(s.AccountBalance, locale) }}</div></div>
        <div class="field"><div class="label">{{ t('expanded.realizedPnl') }}</div><div class="value">{{ fmtMoneyFull(s.RealisedPnl, locale) }}</div></div>
        <div class="field"><div class="label">{{ t('expanded.unrealizedPnl') }}</div><div class="value">{{ fmtMoneyFull(s.UnrealisedPnl, locale) }}</div></div>
        <div class="field"><div class="label">{{ t('expanded.tradesTotal') }}</div><div class="value">{{ fmtNum(s.TradesTotal, locale) }}</div></div>
        <div class="field">
          <div class="label">{{ t('expanded.winRate') }}</div>
          <div class="value">
            <span v-if="wr >= 0">{{ wr.toFixed(1) }}% / {{ lr.toFixed(1) }}%</span>
            <span v-else class="dim">—</span>
          </div>
        </div>
      </div>
      <div class="col-donut">
        <div class="hd">{{ t('expanded.markets') }}</div>
        <MarketsDonut :markets="s.Markets" />
      </div>
    </div>

    <div class="trade-toggles">
      <button class="pill" :class="{ on: showOpen }" type="button" @click="toggleOpen">
        {{ showOpen ? t('trades.hide') : t('trades.openTrades') }}
      </button>
      <button class="pill" :class="{ on: showClosed }" type="button" @click="toggleClosed">
        {{ showClosed ? t('trades.hide') : t('trades.tradeHistory') }}
      </button>
    </div>

    <TradesPanel
      v-if="showOpen"
      kind="open"
      :trades="openTrades?.trades ?? null"
      :loading="!!openTrades?.loading"
      :locale="locale"
    />
    <TradesPanel
      v-if="showClosed"
      kind="closed"
      :trades="closedTrades?.trades ?? null"
      :loading="!!closedTrades?.loading"
      :locale="locale"
    />
  </div>
</template>

<style scoped>
.pelican-row {
  display: grid;
  grid-template-columns: minmax(160px, 1.6fr) minmax(120px, 1fr) repeat(7, minmax(70px, 0.8fr)) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line-2);
  cursor: pointer;
  transition: background 0.15s;
}
.pelican-row:hover {
  background: var(--row-hover);
}
.pelican-row.open {
  background: var(--row-hover);
}
.name {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--sage);
  color: var(--text-2);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
}
.avatar-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.title {
  font-weight: 600;
  color: var(--text);
}
.by {
  color: var(--muted);
  font-size: 12px;
}
.free-badge {
  margin-left: 6px;
  background: var(--chip-low-bg);
  color: var(--chip-low-text);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 700;
}
.c-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.c-link {
  text-align: right;
}
.signal-link {
  color: var(--orange);
  text-decoration: none;
  font-size: 12px;
}
.signal-link:hover {
  text-decoration: underline;
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

.pelican-row-expanded {
  padding: 16px;
  background: var(--sage-2);
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 1.2fr);
  gap: 16px;
}
.col-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 16px;
}
.field .label {
  color: var(--muted);
  font-size: 12px;
}
.field .value {
  color: var(--text);
  font-weight: 500;
}
.col-donut .hd {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}
.trade-toggles {
  display: flex;
  gap: 8px;
}
.pill {
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.pill.on {
  background: var(--orange);
  border-color: var(--orange);
  color: #fff;
}

@media (max-width: 720px) {
  .pelican-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .pelican-row > [data-label]::before {
    content: attr(data-label);
    color: var(--muted);
    margin-right: 8px;
    font-size: 11px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
