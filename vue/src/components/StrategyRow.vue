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
/* ----- Row grid (matches StrategyTable's head) ----- */
.pelican-row {
  display: grid;
  grid-template-columns:
    minmax(180px, 1.6fr)
    minmax(120px, 1.1fr)
    100px 80px 120px 100px 70px 100px 80px 104px;
  gap: 12px;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line-2);
  cursor: pointer;
  transition:
    transform   .25s cubic-bezier(.2, .8, .2, 1),
    background-color .2s ease,
    box-shadow  .25s cubic-bezier(.2, .8, .2, 1);
}
.pelican-row:hover {
  transform: translateX(2px);
  background: rgba(255, 255, 255, .04);
  box-shadow: inset 3px 0 0 0 var(--orange);
}
:global(.pelican-libsoc[data-theme="light"]) .pelican-row:hover {
  background: rgba(0, 0, 0, .025);
}
.pelican-row.open {
  background: rgba(255, 255, 255, .04);
}

/* ----- Name + avatar ----- */
.name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.avatar {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef7c46, #ff6633);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: .5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
}
.avatar-fallback { line-height: 1; }
.avatar-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.nm {
  overflow: hidden;
}
.title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.by {
  color: var(--muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ----- FREE badge with green pulse ----- */
.free-badge {
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .4px;
  text-transform: uppercase;
  color: var(--chip-low-text);
  background: var(--chip-low-bg);
  border-radius: 6px;
  line-height: 1.4;
  animation: pelican-free-pulse 2.4s ease-in-out infinite;
}

.c-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.c-spark svg {
  display: block;
  transition: transform .25s cubic-bezier(.2, .8, .2, 1);
}
.pelican-row:hover .c-spark svg {
  transform: scale(1.04);
}
.c-link { text-align: right; }

/* ----- Subscribe link: orange-outlined pill with hover-shimmer ----- */
.signal-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 12px;
  border: 1.5px solid var(--orange);
  border-radius: 8px;
  background: transparent;
  color: var(--orange);
  text-decoration: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition:
    background .2s, color .2s,
    transform .25s cubic-bezier(.2, .8, .2, 1),
    box-shadow .25s;
  position: relative;
  overflow: hidden;
}
.signal-link::after {
  content: '↗';
  font-size: 11px;
}
.signal-link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg,
    transparent 30%,
    rgba(255, 255, 255, .28) 50%,
    transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
  transition: transform 0s;
  border-radius: inherit;
}
.signal-link:hover {
  background: var(--orange);
  color: #fff;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 6px 20px rgba(239, 124, 70, .35);
}
.signal-link:hover::before {
  transform: translateX(130%);
  transition: transform .85s cubic-bezier(.25, .1, .25, 1);
}
.signal-link:active { transform: translateY(0) scale(.98); }

.green { color: var(--green); }
.red { color: var(--red); }
.dim { color: var(--muted); }

/* ----- Expanded panel ----- */
.pelican-row-expanded {
  padding: 6px 20px 20px;
  background: var(--sage-2);
  border-bottom: 1px solid var(--line-2);
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
.field { padding: 10px 0; }
.field .label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--muted);
  margin-bottom: 4px;
  font-weight: 600;
}
.field .value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.col-donut .hd {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .6px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
}

/* ----- Trades toggle pills (orange-tinted glass) ----- */
.trade-toggles {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: rgba(255, 102, 51, .10);
  border: 1.5px solid rgba(255, 102, 51, .32);
  border-radius: 8px;
  color: var(--orange);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .2px;
  cursor: pointer;
  user-select: none;
  transition:
    background .2s, border-color .2s,
    transform .25s cubic-bezier(.2, .8, .2, 1),
    box-shadow .25s;
}
.pill:hover {
  background: rgba(255, 102, 51, .18);
  border-color: rgba(255, 102, 51, .55);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(255, 102, 51, .20);
}
.pill:active { transform: translateY(0); }
.pill.on {
  background: rgba(255, 102, 51, .18);
  border-color: rgba(255, 102, 51, .45);
}

/* ---- compact desktop ---- */
@media (max-width: 1700px) {
  .pelican-row {
    grid-template-columns:
      minmax(140px, 1.4fr)
      minmax(95px, 1fr)
      78px 62px 97px 82px 50px 85px 62px 105px;
    padding: 12px 14px;
    gap: 10px;
  }
  .title { font-size: 13px; }
  .by { font-size: 11px; }
  .signal-link { padding: 6px 9px; font-size: 11px; }
}

/* ---- below ~1340 ---- */
@media (max-width: 1340px) {
  .pelican-row {
    grid-template-columns:
      minmax(140px, 1.3fr)
      minmax(85px, 0.9fr)
      70px 55px 90px 75px 50px 80px 55px 92px;
    padding: 10px 12px;
    gap: 8px;
  }
  .pelican-row-expanded {
    padding: 6px 12px 16px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}

/* ---- mobile (≤720): rows render as cards ---- */
@media (max-width: 720px) {
  .pelican-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 14px;
    padding: 14px 14px 12px;
    align-items: start;
  }
  .pelican-row .name {
    grid-column: 1 / -1;
    align-items: center;
  }
  .avatar {
    width: 36px;
    height: 36px;
    font-size: 13px;
  }
  .title { font-size: 15px; }
  .by { font-size: 12px; }

  .pelican-row .c-spark {
    grid-column: 1 / -1;
  }
  .pelican-row .c-spark svg {
    width: 100%;
    height: 72px;
    display: block;
  }

  .pelican-row > .c-num {
    text-align: left;
    background: var(--sage-2);
    border-radius: 8px;
    padding: 8px 10px;
    line-height: 1.2;
    font-size: 14px;
    font-weight: 600;
  }
  .pelican-row > .c-num::before {
    content: attr(data-label);
    display: block;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: var(--muted);
    margin-bottom: 3px;
  }

  .pelican-row .c-link {
    grid-column: 1 / -1;
  }
  .signal-link {
    width: 100%;
    padding: 10px 12px;
    font-size: 13px;
  }

  .pelican-row-expanded {
    padding: 14px 14px 18px;
  }
  .grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .col-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .field .value { font-size: 14px; }

  /* Visually pair the open row with its expanded panel */
  .pelican-row.open {
    background: rgba(255, 255, 255, .05);
    border-radius: 10px 10px 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, .06);
  }
  .pelican-row.open + .pelican-row-expanded {
    background: rgba(255, 255, 255, .08);
    border-radius: 0 0 10px 10px;
    margin: 0 0 10px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, .22);
  }
  .pelican-row.open > .c-num {
    background: rgba(255, 255, 255, .05);
  }
  :global(.pelican-libsoc[data-theme="light"]) .pelican-row.open {
    background: rgba(0, 0, 0, .03);
    border-bottom-color: rgba(0, 0, 0, .06);
  }
  :global(.pelican-libsoc[data-theme="light"]) .pelican-row.open + .pelican-row-expanded {
    background: rgba(0, 0, 0, .05);
    box-shadow: 0 6px 16px rgba(20, 30, 20, .10);
  }
  :global(.pelican-libsoc[data-theme="light"]) .pelican-row.open > .c-num {
    background: rgba(0, 0, 0, .04);
  }
}
</style>
