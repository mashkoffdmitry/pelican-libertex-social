<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import type { RiskLevel } from '../../types/strategy';

const props = defineProps<{ modelValue: Set<RiskLevel> }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Set<RiskLevel>): void }>();

const { t } = useI18n();

const LEVELS: RiskLevel[] = ['Low', 'Medium', 'High'];

function toggle(level: RiskLevel) {
  const next = new Set(props.modelValue);
  if (next.has(level)) next.delete(level);
  else next.add(level);
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="pelican-chips">
    <button
      v-for="l in LEVELS"
      :key="l"
      type="button"
      class="chip"
      :class="['risk-' + l.toLowerCase(), { on: modelValue.has(l) }]"
      @click="toggle(l)"
    >
      {{ t(`risk.${l}`) }}
    </button>
  </div>
</template>

<style scoped>
.pelican-chips {
  display: flex;
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
