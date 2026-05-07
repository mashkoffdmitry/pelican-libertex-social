<script setup lang="ts">
import RiskChips from './filters/RiskChips.vue';
import RangeSingle from './filters/RangeSingle.vue';
import RangeDual from './filters/RangeDual.vue';
import InvestAmount from './filters/InvestAmount.vue';
import type { FiltersState } from '../types/filters';
import type { RiskLevel } from '../types/strategy';
import { fmtAUM, fmtRetMag } from '../utils/format';
import { balanceFromRaw, returnFromRaw } from '../utils/scales';

defineProps<{
  filters: FiltersState;
  investAmount: number | null;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:filters', f: Partial<FiltersState>): void;
  (e: 'update:investAmount', v: number | null): void;
  (e: 'reset'): void;
}>();

function patch(p: Partial<FiltersState>) {
  emit('update:filters', p);
}
function setRisk(v: Set<RiskLevel>) {
  patch({ risk: v });
}

function applyInvest(range: { min: number; max: number } | null) {
  if (range == null) {
    patch({ balanceMin: null, balanceMax: null });
  } else {
    patch({ balanceMin: balanceFromRaw(range.min), balanceMax: balanceFromRaw(range.max) });
  }
}

function setRetMin(v: number | null) {
  patch({ retMin: v == null ? null : returnFromRaw(v) });
}
function setRetMax(v: number | null) {
  patch({ retMax: v == null ? null : returnFromRaw(v) });
}
function setBalMin(v: number | null) {
  patch({ balanceMin: v == null ? null : balanceFromRaw(v) });
}
function setBalMax(v: number | null) {
  patch({ balanceMax: v == null ? null : balanceFromRaw(v) });
}
</script>

<template>
  <aside class="pelican-filters" :class="{ open }">
    <div class="ftitle-row">
      <label class="ftitle">Risk</label>
      <button class="btn-reset" type="button" @click="emit('reset')">reset filters</button>
    </div>
    <RiskChips :model-value="filters.risk" @update:model-value="setRisk" />

    <InvestAmount
      :model-value="investAmount"
      @update:model-value="(v) => emit('update:investAmount', v)"
      @apply="applyInvest"
    />

    <RangeDual
      label="Return %"
      :model-value-min="null"
      :model-value-max="null"
      :format-raw="(v) => fmtRetMag(v)"
      :raw-to-domain="(raw) => returnFromRaw(raw)"
      :scale-hints="['0%', '200%', '50K%+']"
      max-label="50K%+"
      @update:model-value-min="setRetMin"
      @update:model-value-max="setRetMax"
    />

    <RangeSingle
      label="Max Drawdown ≤"
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
      label="Balance"
      :model-value-min="null"
      :model-value-max="null"
      :format-raw="(v) => fmtAUM(v)"
      :raw-to-domain="(raw) => balanceFromRaw(raw)"
      :scale-hints="['$0', '$10K', '$10M']"
      max-label="$10M+"
      @update:model-value-min="setBalMin"
      @update:model-value-max="setBalMax"
    />

    <RangeSingle
      label="Mgmt Fee ≤"
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
      label="Copiers AUM ≥"
      :model-value="filters.aumMin"
      :min="0"
      :max="5000000"
      :step="50000"
      :format="(v) => '≥ ' + fmtAUM(v)"
      @update:model-value="(v) => patch({ aumMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      label="Copiers ≥"
      :model-value="filters.copiersMin"
      :min="0"
      :max="3000"
      :step="10"
      :format="(v) => '≥ ' + v"
      @update:model-value="(v) => patch({ copiersMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      label="Age ≥ (days)"
      :model-value="filters.ageMin"
      :min="0"
      :max="3000"
      :step="10"
      :format="(v) => '≥ ' + v + 'd'"
      @update:model-value="(v) => patch({ ageMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      label="Trades ≥"
      :model-value="filters.tradesMin"
      :min="0"
      :max="10000"
      :step="50"
      :format="(v) => '≥ ' + v"
      @update:model-value="(v) => patch({ tradesMin: v && v > 0 ? v : null })"
    />

    <RangeSingle
      label="Win Rate ≥"
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
  border-right: 1px solid var(--line);
  background: var(--card);
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
  color: var(--text);
}
.btn-reset {
  background: transparent;
  border: none;
  color: var(--orange);
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
    border-bottom: 1px solid var(--line);
  }
  .pelican-filters.open {
    display: flex;
  }
}
</style>
