<script setup lang="ts">
import type {
  CommandEnvelope,
  CommandResultEnvelope,
  CommandType,
  MediaItem,
} from '@signage/contracts'
import type { Bootstrap } from '@/app/bootstrap/bootstrap'
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { commandBus } from '@/app/commands/bus'
import { mqttClientService } from '@/app/mqtt/client'
import { getPlaylist } from '@/app/request/requests/playlist'
import { useGlobalStore } from '@/app/stores/global/store'
import { useMediaStore } from '@/app/stores/media/store'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'

const globalStore = useGlobalStore()
const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const mediaStore = useMediaStore()

const bootstrapResult = inject<Bootstrap>('bootstrapResult')
const deviceId = bootstrapResult?.config.deviceId ?? ''

const mediaRef = ref<HTMLImageElement | HTMLVideoElement | null>(null)
const imageTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const processedCommands = ref<Set<string>>(new Set())
const mqttMessageHandler = ref<((topic: string, message: Buffer) => void) | null>(null)
const currentBlobUrl = ref<string | null>(null)
const retryWithCache = ref<boolean>(false)

const currentItem = computed(() => playerStore.currentItem)
const isImage = computed(() => currentItem.value?.type === 'image')
const isVideo = computed(() => currentItem.value?.type === 'video')

function revokeCurrentBlob(): void {
  if (currentBlobUrl.value) {
    URL.revokeObjectURL(currentBlobUrl.value)
    currentBlobUrl.value = null
  }
}

async function fetchAndLoadPlaylist(): Promise<void> {
  try {
    globalStore.showLoading('Loading playlist...')
    const response = await getPlaylist(deviceId)
    await mediaStore.savePlaylist(response.playlist)
    await playlistStore.loadPlaylist(response.playlist)
    globalStore.hideLoading()
    void prefetchMediaFiles()
    await startPlayback()
  }
  catch (error) {
    const cached = await mediaStore.loadPlaylist()
    if (cached) {
      await playlistStore.loadPlaylist(cached)
      globalStore.hideLoading()
      await startPlayback()
    }
    else {
      globalStore.showError(error instanceof Error ? error.message : 'Failed to load playlist')
    }
  }
}

async function prefetchMediaFiles(): Promise<void> {
  const items = playlistStore.currentPlaylist?.items
  if (!items || items.length === 0) {
    return
  }
  void mediaStore.prefetchMedia(items)
}

async function startPlayback(): Promise<void> {
  const item = playlistStore.currentItem
  if (!item) {
    return
  }
  await playItem(item)
}

async function playItem(item: MediaItem): Promise<void> {
  clearImageTimer()
  revokeCurrentBlob()
  retryWithCache.value = false
  await playerStore.load(item)
  const url = await mediaStore.getCachedUrl(item)
  if (url !== item.url) {
    currentBlobUrl.value = url
  }
  if (item.type === 'image') {
    playerStore.play()
    const duration = item.duration ?? 10
    imageTimer.value = setTimeout(() => {
      void nextItem()
    }, duration * 1000)
  }
  else if (item.type === 'video') {
    playerStore.play()
  }
}

async function nextItem(): Promise<void> {
  clearImageTimer()
  revokeCurrentBlob()
  retryWithCache.value = false
  const next = playlistStore.nextWithLoop()
  if (next) {
    await playItem(next)
  }
}

function clearImageTimer(): void {
  if (imageTimer.value) {
    clearTimeout(imageTimer.value)
    imageTimer.value = null
  }
}

function handleVideoEnded(): void {
  void nextItem()
}

async function handleMediaError(): Promise<void> {
  const item = currentItem.value
  if (!item) {
    void nextItem()
    return
  }
  if (!retryWithCache.value) {
    const cached = await mediaStore.loadMedia(item.id)
    if (cached) {
      retryWithCache.value = true
      revokeCurrentBlob()
      const url = URL.createObjectURL(cached)
      currentBlobUrl.value = url
      return
    }
  }
  void nextItem()
}

function buildSuccessResult(command: CommandEnvelope, payload?: unknown): CommandResultEnvelope {
  return {
    type: 'command_result',
    command: command.command,
    correlationId: command.commandId,
    status: 'success',
    timestamp: Date.now(),
    payload,
  }
}

function buildErrorResult(
  command: CommandEnvelope,
  code: string,
  message: string,
): CommandResultEnvelope {
  return {
    type: 'command_result',
    command: command.command,
    correlationId: command.commandId,
    status: 'error',
    timestamp: Date.now(),
    error: { code, message },
  }
}

async function handleReloadPlaylist(): Promise<void> {
  await fetchAndLoadPlaylist()
}

async function handleRestartPlayer(): Promise<void> {
  clearImageTimer()
  revokeCurrentBlob()
  retryWithCache.value = false
  playerStore.stop()
  playlistStore.resetIndex()
  await startPlayback()
}

async function handlePlay(): Promise<void> {
  playerStore.play()
  if (isVideo.value && mediaRef.value) {
    const video = mediaRef.value as HTMLVideoElement
    void video.play()
  }
}

async function handlePause(): Promise<void> {
  playerStore.pause()
  if (isVideo.value && mediaRef.value) {
    const video = mediaRef.value as HTMLVideoElement
    video.pause()
  }
}

async function handleSetVolume(params?: Record<string, unknown>): Promise<void> {
  const level = params?.level as number
  playerStore.setVolume(level)
}

async function handleScreenshot(command: CommandEnvelope): Promise<CommandResultEnvelope> {
  try {
    const blob = await playerStore.captureScreenshot()
    const base64 = await blobToBase64(blob)
    return buildSuccessResult(command, { base64, mimeType: blob.type || 'image/png' })
  }
  catch {
    return buildErrorResult(command, 'SCREENSHOT_FAILED', 'Failed to capture screenshot')
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function executeCommand(command: CommandEnvelope): Promise<CommandResultEnvelope> {
  if (processedCommands.value.has(command.commandId)) {
    return buildSuccessResult(command, { duplicate: true })
  }
  processedCommands.value.add(command.commandId)
  if (processedCommands.value.size > 1000) {
    const oldest = Array.from(processedCommands.value).slice(0, 500)
    oldest.forEach(id => processedCommands.value.delete(id))
  }

  try {
    switch (command.command) {
      case 'reload_playlist':
        await handleReloadPlaylist()
        return buildSuccessResult(command)
      case 'restart_player':
        await handleRestartPlayer()
        return buildSuccessResult(command)
      case 'play':
        await handlePlay()
        return buildSuccessResult(command)
      case 'pause':
        await handlePause()
        return buildSuccessResult(command)
      case 'set_volume':
        await handleSetVolume(command.params)
        return buildSuccessResult(command)
      case 'screenshot':
        return await handleScreenshot(command)
      case 'ping':
        return buildSuccessResult(command)
      default:
        return buildErrorResult(
          command,
          'UNSUPPORTED_COMMAND',
          `Command ${command.command} not implemented in handler`,
        )
    }
  }
  catch (error) {
    return buildErrorResult(
      command,
      'EXECUTION_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

function registerCommandHandler(): void {
  commandBus.register({
    supports: (type: string): boolean => {
      const supported: CommandType[] = [
        'reload_playlist',
        'restart_player',
        'play',
        'pause',
        'set_volume',
        'screenshot',
        'ping',
      ]
      return supported.includes(type as CommandType)
    },
    handle: async (command: CommandEnvelope): Promise<CommandResultEnvelope> => {
      return executeCommand(command)
    },
  })
}

async function setupMqtt(): Promise<void> {
  if (!deviceId) {
    return
  }
  const commandTopic = `signage/${deviceId}/commands`
  const responseTopic = `signage/${deviceId}/responses`

  await mqttClientService.subscribe(commandTopic)

  const client = mqttClientService.client
  if (client) {
    mqttMessageHandler.value = (topic: string, message: Buffer) => {
      if (topic !== commandTopic) {
        return
      }
      void handleMqttMessage(message, responseTopic)
    }
    client.on('message', mqttMessageHandler.value)
  }
}

async function handleMqttMessage(message: Buffer, responseTopic: string): Promise<void> {
  let envelope: unknown
  try {
    envelope = JSON.parse(message.toString())
  }
  catch {
    await mqttClientService.publish(responseTopic, {
      type: 'command_result',
      command: 'ping',
      correlationId: 'unknown',
      status: 'error',
      timestamp: Date.now(),
      error: { code: 'INVALID_JSON', message: 'Failed to parse command JSON' },
    })
    return
  }

  const result = await commandBus.execute(envelope)
  await mqttClientService.publish(responseTopic, result)
}

watch(
  currentItem,
  (newItem) => {
    if (!newItem) {
      return
    }
    if (isVideo.value && mediaRef.value && 'play' in mediaRef.value) {
      const video = mediaRef.value as HTMLVideoElement
      video.play().catch(() => {
        void nextItem()
      })
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (!bootstrapResult) {
    globalStore.showError('Bootstrap failed')
    return
  }

  registerCommandHandler()

  if (bootstrapResult.state === 'connected') {
    await setupMqtt()
  }

  await fetchAndLoadPlaylist()
})

onUnmounted(() => {
  clearImageTimer()
  revokeCurrentBlob()
  playerStore.stop()
  const client = mqttClientService.client
  if (client && mqttMessageHandler.value) {
    client.off('message', mqttMessageHandler.value)
  }
})
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
    <div v-else id="player" class="screen">
      <div id="media-container">
        <img
          v-if="isImage && currentItem"
          ref="mediaRef"
          :src="currentBlobUrl || currentItem.url"
          class="media-element"
          @error="handleMediaError"
        >
        <video
          v-else-if="isVideo && currentItem"
          ref="mediaRef"
          :src="currentBlobUrl || currentItem.url"
          class="media-element"
          autoplay
          playsinline
          @ended="handleVideoEnded"
          @error="handleMediaError"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
#app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

#loading,
#error {
  flex-direction: column;
  color: #fff;
  font-family: var(--font-sans);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #333;
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

#media-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-element {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
