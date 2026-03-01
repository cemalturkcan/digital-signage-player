<script setup lang="ts">
import type { MediaItem } from '@signage/contracts'
import { computed, onUnmounted, ref, watch } from 'vue'
import { resolvePlayableMediaSource } from '@/app/cache/media-cache'
import { useDeviceStore } from '@/app/stores/device/store'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'
import TransportControls from '@/components/playback/TransportControls.vue'
import Player from '@/components/Player.vue'

interface PlayerRef {
  play: () => Promise<void>
  pause: () => void
}

const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const deviceStore = useDeviceStore()

const playerRef = ref<PlayerRef | null>(null)
const imageTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const switchingSource = ref(false)
const playbackToken = ref(0)
const activeMediaRelease = ref<(() => void) | null>(null)

const IMAGE_DURATION_SECONDS = 5

const currentItem = computed(() => playerStore.currentItem)
const isImage = computed(() => currentItem.value?.type === 'image')
const isVideo = computed(() => currentItem.value?.type === 'video')

function clearImageTimer(): void {
  if (!imageTimer.value)
    return

  clearTimeout(imageTimer.value)
  imageTimer.value = null
}

function clearActiveMediaSource(): void {
  if (!activeMediaRelease.value)
    return

  activeMediaRelease.value()
  activeMediaRelease.value = null
}

async function playItem(item: MediaItem): Promise<void> {
  const token = ++playbackToken.value
  switchingSource.value = true
  clearImageTimer()
  clearActiveMediaSource()

  const source = await resolvePlayableMediaSource(deviceStore.getDeviceId(), item.url)
  if (token !== playbackToken.value) {
    source.release()
    return
  }

  activeMediaRelease.value = source.release
  const itemToPlay: MediaItem = source.url === item.url ? item : { ...item, url: source.url }

  try {
    await playerStore.load(itemToPlay)
    if (token !== playbackToken.value)
      return

    playerStore.play()

    if (item.type !== 'image')
      return

    imageTimer.value = setTimeout(() => {
      if (token !== playbackToken.value)
        return
      void nextItem()
    }, IMAGE_DURATION_SECONDS * 1000)
  }
  finally {
    if (token === playbackToken.value)
      switchingSource.value = false
  }
}

async function nextItem(): Promise<void> {
  const next = playlistStore.nextWithLoop()
  if (!next)
    return

  await playItem(next)
}

async function prevItem(): Promise<void> {
  const previous = playlistStore.prevWithLoop()
  if (!previous)
    return

  await playItem(previous)
}

function handleVideoEnded(): void {
  if (switchingSource.value)
    return

  void nextItem()
}

function handleMediaError(): void {
  if (switchingSource.value)
    return

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
  playbackToken.value += 1
  clearImageTimer()
  clearActiveMediaSource()
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
        :controls="false"
        :loop="false"
        class="playback-page_media"
        @ended="handleVideoEnded"
        @error="handleMediaError"
      />

      <div class="playback-page_controls">
        <TransportControls @next="nextItem" @previous="prevItem" />
      </div>
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
  position: relative;
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

.playback-page_controls {
  position: absolute;
  left: 50%;
  bottom: var(--space-tv-page);
  transform: translateX(-50%);
}
</style>
