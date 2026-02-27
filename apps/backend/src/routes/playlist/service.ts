import type { CacheInfo, MediaItem, Playlist, PlaylistResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type {
  PlaylistItemInput,
  PlaylistItemRecord,
  PlaylistRecord,
} from '@/routes/playlist/modal.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, ok, unexpected } from '@/app/rest/rest.js'
import { playlistRepository } from '@/routes/playlist/repository.js'

const DEFAULT_PLAYLIST_ITEMS: PlaylistItemInput[] = [
  {
    mediaType: 'image',
    mediaUrl: 'https://picsum.photos/1920/1080',
    duration: 10,
    sortOrder: 0,
  },
  {
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sortOrder: 1,
  },
]

function createCacheInfo(playlist: Playlist): CacheInfo {
  return {
    etag: `"${playlist.id}-${playlist.updatedAt}"`,
    maxAge: 60,
    cacheControl: 'public, max-age=60',
  }
}

function buildPlaylistName(deviceId: string): string {
  const playlistName = `playlist-${deviceId}`

  if (playlistName.length <= 255) {
    return playlistName
  }

  return playlistName.slice(0, 255)
}

function getNumericPlaylistId(playlistId: string): number | null {
  const parsed = Number.parseInt(playlistId, 10)

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null
  }

  return parsed
}

function mapItemToInput(item: MediaItem): PlaylistItemInput {
  return {
    mediaType: item.type,
    mediaUrl: item.url,
    duration: item.type === 'image' ? (item.duration ?? 10) : item.duration,
    sortOrder: item.order,
  }
}

function mapRecordToPlaylist(record: PlaylistRecord, itemRecords: PlaylistItemRecord[]): Playlist {
  const items: MediaItem[] = itemRecords.map((itemRecord: PlaylistItemRecord) => {
    const item: MediaItem = {
      id: String(itemRecord.id),
      type: itemRecord.mediaType,
      url: itemRecord.mediaUrl,
      order: itemRecord.sortOrder,
    }

    if (itemRecord.mediaType === 'image') {
      item.duration = itemRecord.duration ?? 10
    }
    else if (itemRecord.duration !== null) {
      item.duration = itemRecord.duration
    }

    return item
  })

  return {
    id: String(record.id),
    items,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

async function loadPlaylistFromRecord(record: PlaylistRecord): Promise<Playlist> {
  const itemRecords = await playlistRepository.loadPlaylistItemsOrdered(record.id)
  return mapRecordToPlaylist(record, itemRecords)
}

export interface PlaylistService {
  getPlaylist: (deviceId: string) => Promise<ServiceResponse<PlaylistResponse>>
  getPlaylistById: (playlistId: string) => Promise<ServiceResponse<Playlist>>
  updatePlaylist: (deviceId: string, playlist: Playlist) => Promise<ServiceResponse<void>>
  assignPlaylist: (deviceId: string, playlistId: string) => Promise<ServiceResponse<void>>
}

export const playlistService: PlaylistService = {
  async getPlaylist(deviceId: string): Promise<ServiceResponse<PlaylistResponse>> {
    const normalizedDeviceId = deviceId.trim()

    try {
      let playlistRecord = await playlistRepository.findPlaylistByDeviceId(normalizedDeviceId)

      if (playlistRecord === null) {
        const createdPlaylist = await playlistRepository.createPlaylistForDevice(
          normalizedDeviceId,
          buildPlaylistName(normalizedDeviceId),
        )

        await playlistRepository.replacePlaylistItems(createdPlaylist.id, DEFAULT_PLAYLIST_ITEMS)
        playlistRecord = await playlistRepository.findPlaylistById(createdPlaylist.id)

        if (playlistRecord === null) {
          return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
        }
      }

      const playlist = await loadPlaylistFromRecord(playlistRecord)

      return ok({
        playlist,
        cache: createCacheInfo(playlist),
      })
    }
    catch (error) {
      return unexpected(error, 'Failed to get playlist')
    }
  },

  async getPlaylistById(playlistId: string): Promise<ServiceResponse<Playlist>> {
    const normalizedPlaylistId = playlistId.trim()

    const numericPlaylistId = getNumericPlaylistId(normalizedPlaylistId)

    if (numericPlaylistId === null) {
      return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
    }

    try {
      const playlistRecord = await playlistRepository.findPlaylistById(numericPlaylistId)

      if (playlistRecord === null) {
        return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
      }

      const playlist = await loadPlaylistFromRecord(playlistRecord)
      return ok(playlist)
    }
    catch (error) {
      return unexpected(error, 'Failed to get playlist by id')
    }
  },

  async updatePlaylist(deviceId: string, playlist: Playlist): Promise<ServiceResponse<void>> {
    const normalizedDeviceId = deviceId.trim()

    try {
      const playlistRecord = await playlistRepository.findPlaylistByDeviceId(normalizedDeviceId)
      const currentPlaylistRecord
        = playlistRecord
          ?? (await playlistRepository.createPlaylistForDevice(
            normalizedDeviceId,
            buildPlaylistName(normalizedDeviceId),
          ))

      const itemInputs = playlist.items
        .map(mapItemToInput)
        .sort((a: PlaylistItemInput, b: PlaylistItemInput) => a.sortOrder - b.sortOrder)

      await playlistRepository.replacePlaylistItems(currentPlaylistRecord.id, itemInputs)
      await playlistRepository.touchPlaylist(currentPlaylistRecord.id)
      return ok(undefined)
    }
    catch (error) {
      return unexpected(error, 'Failed to update playlist')
    }
  },

  async assignPlaylist(deviceId: string, playlistId: string): Promise<ServiceResponse<void>> {
    const normalizedDeviceId = deviceId.trim()
    const normalizedPlaylistId = playlistId.trim()

    const numericPlaylistId = getNumericPlaylistId(normalizedPlaylistId)

    if (numericPlaylistId === null) {
      return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
    }

    try {
      const assignedPlaylist = await playlistRepository.assignPlaylistToDevice(
        numericPlaylistId,
        normalizedDeviceId,
      )

      if (assignedPlaylist === null) {
        return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
      }

      return ok(undefined)
    }
    catch (error) {
      return unexpected(error, 'Failed to assign playlist')
    }
  },
}
