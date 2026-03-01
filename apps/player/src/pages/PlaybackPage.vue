<script setup lang="ts">
import type { MediaItem } from '@signage/contracts'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolvePlayableMediaSource } from '@/app/cache/media-cache'
import { activatePlaylist, fetchPlaylists } from '@/app/runtime/runtime'
import { useDeviceStore } from '@/app/stores/device/store'
import { useLibraryStore } from '@/app/stores/library/store'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'
import ExitPlaybackButton from '@/components/playback/ExitPlaybackButton.vue'
import TransportControls from '@/components/playback/TransportControls.vue'
import Player from '@/components/Player.vue'

interface PlayerRef {
  play: () => Promise<void>
  pause: () => void
}

const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const libraryStore = useLibraryStore()
const deviceStore = useDeviceStore()
const route = useRoute()
const router = useRouter()

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

function getImageDurationSeconds(item: MediaItem): number {
  if (typeof item.duration === 'number' && Number.isFinite(item.duration) && item.duration > 0) {
    return item.duration
  }

  return IMAGE_DURATION_SECONDS
}

function finishPlaybackAndReturnToSelection(): void {
  clearImageTimer()
  clearActiveMediaSource()
  playerStore.stop()
  playlistStore.clearPlaylist()
  libraryStore.clearSelection()
  void router.push('/')
}

function handleExitPlayback(): void {
  finishPlaybackAndReturnToSelection()
}

function getRoutePlaylistId(): string {
  const value = route.params.id

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return typeof value === 'string' ? value : ''
}

async function ensurePlaylistFromRoute(): Promise<void> {
  const playlistId = getRoutePlaylistId()
  if (!playlistId) {
    await router.replace('/')
    return
  }

  if (playlistStore.currentPlaylist?.id === playlistId) {
    return
  }

  let targetPlaylist = libraryStore.playlists.find(playlist => playlist.id === playlistId)
  if (!targetPlaylist) {
    const playlists = await fetchPlaylists()
    targetPlaylist = playlists.find(playlist => playlist.id === playlistId)
  }

  if (!targetPlaylist) {
    await router.replace('/')
    return
  }

  await activatePlaylist(targetPlaylist)
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

    imageTimer.value = setTimeout(
      () => {
        if (token !== playbackToken.value)
          return
        void nextItem()
      },
      getImageDurationSeconds(item) * 1000,
    )
  }
  finally {
    if (token === playbackToken.value)
      switchingSource.value = false
  }
}

async function nextItem(): Promise<void> {
  const next = playlistStore.nextForPlayback()
  if (!next) {
    finishPlaybackAndReturnToSelection()
    return
  }

  await playItem(next)
}

async function prevItem(): Promise<void> {
  const previous = playlistStore.prevForPlayback()
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
  () => route.params.id,
  () => {
    void ensurePlaylistFromRoute()
  },
  { immediate: true },
)

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

      <div class="playback-page_exit">
        <ExitPlaybackButton @exit="handleExitPlayback" />
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

.playback-page_exit {
  position: absolute;
  left: var(--space-tv-page);
  top: var(--space-tv-page);
}
</style>
