<script setup lang="ts">
defineProps<{
  theme: 'dark' | 'light';
  compact?: boolean;
  iconOnly?: boolean;
}>();

const emit = defineEmits<{ (e: 'change', t: 'dark' | 'light'): void }>();
</script>

<template>
  <div class="theme-seg" :class="{ compact }" role="group" aria-label="Theme">
    <button
      class="seg-btn"
      :class="{ active: theme === 'dark' }"
      aria-label="Dark theme"
      :aria-pressed="theme === 'dark'"
      type="button"
      @click="emit('change', 'dark')"
    >
      <svg class="seg-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M13.2 9.6A5.5 5.5 0 1 1 6.4 2.8a4.4 4.4 0 0 0 6.8 6.8z" fill="currentColor"/>
      </svg>
      <span v-if="!iconOnly" class="seg-label">Dark</span>
    </button>
    <button
      class="seg-btn"
      :class="{ active: theme === 'light' }"
      aria-label="Light theme"
      :aria-pressed="theme === 'light'"
      type="button"
      @click="emit('change', 'light')"
    >
      <svg class="seg-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
          <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.27 1.27M4.67 11.33l-1.27 1.27M12.6 12.6l-1.27-1.27M4.67 4.67L3.4 3.4"/>
        </g>
      </svg>
      <span v-if="!iconOnly" class="seg-label">Light</span>
    </button>
  </div>
</template>

<style scoped>
.theme-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  height: 30px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.theme-seg.compact {
  height: 24px;
  padding: 2px;
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-2);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  line-height: 1;
  transition: background-color 220ms ease, color 220ms ease, box-shadow 220ms ease;
}
.compact .seg-btn {
  padding: 3px 7px;
}
.seg-btn.active {
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--fg);
}
.seg-icon {
  flex-shrink: 0;
}
.seg-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
