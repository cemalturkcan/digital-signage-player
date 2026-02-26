<script setup lang="ts">
import { onMounted } from 'vue'
import { useGlobalStore } from '@/app/stores/global/store'
import { bootstrap } from '@/app/bootstrap/bootstrap'

const globalStore = useGlobalStore()

onMounted(async () => {
  globalStore.showLoading('Initializing...')
  try {
    await bootstrap()
    globalStore.hideLoading()
  }
  catch (error) {
    globalStore.showError(error instanceof Error ? error.message : 'Unknown error')
  }
})
</script>

<template>
  <div id="app-container">
    <div v-if="globalStore.loading" id="loading" class="screen">
      <div class="spinner" />
      <p>{{ globalStore.loadingMessage || 'Loading...' }}</p>
    </div>
    <div v-else-if="globalStore.error" id="error" class="screen">
      <p>{{ globalStore.error }}</p>
    </div>
    <div v-else id="player" class="screen">
      <div id="media-container" />
    </div>
  </div>
</template>
