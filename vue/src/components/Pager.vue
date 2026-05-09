<script setup lang="ts">
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
  page: number;
  totalPages: number;
  range: (number | '…')[];
}>();

const emit = defineEmits<{
  (e: 'go', page: number | 'prev' | 'next'): void;
}>();

const { t } = useI18n();

function go(target: number | 'prev' | 'next') {
  emit('go', target);
}
function onGoto(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) emit('go', v);
}
</script>

<template>
  <nav v-if="props.totalPages > 1" class="pelican-pager">
    <button :disabled="page <= 1" @click="go('prev')">{{ t('pager.prev') }}</button>
    <template v-for="(p, i) in range" :key="i">
      <span v-if="p === '…'" class="gap">…</span>
      <button v-else class="page" :class="{ cur: p === page }" @click="go(p)">{{ p }}</button>
    </template>
    <button :disabled="page >= totalPages" @click="go('next')">{{ t('pager.next') }}</button>
    <span class="info">
      {{ t('pager.goto') }}
      <input type="number" :min="1" :max="totalPages" :value="page" @change="onGoto" />
    </span>
  </nav>
</template>

<style scoped>
.pelican-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 16px 0;
  font-size: 13px;
}
.pelican-pager button {
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font: inherit;
}
.pelican-pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pelican-pager button.page.cur {
  background: var(--orange);
  color: #fff;
  border-color: var(--orange);
}
.pelican-pager .gap {
  padding: 0 4px;
  color: var(--muted);
}
.pelican-pager .info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  margin-left: 8px;
}
.pelican-pager .info input {
  width: 64px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text);
  font: inherit;
}
</style>
