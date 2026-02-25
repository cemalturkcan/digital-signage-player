<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { bootstrap } from './core/bootstrap.js'

type AppState = 'loading' | 'error' | 'ready'

const state = ref<AppState>('loading')
const errorMessage = ref('')

onMounted(async () => {
  try {
    const app = await bootstrap()
    state.value = 'ready'
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
  }
})
</script>

<template>
  <div id="app-container">
    <div v-if="state === 'loading'" id="loading" class="screen">
      <div class="spinner" />
      <p>Initializing...</p>
    </div>
    <div v-else-if="state === 'error'" id="error" class="screen">
      <p>{{ errorMessage }}</p>
    </div>
    <div v-else id="player" class="screen">
      <div id="media-container" />
    </div>
  </div>
</template>
