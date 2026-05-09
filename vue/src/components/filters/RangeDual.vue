<script setup lang="ts">
import { computed } from 'vue';

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

const rawMin = computed(() => props.rawMin ?? 0);
const rawMax = computed(() => props.rawMax ?? 100);

const lo = computed(() => props.modelValueMin ?? rawMin.value);
const hi = computed(() => props.modelValueMax ?? rawMax.value);

const loLabel = computed(() =>
  lo.value <= rawMin.value ? (props.minLabel ?? 'any') : props.formatRaw(props.rawToDomain(lo.value)),
);
const hiLabel = computed(() =>
  hi.value >= rawMax.value
    ? (props.maxLabel ?? 'any')
    : props.formatRaw(props.rawToDomain(hi.value)),
);

const rangeText = computed(() => {
  if (lo.value <= rawMin.value && hi.value >= rawMax.value) return 'any';
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
  gap: 4px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.title {
  font-size: 12px;
  color: var(--muted);
}
.val {
  font-size: 12px;
  color: var(--text);
}
.dual-track {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  /* height matches native track (~4px). Applied via background-size so it aligns vertically */
  background-size: 100% 4px;
  background-repeat: no-repeat;
  background-position: center;
}
.dual-track .range-dual {
  position: absolute;
  inset: 0;
  width: 100%;
  background: transparent;
  pointer-events: auto;
}
.range-dual::-webkit-slider-runnable-track { background: transparent; }
.range-dual::-moz-range-track             { background: transparent; }
.range-dual::-moz-range-progress          { background: transparent; }
.scale {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 11px;
  margin-top: 2px;
}
</style>
