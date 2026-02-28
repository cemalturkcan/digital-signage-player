<script setup lang="ts">
import type { Playlist } from '@signage/contracts'

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

function formatDate(timestamp: number): string {
  if (!timestamp)
    return 'Unknown'

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

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
        Playlist {{ playlist.id }}
      </h3>
      <span class="playlist-card_badge">{{ playlist.items.length }} items</span>
    </div>

    <p class="playlist-card_meta">
      Updated: {{ formatDate(playlist.updatedAt) }}
    </p>
    <p class="playlist-card_meta">
      Created: {{ formatDate(playlist.createdAt) }}
    </p>
  </button>
</template>

<style scoped>
.playlist-card {
  width: 100%;
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-card);
  background: linear-gradient(180deg, var(--surface-tv-elevated), var(--surface-tv));
  color: var(--text-tv);
  padding: var(--space-tv-card);
  text-align: left;
  transition:
    transform var(--motion-fast) ease,
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease;
}

.playlist-card:focus-visible,
.playlist-card:hover {
  border-color: var(--border-tv-strong);
  background: linear-gradient(180deg, var(--surface-tv-accent), var(--surface-tv));
  transform: translateY(calc(var(--size-2) * -1));
}

.playlist-card--active {
  border-color: var(--border-tv-strong);
  background: linear-gradient(180deg, var(--surface-tv-accent-strong), var(--surface-tv));
}

.playlist-card_head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--size-3);
  margin-bottom: var(--size-2);
}

.playlist-card_title {
  font-size: var(--size-6);
  line-height: var(--line-height-tight);
  font-weight: var(--font-weight-bold);
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
}
</style>
