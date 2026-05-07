<script setup lang="ts">
import { computed } from 'vue';
import { sparklineGeometry } from '../utils/svg';
import type { HistoryPoint } from '../types/strategy';

const props = withDefaults(
  defineProps<{
    history: HistoryPoint[] | null | undefined;
    width?: number;
    height?: number;
  }>(),
  { width: 140, height: 34 },
);

const geom = computed(() => sparklineGeometry(props.history, props.width, props.height));
</script>

<template>
  <svg
    v-if="!geom.hasData"
    class="pelican-spark"
    :width="geom.width"
    :height="geom.height"
    role="img"
    aria-label="No equity data"
  >
    <text x="2" y="20" font-size="11" fill="var(--spark-no-data)">no data</text>
  </svg>
  <svg
    v-else
    class="pelican-spark"
    :width="geom.width"
    :height="geom.height"
    :viewBox="`0 0 ${geom.width} ${geom.height}`"
    preserveAspectRatio="none"
    role="img"
    aria-label="Equity curve"
  >
    <line
      x1="0"
      :x2="geom.width"
      :y1="geom.zeroY"
      :y2="geom.zeroY"
      stroke="var(--grid-line)"
      stroke-dasharray="2 3"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <path
      :d="geom.areaPath"
      :fill="geom.positive ? 'var(--area-green)' : 'var(--area-red)'"
      stroke="none"
    />
    <path
      :d="geom.linePath"
      fill="none"
      :stroke="geom.positive ? 'var(--green)' : 'var(--red)'"
      stroke-width="1.6"
      stroke-linejoin="round"
      stroke-linecap="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style scoped>
.pelican-spark {
  display: block;
  width: 100%;
  max-width: 100%;
}
</style>
