<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

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
  controls: false,
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
  catch {}
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
    <video
      ref="videoRef"
      class="player_video"
      :src="source"
      :autoplay="autoplay"
      :muted="muted"
      :loop="loop"
      :controls="controls"
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
  </div>
</template>

<style scoped>
.player {
  width: 100%;
  height: 100%;
  background: var(--surface-tv);
}

.player_video {
  width: 100%;
  height: 100%;
  background: var(--surface-tv);
}
</style>
