<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import Sparkline from './Sparkline.vue';
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
const risk = computed(() => props.s.RiskProfile ?? 'Unsuitable');

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

function pnlClass(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v)) || Number(v) === 0) return '';
  return Number(v) > 0 ? 'green' : 'red';
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
    <div class="c-spark" :class="{ 'no-hist': !s.History?.length }" :data-label="t('row.dataLabel.equityCurve')">
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
    <button class="close-btn" type="button" aria-label="Close" @click="emit('toggle')">✕</button>
    <div class="details">
      <div class="field"><div class="label">{{ t('expanded.monthlyProfit') }}</div><div class="value" :class="pnlClass(s.MonthlyProfit)">{{ fmtMoneyFull(s.MonthlyProfit, locale) }}</div></div>
      <div class="field"><div class="label">{{ t('expanded.balance') }}</div><div class="value">{{ fmtMoneyFull(s.AccountBalance, locale) }}</div></div>
      <div class="field"><div class="label">{{ t('expanded.realizedPnl') }}</div><div class="value" :class="pnlClass(s.RealisedPnl)">{{ fmtMoneyFull(s.RealisedPnl, locale) }}</div></div>
      <div class="field"><div class="label">{{ t('expanded.risk') }}</div><div class="value"><span class="pill" :class="risk">{{ t(`risk.${risk}`) }}</span></div></div>
      <div class="field"><div class="label">{{ t('expanded.winRate') }}</div><div class="value"><span v-if="wr >= 0" class="green">{{ wr.toFixed(0) }}%</span><span v-else class="dim">—</span></div></div>
      <div class="field"><div class="label">{{ t('expanded.lossRate') }}</div><div class="value"><span v-if="lr >= 0" class="red">{{ lr.toFixed(0) }}%</span><span v-else class="dim">—</span></div></div>
      <div class="field"><div class="label">{{ t('expanded.age') }}</div><div class="value">{{ fmtAgeI18n(age) }}</div></div>
      <div class="field"><div class="label">{{ t('expanded.tradesTotal') }}</div><div class="value">{{ fmtNum(s.TradesTotal, locale) }}</div></div>
      <div class="field"><div class="label">{{ t('expanded.yearlyProfit') }}</div><div class="value" :class="pnlClass(s.YearlyProfit)">{{ fmtMoneyFull(s.YearlyProfit, locale) }}</div></div>
      <div class="field"><div class="label">{{ t('expanded.currency') }}</div><div class="value">{{ s.Currency ?? 'USD' }}</div></div>
      <div class="field markets">
        <div class="label">{{ t('expanded.markets') }}</div>
        <div class="value markets-list">
          <template v-if="s.Markets && s.Markets.length">
            <span v-for="m in s.Markets" :key="m.n" class="market-tag" :title="m.c + ' trades'">{{ m.n }} <span class="market-count">{{ m.c }}</span></span>
          </template>
          <span v-else class="dim">{{ t('donut.empty') }}</span>
        </div>
      </div>
    </div>

    <div class="trade-toggles">
      <button class="trades-toggle" :class="{ open: showOpen }" type="button" @click="toggleOpen">
        <span class="trades-chev">▸</span>
        <span>{{ t('trades.openTrades') }}</span>
        <span v-if="openTrades && openTrades.trades" class="trades-count">{{ openTrades.trades.length }}</span>
      </button>
      <button class="trades-toggle" :class="{ open: showClosed }" type="button" @click="toggleClosed">
        <span class="trades-chev">▸</span>
        <span>{{ t('trades.tradeHistory') }}</span>
        <span v-if="closedTrades && closedTrades.trades" class="trades-count">{{ closedTrades.trades.length }}</span>
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
  border-bottom: 1px solid var(--border-2);
  cursor: pointer;
  transition: background 0.15s;
}
.pelican-row:hover {
  background: var(--row-hover);
  box-shadow: inset 3px 0 0 0 var(--accent);
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
  background: linear-gradient(135deg, #ef7c46, #ff6633);
  color: #fff;
  font-weight: 700;
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
  color: var(--fg);
}
.by {
  color: var(--fg-3);
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
  animation: free-pulse 2.4s ease-in-out infinite;
}
@keyframes free-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(78, 217, 140, .35); }
  50% { box-shadow: 0 0 0 5px rgba(78, 217, 140, 0); }
}
.c-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.c-link {
  text-align: right;
}
.signal-link {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 12px;
  border: 1.5px solid var(--accent);
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition: background .15s, color .15s, transform .2s cubic-bezier(.2, .8, .2, 1), box-shadow .25s;
}
.signal-link::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, .28) 50%, transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
  transition: transform 0s;
}
.signal-link:hover {
  background: var(--accent);
  color: var(--accent-fg);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(239, 124, 70, .35);
}
.signal-link:hover::after {
  transform: translateX(130%);
  transition: transform .85s cubic-bezier(.25, .1, .25, 1);
}
.green {
  color: var(--up);
}
.red {
  color: var(--down);
}
.dim {
  color: var(--fg-3);
}

.pelican-row-expanded {
  position: relative;
  padding: 12px 16px;
  padding-top: 36px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.close-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface-3);
  color: var(--fg-3);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}
.close-btn:hover {
  border-color: var(--accent);
  color: var(--fg);
  transform: rotate(90deg);
}
.details {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}
.field .label {
  color: var(--fg-3);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.field .value {
  color: var(--fg);
  font-weight: 600;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.field.markets {
  grid-column: 1 / -1;
  padding-top: 12px;
  margin-top: 2px;
  border-top: 1px dashed var(--border);
}
.markets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 6px;
}
.market-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--fg);
}
.market-count {
  color: var(--fg-3);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 600;
}
.pill.Low { background: var(--chip-low-bg); color: var(--chip-low-text); }
.pill.Medium { background: var(--chip-med-bg); color: var(--chip-med-text); }
.pill.High { background: var(--chip-high-bg); color: var(--chip-high-text); }
.pill.Unsuitable { background: var(--chip-uns-bg); color: var(--chip-uns-text); }
.trade-toggles {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.trades-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: rgba(239, 124, 70, .10);
  border: 1.5px solid rgba(239, 124, 70, .32);
  border-radius: 8px;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .2px;
  cursor: pointer;
  user-select: none;
  transition: background .2s, border-color .2s, transform .25s cubic-bezier(.2, .8, .2, 1), box-shadow .25s;
}
.trades-toggle:hover {
  background: rgba(239, 124, 70, .18);
  border-color: rgba(239, 124, 70, .55);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(239, 124, 70, .20);
}
.trades-toggle.open {
  background: rgba(239, 124, 70, .18);
  border-color: rgba(239, 124, 70, .45);
}
.trades-chev {
  font-size: 13px;
  line-height: 1;
  transition: transform .2s;
}
.trades-toggle.open .trades-chev {
  transform: rotate(90deg);
}
.trades-count {
  margin-left: 2px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, .10);
  color: var(--fg);
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 1024px) {
  .details {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 720px) {
  .pelican-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .pelican-row > [data-label]::before {
    content: attr(data-label);
    color: var(--fg-3);
    margin-right: 8px;
    font-size: 11px;
  }
  .no-hist {
    display: none;
  }
  .details {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
