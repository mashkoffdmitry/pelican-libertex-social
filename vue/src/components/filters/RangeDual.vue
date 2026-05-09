<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{
  label: string;
  /** Raw min handle value (0..rawMax). null = no min filter. */
  modelValueMin: number | null;
  /** Raw max handle value (0..rawMax). null = no max filter. */
  modelValueMax: number | null;
  rawMin?: number;
  rawMax?: number;
  /** Format raw → display ("$10K" / "200%"). Used for both min and max. */
  formatRaw: (v: number) => string;
  /** Map raw 0..rawMax onto domain (returnFromRaw, balanceFromRaw). */
  rawToDomain: (raw: number) => number;
  scaleHints?: string[];
  minLabel?: string;
  maxLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValueMin', v: number | null): void;
  (e: 'update:modelValueMax', v: number | null): void;
}>();

const { t } = useI18n();

const rawMin = computed(() => props.rawMin ?? 0);
const rawMax = computed(() => props.rawMax ?? 100);

const lo = computed(() => props.modelValueMin ?? rawMin.value);
const hi = computed(() => props.modelValueMax ?? rawMax.value);

const loLabel = computed(() =>
  lo.value <= rawMin.value
    ? (props.minLabel ?? t('filters.any'))
    : props.formatRaw(props.rawToDomain(lo.value)),
);
const hiLabel = computed(() =>
  hi.value >= rawMax.value
    ? (props.maxLabel ?? t('filters.any'))
    : props.formatRaw(props.rawToDomain(hi.value)),
);

const rangeText = computed(() => {
  if (lo.value <= rawMin.value && hi.value >= rawMax.value) return t('filters.any');
  return `${loLabel.value} – ${hiLabel.value}`;
});

const loPct = computed(() => ((lo.value - rawMin.value) / (rawMax.value - rawMin.value)) * 100);
const hiPct = computed(() => ((hi.value - rawMin.value) / (rawMax.value - rawMin.value)) * 100);
const trackStyle = computed(() => ({
  background: `linear-gradient(to right,
    var(--track-bg, #e2e8f0) 0%,
    var(--track-bg, #e2e8f0) ${loPct.value}%,
    var(--accent, #3b82f6) ${loPct.value}%,
    var(--accent, #3b82f6) ${hiPct.value}%,
    var(--track-bg, #e2e8f0) ${hiPct.value}%,
    var(--track-bg, #e2e8f0) 100%)`,
}));

function onMin(e: Event) {
  let v = parseInt((e.target as HTMLInputElement).value, 10);
  if (isNaN(v)) return;
  if (v > hi.value) v = hi.value;
  emit('update:modelValueMin', v <= rawMin.value ? null : v);
}
function onMax(e: Event) {
  let v = parseInt((e.target as HTMLInputElement).value, 10);
  if (isNaN(v)) return;
  if (v < lo.value) v = lo.value;
  emit('update:modelValueMax', v >= rawMax.value ? null : v);
}
</script>

<template>
  <div class="pelican-fgroup">
    <div class="title-row">
      <label class="title">{{ label }}</label>
      <span class="val">{{ rangeText }}</span>
    </div>
    <div class="dual-track" :style="trackStyle">
      <input
        type="range"
        class="range-dual"
        :min="rawMin"
        :max="rawMax"
        :value="lo"
        :style="{ zIndex: lo <= rawMin || lo >= hi ? 5 : 4 }"
        @input="onMin"
        @change="onMin"
      />
      <input
        type="range"
        class="range-dual"
        :min="rawMin"
        :max="rawMax"
        :value="hi"
        :style="{ zIndex: lo <= rawMin || lo >= hi ? 4 : 5 }"
        @input="onMax"
        @change="onMax"
      />
    </div>
    <div v-if="scaleHints?.length" class="scale">
      <span v-for="h in scaleHints" :key="h">{{ h }}</span>
    </div>
  </div>
</template>

<style scoped>
.pelican-fgroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--muted);
}
.val {
  font-size: 12px;
  font-weight: 600;
  color: var(--orange);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dual-track {
  position: relative;
  height: 26px;
  padding-top: 14px;
}
.dual-track .range-dual {
  position: absolute;
  left: 0;
  right: 0;
  top: 14px;
  width: 100%;
  height: 18px;
  margin: 0;
  padding: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
  outline: none;
}
.range-dual::-webkit-slider-runnable-track { background: transparent; height: 4px; }
.range-dual::-moz-range-track             { background: transparent; height: 4px; }
.range-dual::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
  width: 18px;
  height: 18px;
  border: 2px solid var(--card);
  border-radius: 50%;
  cursor: pointer;
  background:
    radial-gradient(circle at 50% 22%, rgba(255, 255, 255, .65) 0%, rgba(255, 255, 255, 0) 35%),
    linear-gradient(180deg, var(--orange-2) 0%, var(--orange) 60%, #c14a23 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .45),
    0 1px 4px rgba(0, 0, 0, .35);
  margin-top: -7px;
  position: relative;
  z-index: 2;
  transition: transform .15s, box-shadow .25s;
}
.range-dual:active::-webkit-slider-thumb,
.range-dual:focus::-webkit-slider-thumb {
  transform: scale(1.18);
  box-shadow:
    0 0 0 6px rgba(239, 124, 70, .18),
    inset 0 1px 0 rgba(255, 255, 255, .45),
    0 1px 4px rgba(0, 0, 0, .35);
  z-index: 3;
}
.range-dual::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border: 2px solid var(--card);
  border-radius: 50%;
  cursor: pointer;
  background:
    radial-gradient(circle at 50% 22%, rgba(255, 255, 255, .65) 0%, rgba(255, 255, 255, 0) 35%),
    linear-gradient(180deg, var(--orange-2) 0%, var(--orange) 60%, #c14a23 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .45),
    0 1px 4px rgba(0, 0, 0, .35);
}
.scale {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  margin-top: 4px;
  font-size: 10px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  user-select: none;
  pointer-events: none;
}
.scale span:nth-child(1) { text-align: left; }
.scale span:nth-child(2) { text-align: center; }
.scale span:nth-child(3) { text-align: right; }
</style>
