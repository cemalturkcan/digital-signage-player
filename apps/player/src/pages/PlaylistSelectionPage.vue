<script setup lang="ts">
import type { Playlist } from '@signage/contracts'
import { storeToRefs } from 'pinia'
import { useLibraryStore } from '@/app/stores/library/store'
import PlaylistCard from '@/components/playlist/PlaylistCard.vue'

const emit = defineEmits<{
  (e: 'select', playlist: Playlist): void
}>()
const libraryStore = useLibraryStore()
const { playlists, selectedPlaylistId } = storeToRefs(libraryStore)

function handleSelect(playlist: Playlist): void {
  emit('select', playlist)
}
</script>

<template>
  <section class="playlist-page">
    <div class="playlist-page_header">
      <p class="playlist-page_kicker">
        Digital Signage
      </p>
      <h1 class="playlist-page_title">
        Playlist Selection
      </h1>
      <p class="playlist-page_subtitle">
        Pick one list to start playback on this screen.
      </p>
    </div>

    <div v-if="playlists.length === 0" class="playlist-page_empty">
      <p>No playlists available for this device.</p>
    </div>

    <div v-else class="playlist-grid">
      <PlaylistCard
        v-for="playlist in playlists"
        :key="playlist.id"
        :playlist="playlist"
        :selected="playlist.id === selectedPlaylistId"
        @select="handleSelect"
      />
    </div>
  </section>
</template>

<style scoped>
.playlist-page {
  width: 100%;
  height: 100%;
  padding: var(--space-tv-page);
  color: var(--text-tv);
  background: var(--surface-tv);
  overflow: auto;
}

.playlist-page_header {
  margin-bottom: var(--space-tv-stack);
}

.playlist-page_kicker {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  color: var(--text-tv-subtle);
  margin-bottom: var(--size-2);
}

.playlist-page_title {
  font-size: var(--size-12);
  line-height: var(--line-height-tight);
  font-weight: var(--font-weight-bold);
}

.playlist-page_subtitle {
  margin-top: var(--size-2);
  font-size: var(--font-size-lg);
  color: var(--text-tv-muted);
}

.playlist-page_empty {
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-card);
  padding: var(--space-tv-card);
  font-size: var(--font-size-xl);
  color: var(--text-tv-muted);
}

.playlist-grid {
  display: grid;
  gap: var(--space-tv-gap);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
</style>
