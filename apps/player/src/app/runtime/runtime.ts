import type {
  CommandEnvelope,
  Playlist,
} from '@signage/contracts'
import type { Bootstrap } from '@/app/bootstrap/bootstrap'
import { computeHash } from '@/app/cache/hash'
import { syncMediaCache } from '@/app/cache/media-cache'
import { readPlaylistCache, writePlaylistCache } from '@/app/cache/playlist-cache'
import { commandBus } from '@/app/commands/bus'
import { COMMAND_ERROR_CODES } from '@/app/commands/constants'
import { CommandHandlerError, playerCommandRegistry } from '@/app/commands/registry'
import { translate } from '@/app/modules/i18n'
import { mqttClientService } from '@/app/mqtt/client'
import { createPlatformAdapter } from '@/app/platform/factory'
import { getPlaylistsByDeviceId } from '@/app/request/playlist'
import { useGlobalStore } from '@/app/stores/global/store'
import { useLibraryStore } from '@/app/stores/library/store'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'

let currentDeviceId = ''
let mqttMessageHandler: ((topic: string, message: Uint8Array) => void) | null = null

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function getFirstItem(playlist: Playlist) {
  return playlist.items[0] ?? null
}

export async function activatePlaylist(playlist: Playlist): Promise<void> {
  const libraryStore = useLibraryStore()
  const playlistStore = usePlaylistStore()
  const playerStore = usePlayerStore()

  libraryStore.selectPlaylist(playlist.id)
  await playlistStore.loadPlaylist(playlist)

  const firstItem = getFirstItem(playlist)
  if (!firstItem) {
    playerStore.stop()
    return
  }

  await playerStore.load(firstItem)
  playerStore.play()
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  return fetchPlaylistsWithPolicy()
}

async function fetchPlaylistsWithPolicy(options?: { networkFirst?: boolean }): Promise<Playlist[]> {
  const globalStore = useGlobalStore()
  const libraryStore = useLibraryStore()

  if (!currentDeviceId) {
    libraryStore.setPlaylists([])
    return []
  }

  const networkFirst = options?.networkFirst === true
  const cached = readPlaylistCache(currentDeviceId)

  if (!networkFirst && cached) {
    libraryStore.setPlaylists(cached.response.content)
    globalStore.hideLoading()
    globalStore.clearError()

    void refreshPlaylistsFromNetwork(cached.hash)

    return cached.response.content
  }

  globalStore.showLoading(translate('loadingPlaylists'))
  const fromNetwork = await refreshPlaylistsFromNetwork(cached?.hash)
  if (fromNetwork) {
    return fromNetwork
  }

  if (cached) {
    libraryStore.setPlaylists(cached.response.content)
    globalStore.hideLoading()
    globalStore.clearError()
    return cached.response.content
  }

  globalStore.hideLoading()
  globalStore.showError(translate('failedToLoadPlaylists'))
  libraryStore.setPlaylists([])
  return []
}

async function refreshPlaylistsFromNetwork(previousHash?: string): Promise<Playlist[] | null> {
  const globalStore = useGlobalStore()
  const libraryStore = useLibraryStore()

  try {
    const response = await getPlaylistsByDeviceId(currentDeviceId)
    const playlists = response.content
    const nextHash = writePlaylistCache(currentDeviceId, response)
    const effectiveHash = nextHash ?? computeHash(response)

    void syncMediaCache(currentDeviceId, playlists, effectiveHash)

    if (!previousHash || previousHash !== effectiveHash) {
      libraryStore.setPlaylists(playlists)
    }

    globalStore.hideLoading()
    globalStore.clearError()

    return playlists
  }
  catch {
    return null
  }
}

async function handleReloadPlaylist(): Promise<void> {
  const libraryStore = useLibraryStore()
  const playlists = await fetchPlaylistsWithPolicy({ networkFirst: true })

  if (!libraryStore.selectedPlaylistId)
    return

  const selected = playlists.find(playlist => playlist.id === libraryStore.selectedPlaylistId)
  if (!selected)
    return

  await activatePlaylist(selected)
}

async function handleRestartPlayer(): Promise<void> {
  const libraryStore = useLibraryStore()
  const playlistStore = usePlaylistStore()
  const playerStore = usePlayerStore()

  playerStore.stop()
  playlistStore.clearPlaylist()

  const playlists = await fetchPlaylistsWithPolicy({ networkFirst: true })
  if (playlists.length === 0) {
    playerStore.stop()
    return
  }

  const selectedId = libraryStore.selectedPlaylistId
  if (selectedId) {
    const selectedPlaylist = playlists.find(playlist => playlist.id === selectedId)
    if (selectedPlaylist) {
      await activatePlaylist(selectedPlaylist)
      return
    }
  }

  await activatePlaylist(playlists[0])
}

function registerCommandHandlers(): void {
  const playerStore = usePlayerStore()

  playerCommandRegistry.register(
    {
      command: 'reload_playlist',
      handle: async () => handleReloadPlaylist(),
    },
    {
      command: 'restart_player',
      handle: async () => handleRestartPlayer(),
    },
    {
      command: 'play',
      handle: async () => playerStore.play(),
    },
    {
      command: 'pause',
      handle: async () => playerStore.pause(),
    },
    {
      command: 'set_volume',
      handle: async (envelope: CommandEnvelope) => {
        playerStore.setVolume(envelope.params?.level as number)
      },
    },
    {
      command: 'screenshot',
      handle: async () => {
        try {
          const blob = await playerStore.captureScreenshot()
          const base64 = await blobToBase64(blob)
          return { base64, mimeType: blob.type || 'image/png' }
        }
        catch {
          throw new CommandHandlerError(
            COMMAND_ERROR_CODES.SCREENSHOT_FAILED,
            translate('failedToCaptureScreenshot'),
          )
        }
      },
    },
  )

  commandBus.register({
    supports: () => true,
    handle: (envelope: CommandEnvelope) => playerCommandRegistry.execute(envelope),
  })
}

async function handleMqttMessage(message: Uint8Array, responseTopic: string): Promise<void> {
  let envelope: unknown

  try {
    envelope = JSON.parse(new TextDecoder().decode(message))
  }
  catch {
    await mqttClientService.publish(responseTopic, {
      type: 'command_result',
      command: 'reload_playlist',
      correlationId: 'unknown',
      status: 'error',
      timestamp: Date.now(),
      error: {
        code: COMMAND_ERROR_CODES.INVALID_JSON,
        message: translate('invalidCommandJson'),
      },
    })
    return
  }

  const resolvedResponseTopic = getReplyTopic(envelope, responseTopic)
  const result = await commandBus.execute(envelope)
  await mqttClientService.publish(resolvedResponseTopic, result)
}

const VALID_REPLY_TOPIC = /^[\w/-]+$/

function getReplyTopic(envelope: unknown, fallbackTopic: string): string {
  if (typeof envelope !== 'object' || envelope === null)
    return fallbackTopic

  const value = envelope as Record<string, unknown>
  const topic = value.replyTopic

  if (typeof topic !== 'string' || topic.trim().length === 0 || !VALID_REPLY_TOPIC.test(topic))
    return fallbackTopic

  return topic
}

function getFallbackResponseTopic(): string {
  return `signage/${currentDeviceId}/responses`
}

async function setupMqtt(): Promise<void> {
  if (!currentDeviceId)
    return

  const commandTopic = `signage/${currentDeviceId}/commands`

  if (mqttMessageHandler)
    mqttClientService.offMessage(mqttMessageHandler)

  mqttMessageHandler = (topic: string, message: Uint8Array) => {
    if (topic !== commandTopic)
      return

    handleMqttMessage(message, getFallbackResponseTopic()).catch(console.error)
  }

  mqttClientService.onMessage(mqttMessageHandler)
  await mqttClientService.subscribe(commandTopic)
}

async function restoreSelectedPlaylist(playlists: Playlist[]): Promise<void> {
  const libraryStore = useLibraryStore()
  const playlistStore = usePlaylistStore()

  const selectedPlaylistId = libraryStore.selectedPlaylistId
  if (!selectedPlaylistId)
    return

  const selectedPlaylist = playlists.find(playlist => playlist.id === selectedPlaylistId)
  if (!selectedPlaylist)
    return

  if (playlistStore.currentPlaylist?.id === selectedPlaylist.id)
    return

  await activatePlaylist(selectedPlaylist)
}

export async function initializePlayerRuntime(bootstrapResult: Bootstrap): Promise<void> {
  currentDeviceId = bootstrapResult.config.deviceId

  const platformAdapter = createPlatformAdapter()
  await platformAdapter.initialize()

  registerCommandHandlers()

  if (bootstrapResult.registration)
    await setupMqtt()

  const playlists = await fetchPlaylists()
  await restoreSelectedPlaylist(playlists)
}

export function disposePlayerRuntime(): void {
  if (mqttMessageHandler)
    mqttClientService.offMessage(mqttMessageHandler)

  mqttMessageHandler = null
}
