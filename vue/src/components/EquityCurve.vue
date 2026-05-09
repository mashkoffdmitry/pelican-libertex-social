<script setup lang="ts">
import { computed } from 'vue';
import type { HistoryPoint } from '../types/strategy';

const props = withDefaults(
  defineProps<{
    history: HistoryPoint[] | null | undefined;
    width?: number;
    height?: number;
  }>(),
  { width: 760, height: 220 },
);

const PAD_L = 0;
const PAD_R = 46; // y-axis label space
const PAD_T = 12;
const PAD_B = 22; // x-axis label space
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const geom = computed(() => {
  const h = props.history;
  if (!h || h.length < 2) return null;

  const cw = props.width - PAD_L - PAD_R;
  const ch = props.height - PAD_T - PAD_B;

  const times = h.map((p) => Date.parse(p.Timestamp));
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const tSpan = tMax - tMin || 1;

  const ys = h.map((p) => p.AccountReturn);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = yMax - yMin || 1;

  const px = (t: number) => PAD_L + ((t - tMin) / tSpan) * cw;
  const py = (v: number) => PAD_T + (1 - (v - yMin) / yRange) * ch;

  const pts = h.map((p, i) => [px(times[i]), py(p.AccountReturn)] as [number, number]);
  const linePath = 'M ' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
  const bottomY = PAD_T + ch;
  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1][0].toFixed(1)},${bottomY} L ${pts[0][0].toFixed(1)},${bottomY} Z`;

  // 4 horizontal gridlines
  const gridLines = [0, 1, 2, 3].map((i) => {
    const frac = i / 3;
    const value = yMax - frac * yRange;
    const y = PAD_T + frac * ch;
    const label = (value >= 0 ? '+' : '') + value.toFixed(0) + '%';
    return { y, label, dashed: i > 0 };
  });

  // X-axis month labels — deduplicate by month, cap at 8
  const xLabels: { x: number; label: string }[] = [];
  let prevMonth = -1;
  times.forEach((t) => {
    const m = new Date(t).getMonth();
    if (m !== prevMonth) {
      xLabels.push({ x: px(t), label: MONTHS[m] });
      prevMonth = m;
    }
  });
  const step = Math.max(1, Math.ceil(xLabels.length / 8));
  const filteredX = xLabels.filter((_, i) => i % step === 0);

  return {
    linePath,
    areaPath,
    gridLines,
    xLabels: filteredX,
    rightEdge: PAD_L + cw,
    labelY: PAD_T + ch + 14,
  };
});
</script>

<template>
  <svg
    class="pl-equity-curve"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Equity curve"
  >
    <template v-if="geom">
      <!-- Gridlines -->
      <line
        v-for="(gl, i) in geom.gridLines"
        :key="'g' + i"
        :x1="PAD_L"
        :x2="geom.rightEdge"
        :y1="gl.y"
        :y2="gl.y"
        stroke="var(--pl-border)"
        :stroke-dasharray="gl.dashed ? '2 4' : undefined"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <!-- Y-axis labels -->
      <text
        v-for="(gl, i) in geom.gridLines"
        :key="'yl' + i"
        :x="geom.rightEdge + 5"
        :y="gl.y + 4"
        font-size="10"
        font-family="'Geist Mono', monospace"
        font-variant-numeric="tabular-nums"
        fill="var(--pl-fg-3)"
        text-anchor="start"
      >{{ gl.label }}</text>
      <!-- Area fill -->
      <path
        :d="geom.areaPath"
        fill="color-mix(in oklch, var(--pl-accent) 14%, transparent)"
        stroke="none"
      />
      <!-- Stroke line -->
      <path
        :d="geom.linePath"
        fill="none"
        stroke="var(--pl-accent)"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
      <!-- X-axis labels -->
      <text
        v-for="(xl, i) in geom.xLabels"
        :key="'xl' + i"
        :x="xl.x"
        :y="geom.labelY"
        font-size="10"
        font-family="'Geist Mono', monospace"
        fill="var(--pl-fg-3)"
        text-anchor="middle"
      >{{ xl.label }}</text>
    </template>
    <text
      v-else
      x="50%"
      y="50%"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="var(--pl-fg-4)"
      font-size="12"
      font-family="'Geist', system-ui"
    >No data</text>
  </svg>
</template>

<style scoped>
.pl-equity-curve {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
}
</style>
