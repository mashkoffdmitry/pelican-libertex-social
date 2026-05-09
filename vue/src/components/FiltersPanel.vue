<script setup lang="ts">
import { ref, watch } from 'vue';
import RiskChips from './filters/RiskChips.vue';
import RangeSingle from './filters/RangeSingle.vue';
import RangeDual from './filters/RangeDual.vue';
import InvestAmount from './filters/InvestAmount.vue';
import { useI18n } from '../composables/useI18n';
import type { FiltersState } from '../types/filters';
import type { RiskLevel } from '../types/strategy';
import { fmtAUM, fmtRetMag } from '../utils/format';
import { balanceFromRaw, returnFromRaw } from '../utils/scales';

const { t } = useI18n();

const props = defineProps<{
  filters: FiltersState;
  investAmount: number | null;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:filters', f: Partial<FiltersState>): void;
  (e: 'update:investAmount', v: number | null): void;
  (e: 'reset'): void;
}>();

// Dual-range sliders need raw 0..100 positions held *here*, not derived from
// `filters.retMin/retMax` (the slider's log scale isn't trivially invertible
// per-tick, and round-tripping reactively would jitter the handle). We keep
// the raw positions here and only push the domain values up to the parent's
// FiltersState. When the parent resets filters externally, the watchers below
// snap raw positions back to the extremes.
const retRawMin = ref<number>(0);
const retRawMax = ref<number>(100);
const balRawMin = ref<number>(0);
const balRawMax = ref<number>(100);

watch(retRawMin, (v) => {
  emit('update:filters', { retMin: v <= 0 ? null : returnFromRaw(v) });
});
watch(retRawMax, (v) => {
  emit('update:filters', { retMax: v >= 100 ? null : returnFromRaw(v) });
});
watch(balRawMin, (v) => {
  emit('update:filters', { balanceMin: v <= 0 ? null : balanceFromRaw(v) });
});
watch(balRawMax, (v) => {
  emit('update:filters', { balanceMax: v >= 100 ? null : balanceFromRaw(v) });
});

// External reset (parent's `resetFilters` or InvestAmount-clear) → snap handles.
watch(
  () => [props.filters.retMin, props.filters.retMax],
  ([lo, hi]) => {
    if (lo == null) retRawMin.value = 0;
    if (hi == null) retRawMax.value = 100;
  },
);
watch(
  () => [props.filters.balanceMin, props.filters.balanceMax],
  ([lo, hi]) => {
    if (lo == null) balRawMin.value = 0;
    if (hi == null) balRawMax.value = 100;
  },
);

function patch(p: Partial<FiltersState>) {
  emit('update:filters', p);
}
function setRisk(v: Set<RiskLevel>) {
  patch({ risk: v });
}

function applyInvest(range: { min: number; max: number } | null) {
  if (range == null) {
    patch({ balanceMin: null, balanceMax: null });
    balRawMin.value = 0;
    balRawMax.value = 100;
  } else {
    balRawMin.value = range.min;
    balRawMax.value = range.max;
    // The watchers above will fire and propagate to filters.balanceMin/Max.
  }
}
</script>

<template>
  <aside class="pelican-filters" :class="{ open }">
    <div class="ftitle-row">
      <label class="ftitle">{{ t('filters.risk') }}</label>
      <button class="btn-reset" type="button" @click="emit('reset')">{{ t('filters.reset') }}</button>
    </div>
    <RiskChips :model-value="filters.risk" @update:model-value="setRisk" />

    <InvestAmount
      :model-value="investAmount"
      @update:model-value="(v) => emit('update:investAmount', v)"
      @apply="applyInvest"
    />

    <RangeDual
      :label="t('filters.return')"
      :model-value-min="retRawMin"
      :model-value-max="retRawMax"
      :format-raw="(v) => fmtRetMag(v)"
      :raw-to-domain="(raw) => returnFromRaw(raw)"
      :scale-hints="['0%', '200%', '50K%+']"
      max-label="50K%+"
      @update:model-value-min="(v) => (retRawMin = v ?? 0)"
      @update:model-value-max="(v) => (retRawMax = v ?? 100)"
    />

    <RangeSingle
      :label="t('filters.maxDD')"
      :model-value="filters.ddMax"
      :min="0"
      :max="100"
      :step="5"
      :any-at="100"
      :inverted="true"
      :format="(v) => v + '%'"
      @update:model-value="(v) => patch({ ddMax: v == null || v >= 100 ? null : v })"
    />

    <RangeDual
      :label="t('filters.balance')"
      :model-value-min="balRawMin"
      :model-value-max="balRawMax"
      :format-raw="(v) => fmtAUM(v)"
      :raw-to-domain="(raw) => balanceFromRaw(raw)"
      :scale-hints="['$0', '$10K', '$10M']"
      max-label="$10M+"
      @update:model-value-min="(v) => (balRawMin = v ?? 0)"
      @update:model-value-max="(v) => (balRawMax = v ?? 100)"
    />

    <RangeSingle
      :label="t('filters.mgmtFee')"
      :model-value="filters.feeMax"
      :min="0"
      :max="100"
      :step="5"
      :any-at="100"
      :inverted="true"
      :format="(v) => v + '%'"
      @update:model-value="(v) => patch({ feeMax: v == null || v >= 100 ? null : v })"
    />

    <RangeSingle
      :label="t('filters.copiersAUM')"
      :model-value="filters.aumMin"
      :min="0"
      :max="5000000"
      :step="50000"
      :format="(v) => '≥ ' + fmtAUM(v)"
      @update:model-value="(v) => patch({ aumMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      :label="t('filters.copiers')"
      :model-value="filters.copiersMin"
      :min="0"
      :max="3000"
      :step="10"
      :format="(v) => '≥ ' + v"
      @update:model-value="(v) => patch({ copiersMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      :label="t('filters.age')"
      :model-value="filters.ageMin"
      :min="0"
      :max="3000"
      :step="10"
      :format="(v) => '≥ ' + v + 'd'"
      @update:model-value="(v) => patch({ ageMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      :label="t('filters.trades')"
      :model-value="filters.tradesMin"
      :min="0"
      :max="10000"
      :step="50"
      :format="(v) => '≥ ' + v"
      @update:model-value="(v) => patch({ tradesMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      :label="t('filters.winRate')"
      :model-value="filters.winrateMin"
      :min="0"
      :max="100"
      :step="5"
      :format="(v) => '≥ ' + v + '%'"
      @update:model-value="(v) => patch({ winrateMin: v && v > 0 ? v : null })"
    />
  </aside>
</template>

<style scoped>
/* ----- Filters sidebar (frosted glass card) ----- */
.pelican-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 18px 12px;
  background: rgba(24, 28, 34, .55);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
          backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 12px;
  height: fit-content;
  position: sticky;
  top: 84px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, .35),
    inset 0 1px 0 rgba(255, 255, 255, .12),
    inset 0 -1px 0 rgba(0, 0, 0, .18);
  /* Subtle frost-noise overlay */
  position: sticky;
}
:global(.pelican-libsoc[data-theme="light"]) .pelican-filters {
  background: rgba(255, 255, 255, .62);
  border-color: rgba(0, 0, 0, .06);
  box-shadow:
    0 8px 32px rgba(20, 30, 20, .08),
    inset 0 1px 0 rgba(255, 255, 255, .85),
    inset 0 -1px 0 rgba(0, 0, 0, .04);
}
.pelican-filters::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: .06;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
.pelican-filters > * {
  position: relative;
  z-index: 1;
}

/* ----- Section title row (label + reset button on the Risk section) ----- */
.ftitle-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.ftitle {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--muted);
}

/* ----- Reset filters: orange-bordered pill ----- */
.btn-reset {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  background: transparent;
  color: var(--orange);
  border: 1.5px solid var(--orange);
  border-radius: 14px;
  cursor: pointer;
  letter-spacing: .2px;
  text-transform: lowercase;
  white-space: nowrap;
  transition: background .15s, color .15s, transform .25s cubic-bezier(.2, .8, .2, 1);
}
.btn-reset:hover {
  background: var(--orange);
  color: #fff;
  transform: scale(1.03);
}
:global(.pelican-libsoc[data-theme="dark"]) .btn-reset {
  color: #ffb38a;
  border-color: #ffb38a;
}
:global(.pelican-libsoc[data-theme="dark"]) .btn-reset:hover {
  background: #ffb38a;
  color: #1a1d22;
}

@media (max-width: 1340px) {
  .pelican-filters {
    position: static;
    padding: 14px;
    max-width: 760px;
  }
}

@media (max-width: 720px) {
  .pelican-filters {
    display: none;
    width: 100%;
    padding: 14px;
  }
  .pelican-filters.open { display: flex; }
}
</style>
