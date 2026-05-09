<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Strategy } from '../types/strategy';
import EquityCurve from './EquityCurveSvg.vue';
import AllocationBar from './AllocationBarSvg.vue';

interface Props {
  trader?: Strategy | null;
  theme?: 'light' | 'dark' | 'auto';
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'auto',
});

const resolvedTheme = computed(() => {
  if (props.theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return props.theme;
});

// Mock trader data (Marcus Halden from design spec)
const mockTrader: Strategy = {
  Id: 1,
  Name: 'Marcus Halden',
  Return: 204.7,
  RiskProfile: 'Medium',
  NumCopiers: 3120,
  Fee: 0.02,
  TradesTotal: 1284,
  Markets: [
    { n: 'EUR/USD', c: 45 },
    { n: 'DAX40', c: 32 },
  ],
  AccountBalance: 14206840,
  CopiersAUM: 14200000,
  ImageUploaded: true,
  Profile: { Id: 1, Name: '@halden' },
  IsSimulated: false,
  IsEnabled: true,
  Inception: '2020-01-15T00:00:00Z',
  Currency: 'EUR',
  MaxDD: -6.1,
  RealisedPnl: 0,
  UnrealisedPnl: 0,
  Wins: 912,
  Losses: 372,
  MonthlyProfit: 0,
  YearlyProfit: 0,
  History: [],
  _stats: true,
  _meta: true,
};

const trader = computed(() => props.trader || mockTrader);

// Tab state for equity curve ranges
const selectedRange = ref('1Y');
const ranges = ['1M', '3M', '6M', '1Y', '3Y', 'All'];

const stats = computed(() => [
  { label: 'TOTAL', value: '+204.7%', sub: 'over 4 years', cls: 'up' },
  { label: '30 DAYS', value: '+8.4%', sub: 'vs +1.2% bench.', cls: 'up' },
  { label: 'SHARPE', value: '2.31', sub: 'ratio', cls: '' },
  { label: 'MAX DD', value: '−6.1%', sub: 'all-time', cls: 'down' },
  { label: 'WIN RATE', value: '71%', sub: 'of 1,284 trades', cls: '' },
  { label: 'AVG HOLD', value: '08h 14m', sub: 'per trade', cls: '' },
  { label: 'AUM', value: '€ 14.2M', sub: 'under management', cls: '' },
]);

const positions = [
  { sym: 'EUR/USD', name: 'Euro vs US Dollar', w: 22, dir: 'long' as const },
  { sym: 'DAX40', name: 'Germany 40 Index', w: 18, dir: 'long' as const },
  { sym: 'USD/JPY', name: 'US Dollar vs Yen', w: 14, dir: 'short' as const },
  { sym: 'GBP/CHF', name: 'Sterling vs Franc', w: 11, dir: 'long' as const },
  { sym: 'BRENT', name: 'Brent Crude', w: 9, dir: 'short' as const },
  { sym: 'XAU/USD', name: 'Gold Spot', w: 8, dir: 'long' as const },
  { sym: 'AUD/CAD', name: 'Aussie vs Canadian', w: 7, dir: 'short' as const },
  { sym: 'CASH', name: 'Cash reserve', w: 11, dir: 'cash' as const },
];

const trades = [
  { sym: 'EUR/USD', side: 'Buy', size: '0.42 lot', entry: '1.0824', exit: '1.0871', pnl: 1.9, when: '12 min ago' },
  { sym: 'DAX40', side: 'Buy', size: '0.10 lot', entry: '18,420', exit: '18,604', pnl: 2.4, when: '47 min ago' },
  { sym: 'USD/JPY', side: 'Sell', size: '0.35 lot', entry: '157.10', exit: '156.62', pnl: 0.7, when: '1 h ago' },
  { sym: 'BRENT', side: 'Sell', size: '0.20 lot', entry: '82.40', exit: '83.10', pnl: -0.9, when: '3 h ago' },
  { sym: 'GBP/CHF', side: 'Buy', size: '0.18 lot', entry: '1.1284', exit: '1.1352', pnl: 1.2, when: '6 h ago' },
  { sym: 'XAU/USD', side: 'Buy', size: '0.05 lot', entry: '2,338', exit: '2,361', pnl: 0.8, when: 'yesterday, 19:24' },
  { sym: 'AUD/CAD', side: 'Sell', size: '0.30 lot', entry: '0.9012', exit: '0.8980', pnl: 0.4, when: 'yesterday, 11:08' },
];

// Avatar: geometric monochrome initials
const avatarInitials = computed(() => {
  const parts = trader.value.Name?.split(' ') || [];
  return parts.slice(0, 2).map(p => p[0]).join('');
});
</script>

<template>
  <div class="trader-profile" :data-theme="resolvedTheme">
    <!-- Top bar -->
    <div class="topbar">
      <div class="logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.5" stroke="currentColor" stroke-width="1.2" />
          <path d="M7 14 L12 8 L17 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <circle cx="12" cy="16.2" r="1.2" fill="currentColor" />
        </svg>
        <span class="label">Pelican Social</span>
      </div>
      <nav class="nav">
        <a href="#" class="nav-link active">Discover</a>
        <a href="#" class="nav-link">Leaders</a>
        <a href="#" class="nav-link">Portfolio</a>
        <a href="#" class="nav-link">Activity</a>
      </nav>
      <div class="spacer" />
      <div class="search-box">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.2" /><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" /></svg>
        <span>Search trader or instrument</span>
        <span class="kbd">⌘K</span>
      </div>
      <div class="balance">
        <span class="balance-label">Balance</span>
        <span class="balance-value">€ 24,318</span>
      </div>
      <div class="avatar" :title="avatarInitials">{{ avatarInitials }}</div>
    </div>

    <!-- Main content -->
    <div class="main">
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <span>Leaders</span>
        <span class="sep">/</span>
        <span class="muted">FX & Macro</span>
        <span class="sep">/</span>
        <span class="current">Marcus Halden</span>
      </div>

      <!-- Header section -->
      <div class="header-section">
        <div class="avatar-lg" :title="avatarInitials">{{ avatarInitials }}</div>

        <div class="header-content">
          <div class="title-row">
            <h1>Marcus Halden</h1>
            <span class="tag verified">✓ Verified</span>
            <span class="tag">Top 1%</span>
          </div>

          <div class="meta">
            <span class="mono">@halden</span>
            <span class="sep">·</span>
            <span>Denmark · København</span>
            <span class="sep">·</span>
            <span>Track record 4 yrs 2 mo</span>
            <span class="sep">·</span>
            <span>3,120 followers</span>
          </div>

          <p class="desc">
            Mean-reversion on major FX pairs with disciplined risk management. Hold 4–18 hours, average size ≈ 0.3 lot.
          </p>
        </div>

        <div class="header-ctas">
          <button class="btn primary">Subscribe · from € 200</button>
          <div class="btn-row">
            <button class="btn">Follow</button>
            <button class="btn">Message</button>
          </div>
        </div>
      </div>

      <!-- Stats strip (7 columns) -->
      <div class="stats-strip">
        <div v-for="stat in stats" :key="stat.label" class="stat-tile" :class="stat.cls">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-sub">{{ stat.sub }}</div>
        </div>
      </div>

      <!-- Equity curve -->
      <div class="card equity-card">
        <div class="equity-header">
          <div>
            <div class="muted-label">EQUITY CURVE</div>
            <div class="equity-value">
              € 14,206,840
              <span class="value-return up">+204.7%</span>
            </div>
          </div>
          <div class="range-selector">
            <button
              v-for="range in ranges"
              :key="range"
              :class="{ on: selectedRange === range }"
              @click="selectedRange = range"
            >
              {{ range }}
            </button>
          </div>
        </div>
        <EquityCurve />
      </div>

      <!-- Two-column: composition + trades -->
      <div class="two-columns">
        <!-- Portfolio composition -->
        <div class="card composition-card">
          <div class="card-header">
            <h3>Portfolio composition</h3>
            <span class="muted-sm">Updated 2 min ago</span>
          </div>
          <AllocationBar :items="positions" />
          <div class="positions-list">
            <div v-for="(pos, i) in positions" :key="pos.sym" class="position-row" :class="{ 'border-b': i < positions.length - 1 }">
              <span class="color-dot" :class="pos.dir" />
              <span class="sym mono">{{ pos.sym }}</span>
              <span class="name muted">{{ pos.name }}</span>
              <span class="dir" :class="pos.dir">{{ pos.dir.toUpperCase() }}</span>
              <span class="weight num">{{ pos.w }}%</span>
            </div>
          </div>
        </div>

        <!-- Recent trades -->
        <div class="card trades-card">
          <div class="card-header">
            <h3>Recent trades</h3>
            <a href="#" class="muted-link">All 1,284 →</a>
          </div>
          <div class="trades-table">
            <div class="trades-header">
              <div>Instrument</div>
              <div>Side</div>
              <div>Size</div>
              <div>Entry</div>
              <div>Exit</div>
              <div>P/L</div>
              <div>When</div>
            </div>
            <div v-for="(trade, i) in trades" :key="i" class="trade-row" :class="{ 'border-b': i < trades.length - 1 }">
              <span class="sym mono">{{ trade.sym }}</span>
              <span class="side" :class="trade.side === 'Buy' ? 'up' : 'down'">{{ trade.side }}</span>
              <span class="size mono muted">{{ trade.size }}</span>
              <span class="price mono">{{ trade.entry }}</span>
              <span class="price mono">{{ trade.exit }}</span>
              <span class="pnl num" :class="trade.pnl >= 0 ? 'up' : 'down'">{{ trade.pnl > 0 ? '+' : '' }}{{ trade.pnl.toFixed(1) }}%</span>
              <span class="when muted">{{ trade.when }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer-section">
        <p class="risk-disclaimer">
          Past performance does not guarantee future results. Copy-trading carries risk of capital loss; set a Stop-Loss and never allocate more than you can afford.
        </p>
        <div class="footer-tags">
          <span class="tag">Risk: Medium</span>
          <span class="tag">Regulated · CySEC</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
.trader-profile {
  --bg: #fafaf7;
  --surface: #ffffff;
  --surface-2: #f4f4f1;
  --surface-3: #eae8e4;
  --fg: #1a1a1a;
  --fg-2: #333333;
  --fg-3: #8a8a8a;
  --border: #e0dcd8;
  --border-2: #d4cdc8;
  --up: #2f8f5a;
  --down: #d65c5c;
  --accent: #1a1a1a;

  font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--fg);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.trader-profile[data-theme="dark"] {
  --bg: #0d0d0d;
  --surface: #191919;
  --surface-2: #242424;
  --surface-3: #2f2f2f;
  --fg: #f5f5f5;
  --fg-2: #d8d8d8;
  --fg-3: #888888;
  --border: #3a3a3a;
  --border-2: #4a4a4a;
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 16px 28px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fg);
  text-decoration: none;
  font-weight: 500;
  font-size: 18px;
  letter-spacing: -0.01em;
}

.label {
  margin-left: -16px;
  font-size: 11px;
  color: var(--fg-3);
  margin-top: 6px;
}

.nav {
  display: flex;
  gap: 22px;
  margin-left: 16px;
}

.nav-link {
  color: var(--fg-3);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
}

.nav-link:hover, .nav-link.active {
  color: var(--fg);
}

.spacer {
  flex: 1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--fg-3);
  font-size: 12px;
  min-width: 240px;
}

.kbd {
  margin-left: auto;
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  opacity: 0.6;
}

.balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.balance-label {
  font-size: 11px;
  color: var(--fg-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.balance-value {
  font-size: 13px;
  font-weight: 500;
  font-family: 'Geist Mono', monospace;
  color: var(--fg);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: color-mix(in oklch, var(--fg) 55%, var(--surface));
  color: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

/* Main content */
.main {
  flex: 1;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.breadcrumb {
  font-size: 12px;
  color: var(--fg-3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.sep {
  opacity: 0.4;
}

.current {
  color: var(--fg-2);
}

/* Header section */
.header-section {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 24px;
  align-items: center;
}

.avatar-lg {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  background: color-mix(in oklch, var(--fg) 55%, var(--surface));
  color: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 500;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-row h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.meta {
  font-size: 13px;
  color: var(--fg-3);
  display: flex;
  gap: 14px;
  align-items: center;
}

.desc {
  margin: 4px 0 0 0;
  font-size: 13px;
  max-width: 640px;
  color: var(--fg-2);
  line-height: 1.5;
}

.tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg);
}

.tag.verified {
  background: #e8f5e9;
  color: #2e7d32;
  border-color: #c8e6c9;
}

.trader-profile[data-theme="dark"] .tag.verified {
  background: #1b5e20;
  color: #4caf50;
  border-color: #2e7d32;
}

.header-ctas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.btn-row {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn:hover {
  background: var(--surface-2);
  border-color: var(--border-2);
}

.btn.primary {
  background: var(--fg);
  color: var(--bg);
  border-color: var(--fg);
  width: 200px;
}

.btn.primary:hover {
  opacity: 0.9;
}

/* Stats strip */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.stat-tile {
  padding: 14px 16px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.stat-tile:last-child {
  border-right: none;
}

.stat-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--fg-3);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.015em;
  font-family: 'Geist Mono', monospace;
  color: var(--fg);
}

.stat-value.up {
  color: var(--up);
}

.stat-value.down {
  color: var(--down);
}

.stat-sub {
  font-size: 11px;
  color: var(--fg-3);
  margin-top: 2px;
}

/* Equity card */
.card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.equity-card {
  padding: 18px 22px;
}

.equity-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.muted-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-3);
}

.equity-value {
  font-size: 22px;
  font-weight: 500;
  font-family: 'Geist Mono', monospace;
  color: var(--fg);
  margin-top: 4px;
}

.value-return {
  font-size: 13px;
  margin-left: 6px;
}

.range-selector {
  display: flex;
  gap: 2px;
  background: var(--surface-2);
  padding: 2px;
  border-radius: 4px;
}

.range-selector button {
  padding: 4px 10px;
  font-size: 12px;
  border: none;
  background: transparent;
  color: var(--fg-3);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
}

.range-selector button.on {
  background: var(--fg);
  color: var(--bg);
}

/* Two columns */
.two-columns {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 16px;
}

.composition-card, .trades-card {
  padding: 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.muted-sm {
  font-size: 11px;
  color: var(--fg-3);
}

.muted-link {
  font-size: 12px;
  color: var(--fg-3);
  text-decoration: none;
  transition: color 0.2s;
}

.muted-link:hover {
  color: var(--fg-2);
}

/* Positions list */
.positions-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
}

.position-row {
  display: grid;
  grid-template-columns: 16px 80px 1fr auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}

.position-row.border-b {
  border-bottom: 1px solid var(--border);
}

.position-row:last-child {
  border-bottom: none;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: color-mix(in oklch, var(--fg) 55%, var(--surface));
}

.color-dot.cash {
  background: var(--surface-3);
}

.sym {
  font-size: 12px;
  font-weight: 500;
}

.name {
  color: var(--fg-3);
}

.dir {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 500;
  margin-right: 14px;
}

.dir.long {
  color: var(--up);
}

.dir.short {
  color: var(--down);
}

.dir.cash {
  color: var(--fg-3);
}

.weight {
  font-weight: 500;
}

/* Trades table */
.trades-table {
  display: flex;
  flex-direction: column;
}

.trades-header {
  display: grid;
  grid-template-columns: 0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr;
  padding: 0 0 8px 0;
  font-size: 12px;
  color: var(--fg-3);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}

.trade-row {
  display: grid;
  grid-template-columns: 0.8fr 0.6fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  min-height: 36px;
}

.trade-row.border-b {
  border-bottom: 1px solid var(--border);
}

.trade-row:last-child {
  border-bottom: none;
}

.side {
  font-size: 12px;
  font-weight: 500;
}

.side.up {
  color: var(--up);
}

.side.down {
  color: var(--down);
}

.size {
  font-size: 12px;
}

.price {
  font-size: 12px;
}

.pnl {
  font-weight: 500;
}

.pnl.up {
  color: var(--up);
}

.pnl.down {
  color: var(--down);
}

.when {
  font-size: 12px;
}

/* Footer */
.footer-section {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 0 8px 0;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}

.risk-disclaimer {
  flex: 1;
  font-size: 12px;
  color: var(--fg-3);
  line-height: 1.55;
  max-width: 720px;
  margin: 0;
}

.footer-tags {
  display: flex;
  gap: 6px;
}

/* Utility classes */
.mono {
  font-family: 'Geist Mono', monospace;
}

.num {
  font-family: 'Geist Mono', monospace;
  font-feature-settings: 'tnum' 1;
}

.muted {
  color: var(--fg-3);
}

.up {
  color: var(--up);
}

.down {
  color: var(--down);
}
</style>
