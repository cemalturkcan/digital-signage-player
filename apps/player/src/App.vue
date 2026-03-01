<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterView } from 'vue-router'
import { useGlobalStore } from '@/app/stores/global/store'

const globalStore = useGlobalStore()
const { t } = useI18n()
</script>

<template>
  <div id="app-container">
    <div v-if="globalStore.loading" id="loading" class="screen">
      <div class="spinner" />
      <p>{{ globalStore.loadingMessage || t('loading') }}</p>
    </div>

    <div v-else-if="globalStore.error" id="error" class="screen">
      <p>{{ globalStore.error }}</p>
    </div>

    <RouterView v-else />
  </div>
</template>

<style scoped>
#app-container {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  overflow: hidden;
  background: var(--surface-tv);
}

.screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text-tv);
}

#loading,
#error {
  font-family: var(--font-sans);
}

.spinner {
  width: var(--size-12);
  height: var(--size-12);
  border: var(--size-1) solid var(--border-tv);
  border-top-color: var(--text-tv);
  border-radius: 50%;
  animation: spin var(--motion-slow) linear infinite;
  margin-bottom: var(--size-4);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
