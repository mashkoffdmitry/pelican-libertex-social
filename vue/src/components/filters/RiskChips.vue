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
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  cursor: pointer;
  padding: 5px 10px;
  background: var(--input-bg);
  color: var(--text-2);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  font-family: inherit;
  font-size: 12px;
  transition:
    background .15s, border-color .15s, color .15s,
    transform .25s cubic-bezier(.2, .8, .2, 1),
    box-shadow .25s;
}
.chip:hover {
  border-color: var(--orange);
  transform: translateY(-1px);
}
.chip.on {
  background: var(--orange);
  color: #fff;
  border-color: var(--orange);
  box-shadow: 0 4px 14px rgba(239, 124, 70, .40);
}
</style>
