<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { fmtAUM } from '../../utils/format';
import { rawFromBalance } from '../../utils/scales';

const props = defineProps<{
  modelValue: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: number | null): void;
  (e: 'apply', balance: { min: number; max: number } | null): void;
}>();

const { t } = useI18n();

const display = computed(() =>
  props.modelValue == null ? t('filters.any') : fmtAUM(props.modelValue),
);

function onChange(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim();
  if (!raw) {
    emit('update:modelValue', null);
    emit('apply', null);
    return;
  }
  const v = parseInt(raw, 10);
  if (isNaN(v) || v <= 0) {
    emit('update:modelValue', null);
    emit('apply', null);
    return;
  }
  emit('update:modelValue', v);
  emit('apply', { min: rawFromBalance(50), max: rawFromBalance(v) });
}
</script>

<template>
  <div class="pelican-fgroup">
    <div class="title-row">
      <label class="title">{{ t('filters.investAmount') }}</label>
      <span class="val" :class="{ dim: modelValue == null }">{{ display }}</span>
    </div>
    <input
      type="number"
      :min="50"
      :step="50"
      :placeholder="t('filters.investPlaceholder')"
      autocomplete="off"
      :value="modelValue ?? ''"
      @change="onChange"
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
}
.val.dim {
  color: var(--fg-3);
  font-weight: 500;
}
input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--fg);
  font: inherit;
}
input:focus {
  outline: none;
  border-color: var(--accent);
}
</style>
