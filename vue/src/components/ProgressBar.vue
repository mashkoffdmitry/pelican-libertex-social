<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  loaded: number;
  total: number;
  active: boolean;
}>();

const pct = computed(() =>
  props.total > 0 ? Math.min(100, (props.loaded / props.total) * 100) : 0,
);
</script>

<template>
  <div v-if="active" class="pelican-progress">
    <div class="bar"><span :style="{ width: pct.toFixed(1) + '%' }" /></div>
    <div class="caption">
      Building full catalog: <b>{{ loaded.toLocaleString('en-US') }}</b>
      / {{ total.toLocaleString('en-US') }}
      strategies ({{ pct.toFixed(0) }}%) · <i>upstream rate-limited</i>
    </div>
    <div class="hint">
      All {{ total.toLocaleString('en-US') }} strategies are visible. Stats fill in as the build
      progresses; refresh of data every 20 sec.
    </div>
  </div>
</template>

<style scoped>
.pelican-progress {
  padding: 12px 16px;
  color: var(--muted);
  font-size: 13px;
}
.bar {
  position: relative;
  height: 6px;
  width: 100%;
  background: var(--line-2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--orange);
  transition: width 0.4s ease;
}
.caption b {
  color: var(--text);
}
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted-2);
}
</style>
