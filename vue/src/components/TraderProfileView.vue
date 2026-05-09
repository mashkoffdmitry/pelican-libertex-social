<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import type { Strategy } from '../types/strategy';
import { fmtNum, fmtAge, ageDays, initials, fmtFee } from '../utils/format';
import { useSignals } from '../composables/useSignals';
import { API_BASE_KEY } from '../injection-keys';
import { DONUT_PALETTE } from '../constants/palette';
import EquityCurve from './EquityCurve.vue';
import SubscribeSheet from './SubscribeSheet.vue';
import '../styles/profile.css';

const props = defineProps<{ strategy: Strategy }>();

const emit = defineEmits<{
  back: [];
  subscribe: [p: { traderId: number; amount: number; ratio: number; stopLoss: number }];
}>();

// Inject shared apiBase from PelicanLibertexSocial
const apiBase = inject(API_BASE_KEY, '');
const apiBaseRef = ref(apiBase);

const signals = useSignals(apiBaseRef);

const subscribeOpen = ref(false);
const equityRange = ref<'1M' | '3M' | '6M' | '1Y' | '3Y' | 'All'>('1Y');
const EQUITY_RANGES = ['1M', '3M', '6M', '1Y', '3Y', 'All'] as const;

onMounted(() => {
  void signals.load(props.strategy.Id, 'closed');
});

// ── Derived fields ─────────────────────────────────────────────

const displayName = computed(
  () => props.strategy.Profile?.Name ?? props.strategy.Name ?? 'Unknown',
);

const avatarInitials = computed(() => initials(displayName.value));

const avatarUrl = computed(() => {
  if (!props.strategy.ImageUploaded) return null;
  return `${apiBase}/api/strategies/${props.strategy.Id}/image`;
});

const ageDisplay = computed(() => fmtAge(ageDays(props.strategy.Inception)));

const winRate = computed(() => {
  const total = props.strategy.Wins + props.strategy.Losses;
  if (!total) return null;
  return Math.round((props.strategy.Wins / total) * 100);
});

const aumDisplay = computed(() => {
  const v = props.strategy.CopiersAUM;
  if (v == null) return '—';
  if (v >= 1e6) return '€' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '€' + (v / 1e3).toFixed(0) + 'k';
  return '€' + v.toFixed(0);
});

const feeDisplay = computed(() => fmtFee(props.strategy));

const returnDisplay = computed(() => {
  const v = props.strategy.Return;
  if (v == null) return { text: '—', up: null as boolean | null };
  return { text: (v >= 0 ? '+' : '') + v.toFixed(1) + '%', up: v >= 0 };
});

const maxDdDisplay = computed(() => {
  const v = props.strategy.MaxDD;
  if (v == null) return { text: '—', up: null as boolean | null };
  return { text: v.toFixed(1) + '%', up: v >= 0 };
});

// ── Equity curve with range filter ────────────────────────────

const filteredHistory = computed(() => {
  const h = props.strategy.History;
  if (!h?.length) return h ?? null;
  if (equityRange.value === 'All') return h;
  const now = Date.now();
  const msMap: Record<string, number> = {
    '1M': 30 * 86400e3,
    '3M': 91 * 86400e3,
    '6M': 182 * 86400e3,
    '1Y': 365 * 86400e3,
    '3Y': 3 * 365 * 86400e3,
  };
  const cutoff = now - (msMap[equityRange.value] ?? 0);
  const filtered = h.filter((p) => Date.parse(p.Timestamp) >= cutoff);
  return filtered.length >= 2 ? filtered : h;
});

// ── Portfolio composition from Markets ────────────────────────

const portfolioSegments = computed(() => {
  const markets = props.strategy.Markets;
  if (!markets?.length) return [];
  const total = markets.reduce((s, m) => s + (m.c || 0), 0) || 1;
  return markets
    .slice()
    .sort((a, b) => (b.c || 0) - (a.c || 0))
    .slice(0, 8)
    .map((m, i) => ({
      name: m.n,
      count: m.c,
      pct: Math.round(((m.c || 0) / total) * 100),
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
    }));
});

// ── Trades ─────────────────────────────────────────────────────

const closedTrades = computed(() => {
  const entry = signals.get(props.strategy.Id, 'closed');
  return entry?.trades?.slice(0, 7) ?? null;
});

const tradesLoading = computed(() => {
  const entry = signals.get(props.strategy.Id, 'closed');
  return entry?.loading ?? false;
});

function formatTradeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 1) return `${Math.round(diffH * 60)} min ago`;
  if (diffH < 24) return `${Math.round(diffH)} h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatPrice(v: number | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
}
</script>

<template>
  <div class="pelican-profile">

    <!-- ── Back bar ──────────────────────────────────────────── -->
    <div class="pl-back-bar">
      <button class="pl-back-btn" @click="$emit('back')">‹ Leaders</button>
      <span class="pl-breadcrumb-sep">/</span>
      <span>{{ displayName }}</span>
    </div>

    <!-- ── Header ───────────────────────────────────────────── -->
    <div class="pl-header">
      <!-- Avatar -->
      <div class="pl-avatar">
        <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" @error="($event.target as HTMLImageElement).style.display='none'" />
        <span v-else>{{ avatarInitials }}</span>
      </div>

      <!-- Name + meta -->
      <div class="pl-header-meta">
        <div class="pl-header-name-row">
          <h1 class="pl-header-name pl-serif">{{ displayName }}</h1>
          <span v-if="strategy.RiskProfile === 'Low' || strategy.RiskProfile === 'Medium'" class="pl-tag ok">✓ Verified</span>
          <span class="pl-tag">Top Trader</span>
        </div>
        <div class="pl-header-sub">
          <span>{{ strategy.Currency ?? 'USD' }}</span>
          <span class="pl-meta-sep">·</span>
          <span>{{ strategy.RiskProfile ?? '—' }} risk</span>
          <span class="pl-meta-sep">·</span>
          <span>Track record {{ ageDisplay }}</span>
          <span v-if="strategy.NumCopiers" class="pl-meta-sep">·</span>
          <span v-if="strategy.NumCopiers">{{ fmtNum(strategy.NumCopiers) }} copiers</span>
        </div>
        <div class="pl-header-strategy">
          {{ strategy.Name }}
        </div>
      </div>

      <!-- Desktop CTAs -->
      <div class="pl-header-cta desktop-only">
        <button class="pl-btn primary" @click="subscribeOpen = true">Subscribe · from € 200</button>
        <div class="pl-cta-secondary">
          <button class="pl-btn">Follow</button>
          <button class="pl-btn">Message</button>
        </div>
      </div>
    </div>

    <!-- ── Stats strip ──────────────────────────────────────── -->
    <div class="pl-stats-strip pl-card">
      <div class="pl-stat-tile">
        <div class="pl-eyebrow">Total</div>
        <div
          class="pl-stat-value"
          :class="returnDisplay.up === true ? 'pl-stat-up' : returnDisplay.up === false ? 'pl-stat-down' : ''"
        >{{ returnDisplay.text }}</div>
        <div class="pl-stat-sub">return</div>
      </div>

      <div class="pl-stat-tile mobile-hide">
        <div class="pl-eyebrow">Sharpe</div>
        <div class="pl-stat-value">—</div>
        <div class="pl-stat-sub">ratio</div>
      </div>

      <div class="pl-stat-tile">
        <div class="pl-eyebrow">Max DD</div>
        <div
          class="pl-stat-value"
          :class="strategy.MaxDD != null && strategy.MaxDD < 0 ? 'pl-stat-down' : ''"
        >{{ maxDdDisplay.text }}</div>
        <div class="pl-stat-sub">drawdown</div>
      </div>

      <div class="pl-stat-tile">
        <div class="pl-eyebrow">Win rate</div>
        <div class="pl-stat-value" :class="winRate != null && winRate >= 50 ? 'pl-stat-up' : ''">
          {{ winRate != null ? winRate + '%' : '—' }}
        </div>
        <div class="pl-stat-sub">{{ strategy.Wins }}W / {{ strategy.Losses }}L</div>
      </div>

      <div class="pl-stat-tile mobile-hide">
        <div class="pl-eyebrow">Copiers</div>
        <div class="pl-stat-value">{{ fmtNum(strategy.NumCopiers) }}</div>
        <div class="pl-stat-sub">followers</div>
      </div>

      <div class="pl-stat-tile mobile-hide">
        <div class="pl-eyebrow">AUM</div>
        <div class="pl-stat-value">{{ aumDisplay }}</div>
        <div class="pl-stat-sub">under mgmt</div>
      </div>

      <div class="pl-stat-tile mobile-hide">
        <div class="pl-eyebrow">Fee</div>
        <div class="pl-stat-value">{{ feeDisplay }}</div>
        <div class="pl-stat-sub">performance</div>
      </div>
    </div>

    <!-- ── Equity curve ─────────────────────────────────────── -->
    <div class="pl-equity-card pl-card">
      <div class="pl-equity-header">
        <div>
          <div class="pl-eyebrow">Equity curve</div>
          <div class="pl-equity-headline pl-serif">
            {{ aumDisplay }}
            <span v-if="returnDisplay.up !== null" class="pl-equity-headline-up">{{ returnDisplay.text }}</span>
          </div>
        </div>
        <div class="pl-seg">
          <button
            v-for="r in EQUITY_RANGES"
            :key="r"
            class="pl-seg-btn"
            :class="{ active: equityRange === r }"
            @click="equityRange = r"
          >{{ r }}</button>
        </div>
      </div>
      <EquityCurve :history="filteredHistory" :width="760" :height="200" />
    </div>

    <!-- ── Two-column section ───────────────────────────────── -->
    <div class="pl-two-col">

      <!-- Portfolio composition -->
      <div class="pl-composition-card pl-card">
        <div class="pl-composition-heading">
          <h2 class="pl-composition-title pl-serif">Portfolio composition</h2>
          <span class="pl-composition-updated">{{ strategy.Markets?.length ? strategy.Markets.length + ' markets' : 'No data' }}</span>
        </div>

        <!-- Stacked bar -->
        <div v-if="portfolioSegments.length" class="pl-market-bar">
          <div
            v-for="seg in portfolioSegments"
            :key="seg.name"
            class="pl-market-bar-seg"
            :style="{ width: seg.pct + '%', background: seg.color }"
            :title="seg.name + ' ' + seg.pct + '%'"
          />
        </div>
        <div v-else class="pl-composition-updated" style="margin-bottom:12px">Loading…</div>

        <!-- Position list -->
        <ul class="pl-position-list">
          <li
            v-for="seg in portfolioSegments"
            :key="seg.name"
            class="pl-position-row"
          >
            <span class="pl-pos-chip" :style="{ background: seg.color }" />
            <span class="pl-pos-sym pl-mono">{{ seg.name }}</span>
            <span style="color:var(--pl-fg-2);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              {{ seg.count }} trade{{ seg.count !== 1 ? 's' : '' }}
            </span>
            <span class="pl-pos-weight pl-mono">{{ seg.pct }}%</span>
          </li>
          <li v-if="!portfolioSegments.length" class="pl-position-row" style="grid-template-columns:1fr">
            <span style="color:var(--pl-fg-3)">No portfolio data available</span>
          </li>
        </ul>
      </div>

      <!-- Recent trades -->
      <div class="pl-trades-card pl-card">
        <div class="pl-trades-heading">
          <h2 class="pl-trades-title pl-serif">Recent trades</h2>
          <span class="pl-trades-link">
            All {{ strategy.TradesTotal ? strategy.TradesTotal.toLocaleString() : '' }} →
          </span>
        </div>

        <div class="pl-table-head">
          <span>Instrument</span>
          <span>Side</span>
          <span class="pl-table-col-size">Size</span>
          <span class="pl-table-col-entry">Entry</span>
          <span class="pl-table-col-exit">Exit</span>
          <span>P/L</span>
          <span>When</span>
        </div>

        <!-- Loading -->
        <div v-if="tradesLoading" style="padding:16px 0;color:var(--pl-fg-3);font-size:13px">
          Loading trades…
        </div>

        <!-- Trades list -->
        <template v-else-if="closedTrades?.length">
          <div
            v-for="trade in closedTrades"
            :key="trade.Id ?? trade.OpenTimestamp"
            class="pl-table-row"
          >
            <span class="pl-trade-sym pl-mono">{{ trade.MarketName ?? '—' }}</span>
            <span
              class="pl-mono"
              :class="trade.Direction === 'Buy' ? 'pl-trade-side-buy' : 'pl-trade-side-sell'"
            >{{ trade.Direction ?? '—' }}</span>
            <span class="pl-trade-price pl-mono pl-table-col-size">
              {{ trade.Volume != null ? trade.Volume.toFixed(2) : '—' }}
            </span>
            <span class="pl-trade-price pl-mono pl-table-col-entry">{{ formatPrice(trade.OpenPrice) }}</span>
            <span class="pl-trade-price pl-mono pl-table-col-exit">{{ formatPrice(trade.ClosePrice) }}</span>
            <span
              class="pl-mono"
              :class="(trade.Pnl ?? 0) >= 0 ? 'pl-trade-pnl-pos' : 'pl-trade-pnl-neg'"
              style="font-size:12px;font-weight:500"
            >{{ trade.Pnl != null ? ((trade.Pnl >= 0 ? '+' : '') + trade.Pnl.toFixed(2)) : '—' }}</span>
            <span class="pl-trade-time">{{ formatTradeTime(trade.CloseTimestamp) }}</span>
          </div>
        </template>

        <!-- Empty -->
        <div v-else style="padding:16px 0;color:var(--pl-fg-3);font-size:13px">
          No recent trades
        </div>
      </div>
    </div>

    <!-- ── Footer ───────────────────────────────────────────── -->
    <div class="pl-footer">
      <p class="pl-footer-note">
        Past performance does not guarantee future results. Copy-trading carries risk of capital loss;
        set a Stop-Loss and never allocate more than you can afford.
      </p>
      <div class="pl-footer-tags">
        <span class="pl-tag" :class="strategy.RiskProfile === 'Low' ? 'ok' : strategy.RiskProfile === 'High' ? 'warn' : ''">
          Risk: {{ strategy.RiskProfile ?? '—' }}
        </span>
        <span class="pl-tag">CySEC Regulated</span>
      </div>
    </div>

    <!-- ── Mobile sticky CTA ─────────────────────────────────── -->
    <div class="pl-mobile-cta">
      <button class="pl-btn" style="width:44px;height:44px;padding:0;font-size:18px" aria-label="Favorite">♡</button>
      <button class="pl-btn primary" style="flex:1" @click="subscribeOpen = true">
        Subscribe · from € 200
      </button>
    </div>

    <!-- ── Subscribe sheet ───────────────────────────────────── -->
    <SubscribeSheet
      v-if="subscribeOpen"
      :trader-id="strategy.Id"
      :trader-name="displayName"
      @subscribe="(p) => { emit('subscribe', p); subscribeOpen = false; }"
      @close="subscribeOpen = false"
    />
  </div>
</template>
