<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
  loaded: number;
  total: number;
  active: boolean;
}>();

const { t } = useI18n();

const pct = computed(() =>
  props.total > 0 ? Math.min(100, (props.loaded / props.total) * 100) : 0,
);
</script>

<template>
  <div v-if="active" class="pelican-progress">
    <div class="bar"><span :style="{ width: pct.toFixed(1) + '%' }" /></div>
    <div class="caption">{{ t('progress.refreshing') }}&thinsp;·&thinsp;{{ pct.toFixed(0) }}%</div>
  </div>
</template>

<style scoped>
.pelican-progress {
  padding: 0 0 10px;
}
.bar {
  height: 3px;
  width: 100%;
  background: var(--line-2);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--orange);
  transition: width 0.6s ease;
}
.caption {
  padding: 6px 16px 0;
  font-size: 11px;
  color: var(--muted-2);
  letter-spacing: 0.01em;
}
</style>
