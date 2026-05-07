<script setup lang="ts">
import { computed } from 'vue';

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

const anyAt = computed(() => props.anyAt ?? props.min);
const inverted = computed(() => !!props.inverted);

const raw = computed<number>(() => {
  if (props.modelValue == null) return inverted.value ? props.max : anyAt.value;
  return props.modelValue;
});

const display = computed(() => {
  if (props.modelValue == null) return 'any';
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
.range {
  width: 100%;
}
</style>
