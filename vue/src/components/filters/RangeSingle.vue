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

const trackStyle = computed(() => {
  if (props.modelValue == null) {
    return { background: 'var(--surface-3, #EEF0F2)' };
  }
  const pct = Math.max(0, Math.min(100, ((raw.value - props.min) / (props.max - props.min)) * 100));
  if (inverted.value) {
    return {
      background: `linear-gradient(to right,
        var(--surface-3, #EEF0F2) 0%,
        var(--surface-3, #EEF0F2) ${pct}%,
        var(--accent, #F25A24) ${pct}%,
        var(--accent, #F25A24) 100%)`,
    };
  }
  return {
    background: `linear-gradient(to right,
      var(--accent, #F25A24) 0%,
      var(--accent, #F25A24) ${pct}%,
      var(--surface-3, #EEF0F2) ${pct}%,
      var(--surface-3, #EEF0F2) 100%)`,
  };
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
  font-size: 12px;
  color: var(--fg-3);
}
.val {
  font-size: 12px;
  color: var(--fg);
}
.single-track {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  background-size: 100% 4px;
  background-repeat: no-repeat;
  background-position: center;
}
.single-track .range {
  position: absolute;
  inset: 0;
  width: 100%;
  background: transparent;
}
.range::-webkit-slider-runnable-track { background: transparent; }
.range::-moz-range-track             { background: transparent; }
.range::-moz-range-progress          { background: transparent; }
</style>
