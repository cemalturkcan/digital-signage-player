import type {
  CommandEnvelope,
  CommandResultEnvelope,
  CommandType,
  Playlist,
} from '@signage/contracts'
import type { Bootstrap } from '@/app/bootstrap/bootstrap'
import { computeHash } from '@/app/cache/hash'
import { syncMediaCache } from '@/app/cache/media-cache'
import { readPlaylistCache, writePlaylistCache } from '@/app/cache/playlist-cache'
import { commandBus } from '@/app/commands/bus'
import { COMMAND_ERROR_CODES } from '@/app/commands/constants'
import { mqttClientService } from '@/app/mqtt/client'
import { createPlatformAdapter } from '@/app/platform/factory'
import { getPlaylistsByDeviceId } from '@/app/request/requests/playlist'
import { useGlobalStore } from '@/app/stores/global/store'
import { useLibraryStore } from '@/app/stores/library/store'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'
import { translate } from '@/modules/i18n'

const processedCommands = new Set<string>()

let currentDeviceId = ''
let mqttMessageHandler: ((topic: string, message: Uint8Array) => void) | null = null
let commandRegistered = false

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

  const fallbackPlaylist = playlists[0]
  await activatePlaylist(fallbackPlaylist)
}

async function handlePlay(): Promise<void> {
  const playerStore = usePlayerStore()
  playerStore.play()
}

async function handlePause(): Promise<void> {
  const playerStore = usePlayerStore()
  playerStore.pause()
}

async function handleSetVolume(params?: Record<string, unknown>): Promise<void> {
  const playerStore = usePlayerStore()
  const level = params?.level as number
  playerStore.setVolume(level)
}

async function handleScreenshot(command: CommandEnvelope): Promise<CommandResultEnvelope> {
  const playerStore = usePlayerStore()

  try {
    const blob = await playerStore.captureScreenshot()
    const base64 = await blobToBase64(blob)
    return buildSuccessResult(command, { base64, mimeType: blob.type || 'image/png' })
  }
  catch {
    return buildErrorResult(
      command,
      COMMAND_ERROR_CODES.SCREENSHOT_FAILED,
      translate('failedToCaptureScreenshot'),
    )
  }
}

async function executeCommand(command: CommandEnvelope): Promise<CommandResultEnvelope> {
  if (processedCommands.has(command.commandId))
    return buildSuccessResult(command, { duplicate: true })

  processedCommands.add(command.commandId)
  if (processedCommands.size > 1000) {
    const oldest = Array.from(processedCommands).slice(0, 500)
    oldest.forEach(id => processedCommands.delete(id))
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
          COMMAND_ERROR_CODES.UNSUPPORTED_COMMAND,
          translate('unsupportedCommand', { command: command.command }),
        )
    }
  }
  catch (error) {
    return buildErrorResult(
      command,
      COMMAND_ERROR_CODES.EXECUTION_ERROR,
      error instanceof Error ? error.message : translate('unknownError'),
    )
  }
}

function registerCommandHandler(): void {
  if (commandRegistered)
    return

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

  commandRegistered = true
}

async function handleMqttMessage(message: Uint8Array, responseTopic: string): Promise<void> {
  let envelope: unknown

  try {
    envelope = JSON.parse(new TextDecoder().decode(message))
  }
  catch {
    await mqttClientService.publish(responseTopic, {
      type: 'command_result',
      command: 'ping',
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

function getReplyTopic(envelope: unknown, fallbackTopic: string): string {
  if (typeof envelope !== 'object' || envelope === null) {
    return fallbackTopic
  }

  const value = envelope as Record<string, unknown>
  if (typeof value.replyTopic !== 'string' || value.replyTopic.trim().length === 0) {
    return fallbackTopic
  }

  return value.replyTopic
}

function getFallbackResponseTopic(): string {
  return `signage/${currentDeviceId}/responses`
}

async function setupMqtt(): Promise<void> {
  if (!currentDeviceId)
    return

  const commandTopic = `signage/${currentDeviceId}/commands`

  if (mqttMessageHandler) {
    mqttClientService.offMessage(mqttMessageHandler)
  }

  mqttMessageHandler = (topic: string, message: Uint8Array) => {
    if (topic !== commandTopic)
      return

    void handleMqttMessage(message, getFallbackResponseTopic())
  }

  mqttClientService.onMessage(mqttMessageHandler)
  await mqttClientService.subscribe(commandTopic)
}

async function restoreSelectedPlaylist(playlists: Playlist[]): Promise<void> {
  const libraryStore = useLibraryStore()
  const playlistStore = usePlaylistStore()

  const selectedPlaylistId = libraryStore.selectedPlaylistId
  if (!selectedPlaylistId) {
    return
  }

  const selectedPlaylist = playlists.find(playlist => playlist.id === selectedPlaylistId)
  if (!selectedPlaylist) {
    return
  }

  if (playlistStore.currentPlaylist?.id === selectedPlaylist.id) {
    return
  }

  await activatePlaylist(selectedPlaylist)
}

export async function initializePlayerRuntime(bootstrapResult: Bootstrap): Promise<void> {
  currentDeviceId = bootstrapResult.config.deviceId

  const platformAdapter = createPlatformAdapter()
  await platformAdapter.initialize()

  registerCommandHandler()

  if (bootstrapResult.registration) {
    await setupMqtt()
  }

  const playlists = await fetchPlaylists()
  await restoreSelectedPlaylist(playlists)
}

export function disposePlayerRuntime(): void {
  if (mqttMessageHandler)
    mqttClientService.offMessage(mqttMessageHandler)

  mqttMessageHandler = null
}
