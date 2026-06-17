<script setup lang="ts">
import { computed } from 'vue';
import RangeSingle from './RangeSingle.vue';

// Maps to FiltersState.feeMax (a max-fee cap in %):
//   slider          -> feeMax = the cap (0..100, where 100 = "any" -> null)
//   "Free (0%)" box -> shortcut to feeMax = 0 (only zero-fee strategies)
// The two stay in sync: feeMax === 0 reads back as "Free" checked + slider at 0.
const props = defineProps<{
  modelValue: number | null;
  label: string;
  freeLabel: string;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>();

const free = computed(() => props.modelValue === 0);

function toggleFree() {
  emit('update:modelValue', free.value ? null : 0);
}
function onSlider(v: number | null) {
  emit('update:modelValue', v == null || v >= 100 ? null : v);
}
</script>

<template>
  <div class="mc">
    <RangeSingle
      :label="label"
      :model-value="modelValue"
      :min="0"
      :max="100"
      :step="5"
      :any-at="100"
      :inverted="true"
      :format="(v) => v + '%'"
      @update:model-value="onSlider"
    />
    <label class="check">
      <input type="checkbox" :checked="free" @change="toggleFree" />
      <span>{{ freeLabel }}</span>
    </label>
  </div>
</template>

<style scoped>
.mc {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--fg);
  cursor: pointer;
  user-select: none;
}
.check input {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
  cursor: pointer;
}
</style>
