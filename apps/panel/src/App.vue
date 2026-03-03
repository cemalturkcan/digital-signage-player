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
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--background);
}

.screen {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text);
}

#loading,
#error {
  font-family: var(--font-sans);
}

.spinner {
  width: var(--size-12);
  height: var(--size-12);
  border: var(--size-1) solid #262626;
  border-top-color: var(--accent);
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
