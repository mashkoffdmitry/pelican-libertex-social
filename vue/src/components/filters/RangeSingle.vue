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
      <span class="val">{{ display }}</span>
    </div>
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
.range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  padding: 0;
  margin: 4px 0 0;
  display: block;
  background: var(--line);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
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
  transition: transform .15s, box-shadow .25s;
}
.range::-webkit-slider-thumb:hover,
.range:active::-webkit-slider-thumb {
  transform: scale(1.18);
  box-shadow:
    0 0 0 6px rgba(239, 124, 70, .18),
    inset 0 1px 0 rgba(255, 255, 255, .45),
    0 1px 4px rgba(0, 0, 0, .35);
}
.range::-moz-range-thumb {
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
.range::-moz-range-track {
  background: var(--line);
  height: 4px;
  border-radius: 2px;
}
.range::-moz-range-progress {
  background: var(--orange);
  height: 4px;
  border-radius: 2px;
}
</style>
