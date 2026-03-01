<script setup lang="ts">
import type { Playlist } from '@signage/contracts'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/app/utils/format'

interface PlaylistCardProps {
  playlist: Playlist
  selected?: boolean
}

const props = withDefaults(defineProps<PlaylistCardProps>(), {
  selected: false,
})

const emit = defineEmits<{
  (e: 'select', playlist: Playlist): void
}>()

const { t } = useI18n()

function handleSelect(): void {
  emit('select', props.playlist)
}
</script>

<template>
  <button
    class="playlist-card"
    :class="{ 'playlist-card--active': selected }"
    @click="handleSelect"
  >
    <div class="playlist-card_head">
      <h3 class="playlist-card_title">
        {{ t('playlistTitle', { id: playlist.id }) }}
      </h3>
      <div class="playlist-card_badges">
        <span class="playlist-card_badge">{{
          t('playlistItems', { count: playlist.items.length })
        }}</span>
        <span v-if="playlist.loop === true" class="playlist-card_badge">{{
          t('playlistLoop')
        }}</span>
      </div>
    </div>

    <p class="playlist-card_meta">
      {{ t('updatedDate', { date: formatDate(playlist.updatedAt) }) }}
    </p>
    <p class="playlist-card_meta">
      {{ t('createdDate', { date: formatDate(playlist.createdAt) }) }}
    </p>
  </button>
</template>

<style scoped>
.playlist-card {
  width: 100%;
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-card);
  background: linear-gradient(160deg, var(--surface-tv-elevated), var(--surface-tv));
  color: var(--text-tv);
  padding: clamp(var(--size-4), 3vw, var(--space-tv-card));
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease;
}

.playlist-card:focus-visible,
.playlist-card:hover {
  border-color: var(--border-tv-strong);
  background: linear-gradient(160deg, var(--surface-tv-accent), var(--surface-tv));
  outline: none;
}

.playlist-card--active {
  border-color: var(--border-tv-strong);
  background: linear-gradient(160deg, var(--surface-tv-accent-strong), var(--surface-tv));
}

.playlist-card_head {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--size-3);
  margin-bottom: var(--size-3);
}

.playlist-card_title {
  flex: 1 1 12rem;
  min-width: 0;
  font-size: clamp(var(--size-5), 5vw, var(--size-6));
  line-height: var(--line-height-tight);
  font-weight: var(--font-weight-bold);
}

.playlist-card_badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--size-2);
}

.playlist-card_badge {
  border: var(--border-width-thin) solid var(--border-tv-strong);
  border-radius: var(--radius-tv-pill);
  padding: var(--size-1) var(--size-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.playlist-card_meta {
  font-size: var(--font-size-sm);
  color: var(--text-tv-muted);
  overflow-wrap: anywhere;
  line-height: 1.6;
}
</style>
