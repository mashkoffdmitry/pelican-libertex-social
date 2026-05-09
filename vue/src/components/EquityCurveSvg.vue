<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  width?: number;
  height?: number;
  trend?: number; // 0-1, higher = more uptrend
}

const props = withDefaults(defineProps<Props>(), {
  width: 1180,
  height: 220,
  trend: 0.85,
});

// Generate mock series data
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function genSeries(seed: number, n: number, trend: number = 0.6, vol: number = 1.0) {
  const rnd = seededRandom(seed);
  const out: number[] = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.46) * vol + trend * (1 + rnd() * 0.4);
    out.push(v);
  }
  return out;
}

function points(series: number[], w: number, h: number, padTop = 4, padBot = 4) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const usable = h - padTop - padBot;
  return series.map((p, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = padTop + (1 - (p - min) / range) * usable;
    return [x, y] as const;
  });
}

function pathFromPoints(pts: readonly (readonly [number, number])[]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}

const series = computed(() => genSeries(42, 180, props.trend, 1.6));
const pts = computed(() => points(series.value, props.width, props.height, 12, 22));
const path = computed(() => pathFromPoints(pts.value));
const area = computed(() => `${path.value} L ${props.width.toFixed(2)},${(props.height - 1).toFixed(2)} L 0,${(props.height - 1).toFixed(2)} Z`);

const min = computed(() => Math.min(...series.value));
const max = computed(() => Math.max(...series.value));

const ticks = computed(() =>
  [0, 1, 2, 3].map(i => {
    const v = max.value - (i / 3) * (max.value - min.value);
    const y = 12 + (i / 3) * (props.height - 34);
    return { v: v.toFixed(0), y };
  }),
);

const xLabels = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" style="display: block">
    <!-- Gridlines -->
    <g v-for="(t, i) in ticks" :key="`tick-${i}`">
      <line x1="0" :x2="width" :y1="t.y" :y2="t.y" stroke="var(--border)" stroke-width="1" :stroke-dasharray="i === 0 ? '' : '2 4'" />
      <text :x="width - 4" :y="t.y - 4" text-anchor="end" font-size="10" font-family="'Geist Mono', monospace" fill="var(--fg-3)">{{ t.v }}</text>
    </g>

    <!-- Area + line -->
    <path :d="area" fill="color-mix(in oklch, var(--accent) 14%, transparent)" />
    <path :d="path" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />

    <!-- X labels -->
    <text
      v-for="(l, i) in xLabels"
      :key="`label-${l}`"
      :x="(i / (xLabels.length - 1)) * (width - 24) + 12"
      :y="height - 4"
      font-size="10"
      font-family="'Geist Mono', monospace"
      fill="var(--fg-3)"
      text-anchor="middle"
    >
      {{ l }}
    </text>
  </svg>
</template>
