<script setup lang="ts">
import type { Playlist } from '@signage/contracts'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/app/stores/library/store'
import PlaylistCard from '@/components/playlist/PlaylistCard.vue'

const router = useRouter()
const libraryStore = useLibraryStore()
const { playlists, selectedPlaylistId } = storeToRefs(libraryStore)
const { t } = useI18n()

async function handleSelect(playlist: Playlist): Promise<void> {
  await router.push(`/playlist/${playlist.id}`)
}
</script>

<template>
  <section class="playlist-page">
    <div class="playlist-page_header">
      <p class="playlist-page_kicker">
        {{ t('playlistSelectionKicker') }}
      </p>
      <h1 class="playlist-page_title">
        {{ t('playlistSelectionTitle') }}
      </h1>
      <p class="playlist-page_subtitle">
        {{ t('playlistSelectionSubtitle') }}
      </p>
    </div>

    <div v-if="playlists.length === 0" class="playlist-page_empty">
      <p>{{ t('playlistSelectionEmpty') }}</p>
    </div>

    <div v-else class="playlist-grid">
      <PlaylistCard
        v-for="playlist in playlists"
        :key="playlist.id"
        :playlist="playlist"
        :selected="playlist.id === selectedPlaylistId"
        @select="(playlist) => void handleSelect(playlist)"
      />
    </div>
  </section>
</template>

<style scoped>
.playlist-page {
  width: 100%;
  min-height: 100%;
  padding: clamp(var(--size-4), 4vw, var(--space-tv-page));
  color: var(--text-tv);
  background: var(--surface-tv);
  overflow-y: auto;
  overflow-x: hidden;
}

.playlist-page_header {
  margin-bottom: var(--space-tv-stack);
}

.playlist-page_kicker {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tv-subtle);
  margin-bottom: var(--size-2);
}

.playlist-page_title {
  font-size: clamp(var(--size-10), 8vw, var(--size-12));
  line-height: var(--line-height-tight);
  font-weight: var(--font-weight-bold);
}

.playlist-page_subtitle {
  margin-top: var(--size-2);
  font-size: clamp(var(--font-size-sm), 3.8vw, var(--font-size-md));
  color: var(--text-tv-muted);
}

.playlist-page_empty {
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-card);
  padding: clamp(var(--size-4), 3vw, var(--space-tv-card));
  font-size: clamp(var(--font-size-lg), 4vw, var(--font-size-xl));
  color: var(--text-tv-muted);
}

.playlist-grid {
  display: grid;
  width: 100%;
  gap: clamp(var(--size-3), 2vw, var(--space-tv-gap));
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 36rem), 1fr));
}

@media (max-width: 640px) {
  .playlist-grid {
    grid-template-columns: 1fr;
  }
}
</style>
