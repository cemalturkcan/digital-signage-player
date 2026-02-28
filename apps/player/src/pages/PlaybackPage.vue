<script setup lang="ts">
import type { MediaItem } from '@signage/contracts'
import { computed, onUnmounted, ref, watch } from 'vue'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'
import Player from '@/components/Player.vue'

interface PlayerRef {
  play: () => Promise<void>
  pause: () => void
}

const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()

const playerRef = ref<PlayerRef | null>(null)
const imageTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const currentItem = computed(() => playerStore.currentItem)
const isImage = computed(() => currentItem.value?.type === 'image')
const isVideo = computed(() => currentItem.value?.type === 'video')

function clearImageTimer(): void {
  if (!imageTimer.value)
    return

  clearTimeout(imageTimer.value)
  imageTimer.value = null
}

async function playItem(item: MediaItem): Promise<void> {
  clearImageTimer()

  await playerStore.load(item)
  playerStore.play()

  if (item.type !== 'image')
    return

  const duration = Math.max(1, item.duration ?? 5)
  imageTimer.value = setTimeout(() => {
    void nextItem()
  }, duration * 1000)
}

async function nextItem(): Promise<void> {
  const next = playlistStore.nextWithLoop()
  if (!next)
    return

  await playItem(next)
}

function handleVideoEnded(): void {
  void nextItem()
}

function handleMediaError(): void {
  void nextItem()
}

watch(
  () => playlistStore.currentItem,
  (item) => {
    if (!item)
      return

    if (item.id === playerStore.currentItem?.id)
      return

    void playItem(item)
  },
  { immediate: true },
)

watch(
  () => playerStore.state,
  (state) => {
    if (!isVideo.value)
      return

    if (state === 'playing') {
      void playerRef.value?.play()
      return
    }

    if (state === 'paused')
      playerRef.value?.pause()
  },
)

onUnmounted(() => {
  clearImageTimer()
})
</script>

<template>
  <div class="playback-page">
    <div class="playback-page_media-wrap">
      <img
        v-if="isImage && currentItem"
        :src="currentItem.url"
        class="playback-page_media"
        @error="handleMediaError"
      >

      <Player
        v-else-if="isVideo && currentItem"
        ref="playerRef"
        :src="currentItem.url"
        class="playback-page_media"
        @ended="handleVideoEnded"
        @error="handleMediaError"
      />
    </div>
  </div>
</template>

<style scoped>
.playback-page {
  width: 100%;
  height: 100%;
  background: var(--surface-tv);
}

.playback-page_media-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.playback-page_media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
