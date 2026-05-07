<script setup lang="ts">
import { ref } from 'vue';
import { PelicanLibertexSocial } from '../src';

const apiBase = ref('http://localhost:8787');
const lastError = ref<string | null>(null);
const lastSelected = ref<number | null>(null);
</script>

<template>
  <div style="height:100vh;display:flex;flex-direction:column">
    <div style="padding:8px;border-bottom:1px solid #ccc;font:12px system-ui;display:flex;gap:12px;align-items:center">
      <label>API base: <input v-model="apiBase" style="width:280px" /></label>
      <span v-if="lastSelected != null">selected: #{{ lastSelected }}</span>
      <span v-if="lastError" style="color:#c33">err: {{ lastError }}</span>
    </div>
    <PelicanLibertexSocial
      :api-base="apiBase"
      style="flex:1;min-height:0"
      @select-strategy="(s) => (lastSelected = s.Id)"
      @error="(e) => (lastError = e.code + ': ' + e.message)"
    />
  </div>
</template>
