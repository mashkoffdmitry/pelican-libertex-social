<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  traderId: number;
  traderName: string;
}>();

const emit = defineEmits<{
  (e: 'subscribe', p: { traderId: number; amount: number; ratio: number; stopLoss: number }): void;
  (e: 'close'): void;
}>();

const amount = ref(750);
const ratio = ref(1.0);
const stopLoss = ref(20);

const PRESETS = [200, 500, 1000, 2500];
const STOP_OPTIONS = [10, 15, 20, 30, 50];

const stopAmount = computed(() => Math.round((amount.value * stopLoss.value) / 100).toLocaleString());
const ratioDisplay = computed(() => ratio.value.toFixed(2));

function confirm() {
  emit('subscribe', {
    traderId: props.traderId,
    amount: amount.value,
    ratio: ratio.value,
    stopLoss: stopLoss.value,
  });
  emit('close');
}
</script>

<template>
  <div class="pl-sheet-backdrop" @click.self="$emit('close')">
    <div class="pl-sheet pl-card">
      <div class="pl-sheet-grabber" />

      <div class="pl-sheet-title-row">
        <h3 class="pl-sheet-title pl-serif">Subscribe</h3>
        <button class="pl-btn ghost" style="width:32px;height:32px;padding:0" @click="$emit('close')">✕</button>
      </div>

      <!-- Allocation -->
      <div class="pl-sheet-section">
        <div class="pl-eyebrow">Allocation</div>
        <div class="pl-preset-row">
          <button
            v-for="p in PRESETS"
            :key="p"
            class="pl-btn sm"
            :class="{ primary: amount === p }"
            @click="amount = p"
          >€{{ p.toLocaleString() }}</button>
        </div>
        <div class="pl-amount-wrap">
          <span class="pl-amount-prefix pl-mono">€</span>
          <input
            v-model.number="amount"
            type="number"
            min="200"
            step="50"
            class="pl-amount-input pl-mono"
          />
        </div>
      </div>

      <!-- Copy ratio -->
      <div class="pl-sheet-section">
        <div class="pl-sheet-section-row">
          <span class="pl-eyebrow">Copy ratio</span>
          <span class="pl-mono" style="font-size:15px;color:var(--pl-fg)">×{{ ratioDisplay }}</span>
        </div>
        <input v-model.number="ratio" type="range" min="0.10" max="3.00" step="0.05" class="pl-slider" />
        <div class="pl-slider-labels">
          <span>×0.10</span>
          <span>×1.00</span>
          <span>×3.00</span>
        </div>
      </div>

      <!-- Stop-loss -->
      <div class="pl-sheet-section">
        <div class="pl-eyebrow">Stop-loss</div>
        <div class="pl-stop-seg pl-seg">
          <button
            v-for="opt in STOP_OPTIONS"
            :key="opt"
            class="pl-seg-btn"
            :class="{ active: stopLoss === opt }"
            @click="stopLoss = opt"
          >−{{ opt }}%</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="pl-summary-card">
        <div class="pl-summary-row">
          <span style="color:var(--pl-fg-2)">Allocated</span>
          <span class="pl-mono">€{{ amount.toLocaleString() }}</span>
        </div>
        <div class="pl-summary-row">
          <span style="color:var(--pl-fg-2)">Performance fee</span>
          <span class="pl-mono">15% of profit</span>
        </div>
        <div class="pl-summary-row">
          <span style="color:var(--pl-fg-2)">Stop triggers at</span>
          <span class="pl-mono" style="color:var(--pl-down)">−€{{ stopAmount }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="pl-sheet-footer">
        <button class="pl-btn ghost" @click="$emit('close')">Cancel</button>
        <button class="pl-btn primary" style="flex:1" @click="confirm">
          Confirm — €{{ amount.toLocaleString() }}
        </button>
      </div>
    </div>
  </div>
</template>
