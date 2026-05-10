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
.chip.risk-low.on {
  background: var(--chip-low-bg);
  color: var(--chip-low-text);
  border-color: var(--chip-low-bg);
}
.chip.risk-medium.on {
  background: var(--chip-med-bg);
  color: var(--chip-med-text);
  border-color: var(--chip-med-bg);
}
.chip.risk-high.on {
  background: var(--chip-high-bg);
  color: var(--chip-high-text);
  border-color: var(--chip-high-bg);
}
</style>
