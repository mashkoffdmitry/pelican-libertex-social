<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: number | null;
    min: number;
    max: number;
    step?: number;
    /** If set, format(rawValue) → display string. Otherwise raw is used. */
    format?: (v: number) => string;
    /** raw value at which the filter is "any" (no constraint). Default = min. */
    anyAt?: number;
    inverted?: boolean;
  }>(),
  { step: 1 },
);

const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>();

const { t } = useI18n();

const anyAt = computed(() => props.anyAt ?? props.min);
const inverted = computed(() => !!props.inverted);

const raw = computed<number>(() => {
  if (props.modelValue == null) return inverted.value ? props.max : anyAt.value;
  return props.modelValue;
});

const display = computed(() => {
  if (props.modelValue == null) return t('filters.any');
  return props.format ? props.format(props.modelValue) : String(props.modelValue);
});

// Feed only a single `--fill` percent to the track. The rail + left-to-thumb
// fill are painted by real 4px-tall ::before/::after pseudo-elements in scoped
// CSS (like the reference). Fill is always left-to-thumb — including the
// inverted sliders, which simply rest at value=max so the whole track reads
// filled and the orange shrinks from the right as the cap is lowered.
const trackStyle = computed(() => {
  const pct =
    props.modelValue == null && !inverted.value
      ? 0
      : Math.max(0, Math.min(100, ((raw.value - props.min) / (props.max - props.min)) * 100));
  return { '--fill': `${pct}%` };
});

function onInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (isNaN(v)) return;
  if ((inverted.value && v >= props.max) || (!inverted.value && v <= anyAt.value)) {
    emit('update:modelValue', null);
  } else {
    emit('update:modelValue', v);
  }
}
</script>

<template>
  <div class="pelican-fgroup">
    <div class="title-row">
      <label class="title">{{ label }}</label>
      <span class="val" :class="{ dim: modelValue == null }">{{ display }}</span>
    </div>
    <div class="single-track" :style="trackStyle">
      <input
        type="range"
        class="range"
        :min="min"
        :max="max"
        :step="step"
        :value="raw"
        @input="onInput"
        @change="onInput"
      />
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
.single-track {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}
/* Unfilled rail — full-width 4px strip. */
.single-track::before {
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
/* Filled segment — left edge to the thumb, driven by --fill. */
.single-track::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: var(--fill, 0%);
  height: 4px;
  border-radius: 2px;
  background: var(--slider-fill);
  pointer-events: none;
}
.single-track .range {
  position: absolute;
  inset: 0;
  width: 100%;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
}
.range::-webkit-slider-runnable-track { background: transparent; height: 4px; }
.range::-moz-range-track             { background: transparent; height: 4px; }
.range::-moz-range-progress          { background: transparent; }
.range::-webkit-slider-thumb {
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
  position: relative;
  z-index: 2;
  transition: transform .15s, box-shadow .25s;
}
.range:hover::-webkit-slider-thumb,
.range:active::-webkit-slider-thumb,
.range:focus::-webkit-slider-thumb {
  transform: scale(1.18);
  box-shadow: 0 0 0 6px rgba(239, 124, 70, .18), 0 1px 4px rgba(0, 0, 0, .3);
}
.range::-moz-range-thumb {
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--slider-thumb-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .3);
  cursor: pointer;
  transition: transform .15s, box-shadow .25s;
}
.range:hover::-moz-range-thumb,
.range:active::-moz-range-thumb,
.range:focus::-moz-range-thumb {
  transform: scale(1.18);
  box-shadow: 0 0 0 6px rgba(239, 124, 70, .18), 0 1px 4px rgba(0, 0, 0, .3);
}
</style>
