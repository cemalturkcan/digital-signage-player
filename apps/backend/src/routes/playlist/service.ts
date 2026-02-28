import type { MediaItem, Playlist, PlaylistResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type { PlaylistItemRecord, PlaylistRecord } from '@/routes/playlist/modal.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, ok, unexpected } from '@/app/rest/rest.js'
import { playlistRepository } from '@/routes/playlist/repository.js'

const DEFAULT_PLAYLIST: Playlist = {
  id: 'default',
  createdAt: 0,
  updatedAt: 0,
  items: [
    {
      id: 'default-0',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/images/image1.jpg',
      duration: 5,
      order: 0,
    },
    {
      id: 'default-1',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video1.mp4',
      order: 1,
    },
    {
      id: 'default-2',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/images/image2.jpg',
      duration: 5,
      order: 2,
    },
    {
      id: 'default-3',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video2.mp4',
      order: 3,
    },
  ],
}

function getNumericPlaylistId(playlistId: string): number | null {
  const parsed = Number.parseInt(playlistId, 10)

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null
  }

  return parsed
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
      item.duration = itemRecord.duration ?? 5
    } else if (itemRecord.duration !== null) {
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

function buildPageWindow(
  page: number,
  pageSize: number
): {
  includeDefault: boolean
  deviceOffset: number
  deviceLimit: number
} {
  const startIndex = (page - 1) * pageSize
  const includeDefault = startIndex === 0

  if (includeDefault) {
    return {
      includeDefault: true,
      deviceOffset: 0,
      deviceLimit: Math.max(0, pageSize - 1),
    }
  }

  return {
    includeDefault: false,
    deviceOffset: Math.max(0, startIndex - 1),
    deviceLimit: pageSize,
  }
}

export interface PlaylistService {
  getPlaylist: (
    deviceId: string,
    page: number,
    pageSize: number
  ) => Promise<ServiceResponse<PlaylistResponse>>
  getPlaylistById: (playlistId: string) => Promise<ServiceResponse<Playlist>>
}

export const playlistService: PlaylistService = {
  async getPlaylist(
    deviceId: string,
    page: number,
    pageSize: number
  ): Promise<ServiceResponse<PlaylistResponse>> {
    const normalizedDeviceId = deviceId.trim()

    if (!normalizedDeviceId) {
      return fail(ErrorCode.BAD_REQUEST, 'deviceId required')
    }

    try {
      const totalDevicePlaylists =
        await playlistRepository.countPlaylistsByDeviceId(normalizedDeviceId)
      const totalItems = totalDevicePlaylists + 1
      const totalPages = Math.ceil(totalItems / pageSize)
      const { includeDefault, deviceOffset, deviceLimit } = buildPageWindow(page, pageSize)

      const devicePlaylistRecords = await playlistRepository.listPlaylistsByDeviceId(
        normalizedDeviceId,
        deviceLimit,
        deviceOffset
      )
      const devicePlaylists = await Promise.all(
        devicePlaylistRecords.map((record: PlaylistRecord) => loadPlaylistFromRecord(record))
      )

      const playlists = includeDefault ? [DEFAULT_PLAYLIST, ...devicePlaylists] : devicePlaylists

      return ok({
        playlists,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      })
    } catch (error) {
      return unexpected(error, 'Failed to get playlists')
    }
  },

  async getPlaylistById(playlistId: string): Promise<ServiceResponse<Playlist>> {
    const normalizedPlaylistId = playlistId.trim()

    if (normalizedPlaylistId === DEFAULT_PLAYLIST.id) {
      return ok(DEFAULT_PLAYLIST)
    }

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
    } catch (error) {
      return unexpected(error, 'Failed to get playlist by id')
    }
  },
}
