<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import DefaultLayout from '@/components/player/DefaultLayout.vue'
import 'media-chrome'

interface PlayerProps {
  src: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  poster?: string
  objectFit?: 'contain' | 'cover' | 'fill'
}

const props = withDefaults(defineProps<PlayerProps>(), {
  autoplay: true,
  muted: true,
  loop: true,
  controls: true,
  poster: undefined,
  objectFit: 'contain',
})

const emit = defineEmits<{
  (e: 'loaded', payload: { duration: number }): void
  (e: 'ended'): void
  (e: 'error', payload: Event): void
  (e: 'play'): void
  (e: 'pause'): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const source = ref(props.src)

async function play(): Promise<void> {
  if (!videoRef.value)
    return

  try {
    await videoRef.value.play()
  }
  catch {
    // Ignore autoplay and play interruptions from browser/runtime
  }
}

function pause(): void {
  videoRef.value?.pause()
}

async function applySource(url: string): Promise<void> {
  source.value = url
  await nextTick()

  if (!videoRef.value)
    return

  videoRef.value.load()
  if (props.autoplay)
    await play()
}

async function setSource(url: string): Promise<void> {
  await applySource(url)
}

function getElement(): HTMLVideoElement | null {
  return videoRef.value
}

function handleLoadedMetadata(): void {
  const duration = Number.isFinite(videoRef.value?.duration) ? (videoRef.value?.duration ?? 0) : 0
  emit('loaded', { duration })
}

function handleEnded(): void {
  emit('ended')
}

function handleError(event: Event): void {
  emit('error', event)
}

function handlePlay(): void {
  emit('play')
}

function handlePause(): void {
  emit('pause')
}

watch(
  () => props.src,
  (nextSrc) => {
    void applySource(nextSrc)
  },
  { immediate: true },
)

defineExpose({
  play,
  pause,
  setSource,
  getElement,
})
</script>

<template>
  <div class="player">
    <media-controller class="player_controller" autohide="2">
      <video
        slot="media"
        ref="videoRef"
        class="player_video"
        :src="source"
        :autoplay="autoplay"
        :muted="muted"
        :loop="loop"
        :poster="poster"
        :style="{ objectFit }"
        playsinline
        preload="auto"
        @ended="handleEnded"
        @error="handleError"
        @loadedmetadata="handleLoadedMetadata"
        @pause="handlePause"
        @play="handlePlay"
      />

      <media-loading-indicator slot="centered-chrome" noautohide />

      <DefaultLayout v-if="controls" />
    </media-controller>
  </div>
</template>

<style scoped>
.player {
  width: 100%;
  height: 100%;
  background: var(--surface-tv);
}

.player_controller {
  width: 100%;
  height: 100%;
  --media-control-background: transparent;
  --media-control-hover-background: transparent;
  --media-control-border-radius: var(--radius-md);
  --media-preview-thumbnail-border: var(--border-width-thin) solid var(--text-tv);
  --media-preview-thumbnail-border-radius: var(--radius-sm);
  --media-tooltip-display: none;
  --media-range-track-border-radius: var(--radius-tv-pill);
  --media-range-track-height: var(--size-1);
  --media-range-thumb-height: var(--size-4);
  --media-range-thumb-width: var(--size-4);
  --media-range-track-background: var(--border-tv);
  --media-time-range-buffered-color: var(--text-tv-subtle);
  --media-range-bar-color: var(--text-tv);
  --media-control-color: var(--text-tv);
}

:deep(media-time-range) {
  width: 100%;
}

:deep(media-play-button#center) {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 100;
  transform: translate(-50%, -50%);
}

.player_video {
  width: 100%;
  height: 100%;
  background: var(--surface-tv);
}
</style>
