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
  gap: 6px;
  justify-content: center;
  align-items: center;
  margin: 18px 0 60px;
  font-size: 13px;
}
.pelican-pager button,
.pelican-pager .page {
  min-width: 36px;
  height: 34px;
  padding: 0 10px;
  background: var(--input-bg);
  color: var(--text);
  border: 1.5px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color .2s, color .2s,
    transform .25s cubic-bezier(.2, .8, .2, 1);
}
.pelican-pager button:hover:not(:disabled),
.pelican-pager .page:hover:not(.cur) {
  border-color: var(--orange);
  color: var(--orange);
  transform: translateY(-1px);
}
.pelican-pager button:active:not(:disabled),
.pelican-pager .page:active:not(.cur) {
  transform: translateY(0);
}
.pelican-pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pelican-pager .page.cur {
  background: var(--orange);
  color: #fff;
  border-color: var(--orange);
  cursor: default;
}
.pelican-pager .gap {
  color: var(--muted);
  padding: 0 4px;
}
.pelican-pager .info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  margin-left: 10px;
}
.pelican-pager .info input {
  width: 64px;
  padding: 6px;
  border: 1.5px solid var(--line);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text);
  font: inherit;
  font-size: 13px;
}
.pelican-pager .info input:focus {
  outline: none;
  border-color: var(--orange);
}

@media (max-width: 720px) {
  .pelican-pager {
    gap: 4px;
    margin: 14px 0 40px;
  }
  .pelican-pager button,
  .pelican-pager .page {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    font-size: 12px;
  }
  .pelican-pager .info { display: none; }
}
</style>
