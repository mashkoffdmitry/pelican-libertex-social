<script setup lang="ts">
import { ref } from 'vue';
import { PelicanLibertexSocial } from '../src';

// Empty string => requests go to the dev origin and Vite's server.proxy['/api']
// forwards them to the live proxy. An absolute URL would trigger CORS instead.
const apiBase = ref('');
</script>

<template>
  <PelicanLibertexSocial :api-base="apiBase" />
</template>
