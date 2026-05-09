<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';
import type { MarketSlice } from '../types/strategy';
import { donutGeometry } from '../utils/svg';

const props = withDefaults(
  defineProps<{
    markets: MarketSlice[];
    width?: number;
    height?: number;
  }>(),
  { width: 520, height: 280 },
);

const { t } = useI18n();

const empty = computed(() => !props.markets || props.markets.length === 0);
const geom = computed(() => donutGeometry(props.markets, props.width, props.height));
</script>

<template>
  <span v-if="empty" class="dim">{{ t('donut.empty') }}</span>
  <svg
    v-else
    class="pelican-donut"
    :viewBox="`0 0 ${geom.width} ${geom.height}`"
    width="100%"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="t('expanded.markets')"
  >
    <g>
      <path
        v-for="s in geom.slices"
        :key="s.marketName + s.fraction"
        :d="s.arcPath"
        :fill="s.color"
        stroke="var(--card)"
        stroke-width="1.5"
      />
    </g>
    <g>
      <polyline
        v-for="s in geom.slices"
        :key="`l-${s.marketName}`"
        v-show="s.labelLine"
        :points="s.labelLine ?? ''"
        :stroke="s.color"
        stroke-width="1"
        fill="none"
      />
    </g>
    <g>
      <text
        v-for="s in geom.slices"
        :key="`t-${s.marketName}`"
        v-show="s.labelLine"
        :x="s.labelX"
        :y="s.labelY"
        :text-anchor="s.labelAnchor"
        font-size="11"
        fill="var(--text)"
        font-weight="500"
      >
        {{ s.marketName }}
        <tspan fill="var(--muted)" font-weight="400">{{ s.count }}</tspan>
      </text>
    </g>
  </svg>
</template>

<style scoped>
.pelican-donut {
  display: block;
  width: 100%;
  max-width: 100%;
}
</style>
