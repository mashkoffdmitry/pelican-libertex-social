<script setup lang="ts">
interface Position {
  sym: string;
  w: number;
  dir: 'long' | 'short' | 'cash';
  name?: string;
}

interface Props {
  items: Position[];
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 10,
});

const total = props.items.reduce((s, it) => s + it.w, 0);

const bars = props.items.map((item) => {
  const wPct = (item.w / total) * 100;
  const shade = item.dir === 'cash'
    ? 'var(--surface-3)'
    : `color-mix(in oklch, var(--fg) 55%, var(--surface))`;
  return { item, wPct, shade };
});
</script>

<template>
  <div class="allocation-bar" :style="{ height: `${height}px` }">
    <div
      v-for="bar in bars"
      :key="bar.item.sym"
      class="bar-segment"
      :style="{ width: `${bar.wPct}%`, background: bar.shade }"
      :title="`${bar.item.sym} ${bar.item.w}%`"
    />
  </div>
</template>

<style scoped>
.allocation-bar {
  display: flex;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.bar-segment {
  height: 100%;
}
</style>
