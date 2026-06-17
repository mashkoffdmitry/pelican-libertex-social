<script setup lang="ts">
import { ref, watch } from 'vue';
import RiskChips from './filters/RiskChips.vue';
import BucketChips from './filters/BucketChips.vue';
import RangeSingle from './filters/RangeSingle.vue';
import RangeDual from './filters/RangeDual.vue';
import InvestAmount from './filters/InvestAmount.vue';
import ManagerCommission from './filters/ManagerCommission.vue';
import { useI18n } from '../composables/useI18n';
import type { FiltersState } from '../types/filters';
import type { RiskLevel } from '../types/strategy';
import { AGE_BUCKETS, COPIER_BUCKETS } from '../constants/buckets';
import { fmtAUM, fmtRetMag } from '../utils/format';
import { balanceFromRaw, returnFromRaw, rawFromReturn } from '../utils/scales';

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

// Advanced block is collapsed by default; toggled by the "Advanced Filters" button.
const advancedOpen = ref(false);

// Dual-range sliders need raw 0..100 positions held *here*, not derived from
// `filters.retMin/retMax` (the slider's log scale isn't trivially invertible
// per-tick, and round-tripping reactively would jitter the handle). We keep
// the raw positions here and only push the domain values up to the parent's
// FiltersState. When the parent resets filters externally, the watchers below
// snap raw positions back to the extremes.
// Return defaults to a 1% floor (raw 1 == 1%) so flat/negative strategies are hidden.
const retRawMin = ref<number>(props.filters.retMin != null ? rawFromReturn(props.filters.retMin) : 0);
const retRawMax = ref<number>(props.filters.retMax != null ? rawFromReturn(props.filters.retMax) : 100);
const balRawMin = ref<number>(0);
const balRawMax = ref<number>(100);

// Track the last value WE emitted so the snap watcher can tell an external change
// (reset) from our own drag — re-deriving the handle from the rounded domain value
// on every drag would jitter (raw → % → raw is not an exact round-trip).
let lastRetMin: number | null = props.filters.retMin ?? null;
let lastRetMax: number | null = props.filters.retMax ?? null;

watch(retRawMin, (v) => {
  lastRetMin = v <= 0 ? null : returnFromRaw(v);
  emit('update:filters', { retMin: lastRetMin });
});
watch(retRawMax, (v) => {
  lastRetMax = v >= 100 ? null : returnFromRaw(v);
  emit('update:filters', { retMax: lastRetMax });
});
watch(balRawMin, (v) => {
  emit('update:filters', { balanceMin: v <= 0 ? null : balanceFromRaw(v) });
});
watch(balRawMax, (v) => {
  emit('update:filters', { balanceMax: v >= 100 ? null : balanceFromRaw(v) });
});

// External reset → snap handles back. Guarded so our own drag emits don't re-enter.
watch(
  () => [props.filters.retMin, props.filters.retMax],
  ([lo, hi]) => {
    if (lo !== lastRetMin) {
      retRawMin.value = lo == null ? 0 : rawFromReturn(lo);
      lastRetMin = lo ?? null;
    }
    if (hi !== lastRetMax) {
      retRawMax.value = hi == null ? 100 : rawFromReturn(hi);
      lastRetMax = hi ?? null;
    }
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
      <span class="panel-title">{{ t('filters.title') }}</span>
      <button class="btn-reset" type="button" @click="emit('reset')">{{ t('filters.reset') }}</button>
    </div>

    <!-- ── BASIC ───────────────────────────────────────────── -->
    <div class="section-label">{{ t('filters.basic') }}</div>

    <div class="fgroup">
      <label class="flabel">{{ t('filters.risk') }}</label>
      <RiskChips :model-value="filters.risk" @update:model-value="setRisk" />
    </div>

    <div class="fgroup">
      <label class="flabel">{{ t('filters.age') }}</label>
      <BucketChips
        :model-value="filters.ageBuckets"
        :buckets="AGE_BUCKETS"
        @update:model-value="(v) => patch({ ageBuckets: v })"
      />
    </div>

    <div class="fgroup">
      <label class="flabel">{{ t('filters.copiers') }}</label>
      <BucketChips
        :model-value="filters.copierBuckets"
        :buckets="COPIER_BUCKETS"
        @update:model-value="(v) => patch({ copierBuckets: v })"
      />
    </div>

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

    <InvestAmount
      :model-value="investAmount"
      @update:model-value="(v) => emit('update:investAmount', v)"
      @apply="applyInvest"
    />

    <!-- ── ADVANCED (collapsible) ──────────────────────────── -->
    <button class="adv-toggle" type="button" @click="advancedOpen = !advancedOpen">
      <span class="adv-icon">{{ advancedOpen ? '−' : '+' }}</span>
      {{ t('filters.advancedToggle') }}
    </button>

    <div v-show="advancedOpen" class="advanced">
      <div class="section-label">{{ t('filters.advanced') }}</div>

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

      <ManagerCommission
        :model-value="filters.feeMax"
        :label="t('filters.managerCommission')"
        :free-label="t('filters.free')"
        @update:model-value="(v) => patch({ feeMax: v })"
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
    </div>
  </aside>
</template>

<style scoped>
.pelican-filters {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
          backdrop-filter: blur(14px) saturate(140%);
  box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, .10), inset 0 -1px 0 rgba(0, 0, 0, .18);
}
.ftitle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--fg);
}
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--fg-3);
  margin-top: 2px;
}
.fgroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.flabel {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--fg-3);
}
.btn-reset {
  background: transparent;
  border: 1.5px solid var(--accent);
  color: var(--accent);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 14px;
  letter-spacing: .2px;
  transition: background .15s, color .15s, transform .15s;
}
.btn-reset:hover {
  background: var(--accent);
  color: var(--accent-fg);
  transform: scale(1.03);
}
.adv-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  margin-top: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--fg);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.adv-toggle:hover {
  border-color: var(--accent);
}
.adv-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 15px;
  line-height: 1;
  color: var(--accent);
}
.advanced {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 720px) {
  .pelican-filters {
    display: none;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .pelican-filters.open {
    display: flex;
  }
}
</style>
