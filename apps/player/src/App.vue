<script setup lang="ts">
import type { Playlist } from '@signage/contracts'
import { computed } from 'vue'
import { activatePlaylist } from '@/app/runtime/runtime'
import { useGlobalStore } from '@/app/stores/global/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'
import PlaybackPage from '@/pages/PlaybackPage.vue'
import PlaylistSelectionPage from '@/pages/PlaylistSelectionPage.vue'

const globalStore = useGlobalStore()
const playlistStore = usePlaylistStore()

const hasActivePlaylist = computed(() => playlistStore.currentPlaylist !== null)

async function handlePlaylistSelect(playlist: Playlist): Promise<void> {
  await activatePlaylist(playlist)
}
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

    <PlaylistSelectionPage v-else-if="!hasActivePlaylist" @select="handlePlaylistSelect" />

    <PlaybackPage v-else />
  </div>
</template>

<style scoped>
#app-container {
  width: 100vw;
  height: 100vh;
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
