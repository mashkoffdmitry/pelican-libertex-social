<script setup lang="ts" generic="T extends string">
import { useI18n } from '../../composables/useI18n';
import type { BucketDef } from '../../constants/buckets';

const props = defineProps<{
  modelValue: Set<T>;
  buckets: BucketDef<T>[];
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Set<T>): void }>();

const { t } = useI18n();

function toggle(id: T) {
  const next = new Set(props.modelValue);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="pelican-chips">
    <button
      v-for="b in buckets"
      :key="b.id"
      type="button"
      class="chip"
      :class="{ on: modelValue.has(b.id) }"
      @click="toggle(b.id)"
    >
      {{ t(b.labelKey) }}
    </button>
  </div>
</template>

<style scoped>
.pelican-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  cursor: pointer;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg);
  font: inherit;
  font-size: 12px;
  transition: background 0.15s, border-color 0.15s;
}
.chip:hover {
  border-color: var(--accent);
}
.chip.on {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
  box-shadow: 0 4px 14px rgba(239, 124, 70, .35);
}
</style>
