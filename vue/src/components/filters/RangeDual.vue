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
// Feed only two CSS custom properties to the track. The rail + between-thumbs
// fill are painted by real 4px-tall ::before/::after pseudo-elements in scoped
// CSS (like the reference), so there is no background-size to be reset and the
// fill can never balloon to the full element height.
const trackStyle = computed(() => ({
  '--lo': `${loPct.value}%`,
  '--hi': `${hiPct.value}%`,
}));

function onMin(e: Event) {
  const target = e.target as HTMLInputElement;
  let v = parseInt(target.value, 10);
  if (isNaN(v)) return;
  if (v >= hi.value) v = hi.value - 1;
  if (v < rawMin.value) v = rawMin.value;
  // Force the DOM input value back to the clamped value *during* the active
  // drag. Browsers ignore programmatic value updates on a range input that is
  // currently being dragged — relying on Vue's :value rebind alone leaves the
  // thumb visually past the other handle until the user releases.
  target.value = String(v);
  emit('update:modelValueMin', v <= rawMin.value ? null : v);
}
function onMax(e: Event) {
  const target = e.target as HTMLInputElement;
  let v = parseInt(target.value, 10);
  if (isNaN(v)) return;
  if (v <= lo.value) v = lo.value + 1;
  if (v > rawMax.value) v = rawMax.value;
  target.value = String(v);
  emit('update:modelValueMax', v >= rawMax.value ? null : v);
}
</script>

<template>
  <div class="pelican-fgroup">
    <div class="title-row">
      <label class="title">{{ label }}</label>
      <span class="val" :class="{ dim: lo <= rawMin && hi >= rawMax }">{{ rangeText }}</span>
    </div>
    <div class="dual-track" :style="trackStyle">
      <input
        type="range"
        class="range-dual"
        :min="rawMin"
        :max="rawMax"
        :value="lo"
        :style="{ zIndex: hi >= rawMax ? 5 : 4 }"
        @input="onMin"
        @change="onMin"
      />
      <input
        type="range"
        class="range-dual"
        :min="rawMin"
        :max="rawMax"
        :value="hi"
        :style="{ zIndex: hi >= rawMax ? 4 : 5 }"
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
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--fg-3);
}
.val {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.val.dim {
  color: var(--fg-3);
  font-weight: 500;
}
.dual-track {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}
/* Unfilled rail — full-width 4px strip. */
.dual-track::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px;
  border-radius: 2px;
  background: var(--slider-track);
}
/* Filled segment — only between the two thumbs, driven by --lo/--hi. */
.dual-track::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: var(--lo, 0%);
  right: calc(100% - var(--hi, 100%));
  height: 4px;
  border-radius: 2px;
  background: var(--slider-fill);
  pointer-events: none;
}
.dual-track .range-dual {
  position: absolute;
  inset: 0;
  width: 100%;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  /* Track clicks are no-op — only thumb-grabs move handles, which lets the
     strict clamp in onMin/onMax actually keep lo < hi. Without this, clicking
     near the left thumb sends the event to whichever input has higher z-index
     (max input by default) and teleports the wrong handle. */
  pointer-events: none;
}
.range-dual::-webkit-slider-runnable-track {
  background: transparent;
  height: 4px;
}
.range-dual::-moz-range-track             { background: transparent; height: 4px; }
.range-dual::-moz-range-progress          { background: transparent; }
.range-dual::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--slider-thumb-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .3);
  cursor: pointer;
  /* Center the 18px thumb on the 4px runnable-track: -(18-4)/2 = -7px. */
  margin-top: -7px;
  pointer-events: auto;
  position: relative;
  z-index: 2;
  transition: transform .15s, box-shadow .25s;
}
.range-dual:hover::-webkit-slider-thumb,
.range-dual:active::-webkit-slider-thumb,
.range-dual:focus::-webkit-slider-thumb {
  transform: scale(1.18);
  z-index: 3;
  box-shadow: 0 0 0 6px rgba(239, 124, 70, .18), 0 1px 4px rgba(0, 0, 0, .3);
}
.range-dual::-moz-range-thumb {
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--slider-thumb-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .3);
  cursor: pointer;
  pointer-events: auto;
  transition: transform .15s, box-shadow .25s;
}
.range-dual:hover::-moz-range-thumb,
.range-dual:active::-moz-range-thumb,
.range-dual:focus::-moz-range-thumb {
  transform: scale(1.18);
  box-shadow: 0 0 0 6px rgba(239, 124, 70, .18), 0 1px 4px rgba(0, 0, 0, .3);
}
.scale {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  color: var(--fg-3);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  user-select: none;
  pointer-events: none;
  margin-top: 8px;
}
.scale span:nth-child(1) { text-align: left; }
.scale span:nth-child(2) { text-align: center; }
.scale span:nth-child(3) { text-align: right; }
</style>
