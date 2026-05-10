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
.pelican-filters {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  width: 260px;
  flex: none;
}
.ftitle-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.ftitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
}
.btn-reset {
  background: transparent;
  border: none;
  color: var(--accent);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.btn-reset:hover {
  text-decoration: underline;
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
