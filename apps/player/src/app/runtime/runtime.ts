import type {
  CommandEnvelope,
  CommandResultEnvelope,
  CommandType,
  Playlist,
} from '@signage/contracts'
import type { Buffer } from 'node:buffer'
import type { Bootstrap } from '@/app/bootstrap/bootstrap'
import { commandBus } from '@/app/commands/bus'
import { mqttClientService } from '@/app/mqtt/client'
import { getPlaylistsByDeviceId } from '@/app/request/requests/playlist'
import { useGlobalStore } from '@/app/stores/global/store'
import { useLibraryStore } from '@/app/stores/library/store'
import { usePlayerStore } from '@/app/stores/player/store'
import { usePlaylistStore } from '@/app/stores/playlist/store'

const processedCommands = new Set<string>()

let currentDeviceId = ''
let mqttMessageHandler: ((topic: string, message: Buffer) => void) | null = null
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
  playlistStore.resetIndex()

  const firstItem = getFirstItem(playlist)
  if (!firstItem) {
    playerStore.stop()
    return
  }

  await playerStore.load(firstItem)
  playerStore.play()
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const globalStore = useGlobalStore()
  const libraryStore = useLibraryStore()

  if (!currentDeviceId) {
    libraryStore.setPlaylists([])
    return []
  }

  try {
    globalStore.showLoading('Loading playlists...')
    const response = await getPlaylistsByDeviceId(currentDeviceId)
    const playlists = response.content
    libraryStore.setPlaylists(playlists)
    globalStore.hideLoading()
    return playlists
  }
  catch (error) {
    globalStore.showError(error instanceof Error ? error.message : 'Failed to load playlists')
    libraryStore.setPlaylists([])
    return []
  }
}

async function handleReloadPlaylist(): Promise<void> {
  const libraryStore = useLibraryStore()
  const playlists = await fetchPlaylists()

  if (!libraryStore.selectedPlaylistId)
    return

  const selected = playlists.find(playlist => playlist.id === libraryStore.selectedPlaylistId)
  if (!selected)
    return

  await activatePlaylist(selected)
}

async function handleRestartPlayer(): Promise<void> {
  const playlistStore = usePlaylistStore()
  const playerStore = usePlayerStore()
  const currentPlaylist = playlistStore.currentPlaylist
  if (!currentPlaylist) {
    playerStore.stop()
    return
  }

  playlistStore.resetIndex()
  const firstItem = getFirstItem(currentPlaylist)
  if (!firstItem) {
    playerStore.stop()
    return
  }

  await playerStore.load(firstItem)
  playerStore.play()
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
    return buildErrorResult(command, 'SCREENSHOT_FAILED', 'Failed to capture screenshot')
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

async function setupMqtt(): Promise<void> {
  if (!currentDeviceId)
    return

  const commandTopic = `signage/${currentDeviceId}/commands`
  const responseTopic = `signage/${currentDeviceId}/responses`

  await mqttClientService.subscribe(commandTopic)

  const client = mqttClientService.client
  if (!client)
    return

  mqttMessageHandler = (topic: string, message: Buffer) => {
    if (topic !== commandTopic)
      return
    void handleMqttMessage(message, responseTopic)
  }

  client.on('message', mqttMessageHandler)
}

export async function initializePlayerRuntime(bootstrapResult: Bootstrap): Promise<void> {
  currentDeviceId = bootstrapResult.config.deviceId

  registerCommandHandler()

  if (bootstrapResult.state === 'connected')
    await setupMqtt()

  await fetchPlaylists()
}

export function disposePlayerRuntime(): void {
  const client = mqttClientService.client
  if (client && mqttMessageHandler)
    client.off('message', mqttMessageHandler)

  mqttMessageHandler = null
}
